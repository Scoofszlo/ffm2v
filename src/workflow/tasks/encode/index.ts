import { spawnSync } from "child_process";
import { print } from "@/cli/printer";
import { VIDEO2X_SUCCESS_EXIT_CODE } from "@/constants";
import { FilterchainHandler } from "@/filtering/filterchain/handler";
import { generateMinterpolateFilter } from "@/filtering/filters/interpolation/generator";
import { MINTERPOLATE_BALANCED_PRESET } from "@/filtering/filters/interpolation/presets";
import { generateScaleFilter } from "@/filtering/filters/scale";
import { generateStabilizationFilter } from "@/filtering/filters/stabilization";
import { FFmpegArgs } from "@/workflow/model/ffmpegArgs";
import { Video2xArgs } from "@/workflow/model/video2xArgs";
import type { EncodeWorkflow } from "@/workflow/model/workflow";
import { generateStabilizationData } from "@/workflow/stabilization";
import {
  generateVideo2xCommand,
  moveFile,
  resolveProgramExecutable,
  runPipedCommands,
} from "@/workflow/util";
import chalk from "chalk";
import {
  generateFFmpegCommand,
  generateFFmpegPipeCommand,
  getFiles,
  resolveInputSource,
  resolveOutputDir,
  resolveOutputPath,
} from "./util";

/**
 * Runs a program to encode a single video and reports the result. Output is
 * streamed to the terminal. Used for both FFmpeg and video2x.
 * @param filePath - The path to the input video, used for messages.
 * @param outputPath - The path the encoded video is written to, used for
 * messages.
 * @param programPath - The path to the executable producing the output, either
 * FFmpeg or video2x.
 * @param command - The program arguments, excluding the executable name.
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
    // video2x uses 3221225477 as a success code, so we ignore it here.
  } else if (
    result.status !== 0 &&
    result.status !== VIDEO2X_SUCCESS_EXIT_CODE
  ) {
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
 * Runs the video2x pipeline for a single file. FFmpeg applies the filter chain
 * (stabilization, resolution scaling) and writes a lossless Matroska stream to
 * stdout, which is piped into video2x's stdin; video2x then interpolates the
 * frames and writes the output file. Both processes run concurrently, so this
 * resolves once they have both exited. Failures are reported through `print()`
 * instead of thrown, matching `encodeVideo()`.
 *
 * video2x exits with `3221225477` after a successful run, so that code counts
 * as success.
 * @param filePath - The path to the input video, used for messages.
 * @param outputPath - The path video2x writes the interpolated video to, used
 * for messages.
 * @param ffmpegPath - The resolved FFmpeg executable.
 * @param ffmpegCommand - The FFmpeg pre-stage arguments.
 * @param video2xPath - The resolved video2x executable.
 * @param video2xCommand - The video2x arguments.
 * @returns A promise that resolves once both processes have exited.
 */
async function encodeVideoWithVideo2x(
  filePath: string,
  outputPath: string,
  ffmpegPath: string,
  ffmpegCommand: string[],
  video2xPath: string,
  video2xCommand: string[],
): Promise<void> {
  print(`\n${chalk.bold(`Encoding '${filePath}' to '${outputPath}'`)}`);

  print(
    chalk.gray(
      `Running pipeline: ${ffmpegPath} ${ffmpegCommand.join(" ")} | ${video2xPath} ${video2xCommand.join(" ")}\n`,
    ),
  );

  const { first: ffmpeg, second: video2x } = await runPipedCommands(
    {
      command: ffmpegPath,
      args: ffmpegCommand,
      stdio: ["ignore", "pipe", "inherit"],
    },
    {
      command: video2xPath,
      args: video2xCommand,
      stdio: ["pipe", "inherit", "inherit"],
    },
  );

  const video2xSucceeded =
    video2x.status === 0 || video2x.status === VIDEO2X_SUCCESS_EXIT_CODE;
  const spawnError = ffmpeg.error ?? video2x.error;
  const ffmpegStatus =
    ffmpeg.status === null ? "stopped" : `exited with code ${ffmpeg.status}`;

  if (spawnError) {
    print(`\nError encoding '${filePath}': ${spawnError}`, "error");
  } else if (ffmpeg.status === 0 && video2xSucceeded) {
    print(
      `\nSuccessfully encoded '${filePath}' to '${outputPath}'.`,
      "success",
    );
  } else {
    print(
      `\nEncoding '${filePath}' failed: FFmpeg ${ffmpegStatus}, video2x exited with code ${video2x.status ?? "unknown"}.`,
      "error",
    );
  }
}

/**
 * Runs the encode workflow. Collects files from the input source, moves
 * non-video files to the output directory, and encodes each video. Videos with
 * stabilization enabled get a detection pass first. Videos encoded with video2x
 * interpolation go through an FFmpeg pre-stage that applies the same filter
 * chain, then pipe its output into video2x.
 * @param workflow - The validated encode workflow containing the
 * options and temp directory.
 * @returns A promise that resolves once every file has been processed.
 */
export async function runEncode(workflow: EncodeWorkflow) {
  const opts = workflow.options;

  // Prepare core parameters for the encoding process
  const ffmpegArgs = new FFmpegArgs(opts);
  const ffmpegPath = resolveProgramExecutable("ffmpeg", opts.ffmpegPath);
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

    const filterchain = fch.getFilters();

    // video2x interpolation: FFmpeg applies the filter chain and pipes the
    // result into video2x, which does the actual interpolation.
    if (opts.interpolationMode === "video2x") {
      const video2xPath = resolveProgramExecutable("video2x", opts.video2xPath);
      const video2xArgs = new Video2xArgs(opts);
      const ffmpegCommand = generateFFmpegPipeCommand(
        file.fullPath,
        ffmpegArgs,
        filterchain,
      );
      const video2xCommand = generateVideo2xCommand(outputPath, video2xArgs);

      await encodeVideoWithVideo2x(
        file.fullPath,
        outputPath,
        ffmpegPath,
        ffmpegCommand,
        video2xPath,
        video2xCommand,
      );
      continue;
    }

    const command = generateFFmpegCommand(
      file.fullPath,
      outputPath,
      ffmpegArgs,
      filterchain,
    );

    encodeVideo(file.fullPath, outputPath, ffmpegPath, command);
  }
}
