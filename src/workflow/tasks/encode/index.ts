import { spawnSync } from "child_process";
import { print } from "@/cli/printer.ts";
import { generateMinterpolateFilter } from "@/filtering/filters/interpolation/generator.ts";
import { MINTERPOLATE_BALANCED_PRESET } from "@/filtering/filters/interpolation/presets.ts";
import { generateStabilizationFilter } from "@/filtering/filters/stabilization.ts";
import { FFmpegArgs } from "@/workflow/model/ffmpegArgs.ts";
import type { EncodeWorkflow } from "@/workflow/model/workflow.ts";
import { generateStabilizationData } from "@/workflow/stabilization.ts";
import { moveFile, resolveFFmpegExecutable } from "@/workflow/util.ts";
import chalk from "chalk";
import {
  generateFFmpegCommand,
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
 * @param ffmpegPath - The path to the FFmpeg executable.
 * @param command - The FFmpeg arguments, excluding the executable name.
 */
function encodeVideo(
  filePath: string,
  outputPath: string,
  ffmpegPath: string,
  command: string[],
) {
  print(`\n${chalk.bold(`Encoding '${filePath}' to '${outputPath}'`)}`);

  print(
    chalk.gray(`Running FFmpeg command: ${ffmpegPath} ${command.join(" ")}\n`),
  );

  const result = spawnSync(ffmpegPath, command, {
    stdio: "inherit",
  });
  if (result.error) {
    print(`\nError encoding '${filePath}': ${result.error.message}`, "error");
  } else if (result.status !== 0) {
    print(
      `\nFFmpeg exited with code ${result.status} while encoding '${filePath}'.`,
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
  const encodingArgs = new FFmpegArgs(opts);
  const ffmpegPath = resolveFFmpegExecutable(opts.ffmpegPath);
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
    let filterchain: string | null = "";

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

      filterchain += generateStabilizationFilter(trfFilePath, opts.stabilize);
    }

    if (opts.interpolate) {
      // Add a comma if there are already filters in the chain
      filterchain += filterchain ? "," : "";

      filterchain += generateMinterpolateFilter({
        ...MINTERPOLATE_BALANCED_PRESET,
        fps: opts.interpolate,
      });
    }
    const outputPath = resolveOutputPath(file, inputSource, outputDir, true);

    // If filterchain is empty, set it to null to avoid passing an empty string
    // to the FFmpeg command
    if (!filterchain) {
      filterchain = null;
    }

    const command = generateFFmpegCommand(
      file.fullPath,
      outputPath,
      encodingArgs,
      opts,
      filterchain,
    );

    encodeVideo(file.fullPath, outputPath, ffmpegPath, command);
  }
}
