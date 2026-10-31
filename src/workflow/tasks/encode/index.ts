import { spawnSync } from "child_process";
import { print } from "@/cli/printer.ts";
import { FilterchainHandler } from "@/filtering/filterchain/handler.ts";
import { generateMinterpolateFilter } from "@/filtering/filters/interpolation/generator.ts";
import { MINTERPOLATE_BALANCED_PRESET } from "@/filtering/filters/interpolation/presets.ts";
import { generateScaleFilter } from "@/filtering/filters/scale.ts";
import { generateStabilizationFilter } from "@/filtering/filters/stabilization.ts";
import { FFmpegArgs } from "@/workflow/model/ffmpegArgs.ts";
import { Video2xArgs } from "@/workflow/model/video2xArgs.ts";
import type { EncodeWorkflow } from "@/workflow/model/workflow.ts";
import { generateStabilizationData } from "@/workflow/stabilization.ts";
import { moveFile, resolveProgramExecutable } from "@/workflow/util.ts";
import chalk from "chalk";
import {
  generateFFmpegCommand,
  generateVideo2xCommand,
  getFiles,
  resolveInputSource,
  resolveOutputDir,
  resolveOutputPath,
} from "./util.ts";

/**
 * Runs FFmpeg to encode a single video and reports the result. Output is
 * streamed to the terminal.
 * @param filePath - The path to the input video, used for messages.
 * @param outputPath - The path the encoded video is written to, used for
 * messages.
 * @param programPath - The path to the FFmpeg executable.
 * @param command - The FFmpeg arguments, excluding the executable name.
 */
function encodeVideo(
  filePath: string,
  outputPath: string,
  programPath: string,
  command: string[],
) {
  print(`\n${chalk.bold(`Encoding '${filePath}' to '${outputPath}'`)}`);

  print(chalk.gray(`Running command: ${programPath} ${command.join(" ")}\n`));

  const result = spawnSync(programPath, command, {
    stdio: "inherit",
  });
  if (result.error) {
    print(`\nError encoding '${filePath}': ${result.error.message}`, "error");
  } else if (result.status !== 0 && result.status !== 3221225477) {
    print(
      `\nProgram exited with code ${result.status} while encoding '${filePath}'.`,
      "error",
    );
  } else {
    print(
      `\nSuccessfully encoded '${filePath}' to '${outputPath}'.`,
      "success",
    );
  }
}

/**
 * Runs the encode workflow. Collects files from the input source, moves
 * non-video files to the output directory, and encodes each video.
 * Videos with stabilization enabled get a detection pass first.
 * @param workflow - The validated encode workflow containing the
 * options and temp directory.
 */
export function runEncode(workflow: EncodeWorkflow) {
  // Prepare core parameters for the encoding process
  const opts = workflow.options;
  const ffmpegArgs = new FFmpegArgs(opts);
  const ffmpegPath = resolveProgramExecutable("ffmpeg", opts.ffmpegPath);
  const video2xPath = resolveProgramExecutable("video2x", opts.video2xPath);
  const tmpDir = workflow.tmpDir;
  const inputSource = resolveInputSource(opts.input);
  const outputDir = resolveOutputDir(inputSource, opts.output);

  // Process the files (video and non-video) in the input source
  print(`\n${chalk.bold("Collecting files to encode...")}`);
  const files = getFiles(inputSource, (file) => {
    print(`${chalk.green("+")} ${file.fullPath} added to list.`);
  });

  // Start the encoding process for each file, OR move non-video files to the output directory
  for (const file of files) {
    const fch = new FilterchainHandler();

    if (!file.isVideo) {
      const outputPath = resolveOutputPath(file, inputSource, outputDir, false);
      moveFile({
        src: file.fullPath,
        dest: outputPath,
        onSuccess: () => {
          print(
            `Moved file from '${file.fullPath}' to '${outputPath}'.`,
            "success",
          );
        },
        onExists: () => {
          print(
            `File '${outputPath}' already exists. Skipping move for '${file.fullPath}'.`,
            "warning",
          );
        },
      });
      // Move on to the next file in the loop since this one is not a video
      continue;
    }

    // Get the output path for the encoded video, which may be different from the
    // input path
    const outputPath = resolveOutputPath(file, inputSource, outputDir, true);

    // If user uses video2x interpolation, skip the rest of stuff and proceed in this
    // block since most of the options after this block are not compatible with video2x
    if (opts.interpolationMode === "video2x" && workflow.type === "encode") {
      const video2xArgs = new Video2xArgs(opts);
      const command = generateVideo2xCommand(
        file.fullPath,
        outputPath,
        video2xArgs,
      );
      encodeVideo(file.fullPath, outputPath, video2xPath, command);
      continue;
    }

    // If user supplies a stabilization value, generate stabilization data
    // for the video before encoding
    if (opts.stabilize) {
      print(
        `${chalk.gray(`Generating stabilization data for ${file.fullPath}`)}`,
      );

      const trfFilePath = generateStabilizationData(
        ffmpegPath,
        tmpDir,
        file.fullPath,
        opts.stabilize,
      );
      file.setTransformFilePath(trfFilePath);

      const stabFilter = generateStabilizationFilter(
        trfFilePath,
        opts.stabilize,
      );
      fch.addFilter(stabFilter);
    }

    // If user supplies an interpolation value, generate the minterpolate
    // filter and add it to the filterchain
    if (opts.interpolationMode === "minterpolate" && opts.targetFps) {
      const minterpFilter = generateMinterpolateFilter({
        ...MINTERPOLATE_BALANCED_PRESET,
        fps: opts.targetFps,
      });
      fch.addFilter(minterpFilter);
    }

    // If user supplies a resolution value, generate the scale filter and
    // add it to the filterchain
    if (opts.resolution) {
      const scaleFilter = generateScaleFilter(
        opts.resolution.width,
        opts.resolution.height,
      );
      fch.addFilter(scaleFilter);
    }

    const command = generateFFmpegCommand(
      file.fullPath,
      outputPath,
      ffmpegArgs,
      fch.getFilters(),
    );

    encodeVideo(file.fullPath, outputPath, ffmpegPath, command);
  }
}
