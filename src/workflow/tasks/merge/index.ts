import { spawnSync } from "child_process";
import { print } from "@/cli/printer";
import { VIDEO2X_SUCCESS_EXIT_CODE } from "@/constants";
import { getHighestResolution, getMaxFps } from "@/probe/index";
import { FFmpegArgs } from "@/workflow/model/ffmpegArgs";
import { Video2xArgs } from "@/workflow/model/video2xArgs";
import type { MergeWorkflow } from "@/workflow/model/workflow";
import { generateStabilizationData } from "@/workflow/stabilization";
import {
  generateVideo2xCommand,
  resolveProgramExecutable,
  runPipedCommands,
} from "@/workflow/util";
import chalk from "chalk";
import { generateFiltergraph } from "./filters";
import {
  generateFFmpegCommand,
  generateFFmpegPipeCommand,
  getFiles,
  getInputPaths,
  resolveOutputPath,
} from "./util";

/**
 * Runs FFmpeg to merge the videos and reports the result. Output is streamed to
 * the terminal.
 * @param outputPath - The path the merged video is written to, used for
 * messages.
 * @param ffmpegPath - The path to the FFmpeg executable.
 * @param command - The FFmpeg arguments, excluding the executable name.
 */
function mergeVideos(
  outputPath: string,
  ffmpegPath: string,
  command: string[],
) {
  print(`\n${chalk.bold("Merging videos to")} ${outputPath}`);
  print(
    chalk.gray(`Running FFmpeg command: ${ffmpegPath} ${command.join(" ")}\n`),
  );

  const result = spawnSync(ffmpegPath, command, { stdio: "inherit" });
  if (result.error) {
    print(`\nError merging videos: ${result.error.message}`, "error");
  } else if (result.status !== 0) {
    print(
      `\nFFmpeg exited with code ${result.status} while merging videos.`,
      "error",
    );
  } else {
    print(`\nSuccessfully merged videos to '${outputPath}'.`, "success");
  }
}

/**
 * Runs the video2x pipeline for merged output. FFmpeg stabilizes and joins the
 * inputs, writes the result as a lossless Matroska stream to stdout, which is
 * piped into video2x's stdin; video2x then interpolates the frames and writes
 * the output file. Both processes run concurrently, so this resolves once they
 * have both exited. Failures are reported through `print()` instead of thrown,
 * matching `mergeVideos()`.
 *
 * video2x exits with `3221225477` after a successful run, so that code counts
 * as success.
 * @param outputPath - The path video2x writes the interpolated video to, used
 * for messages.
 * @param ffmpegPath - The resolved FFmpeg executable.
 * @param ffmpegCommand - The FFmpeg pre-stage arguments.
 * @param video2xPath - The resolved video2x executable.
 * @param video2xCommand - The video2x arguments.
 * @returns A promise that resolves once both processes have exited.
 */
async function encodeVideoWithVideo2x(
  outputPath: string,
  ffmpegPath: string,
  ffmpegCommand: string[],
  video2xPath: string,
  video2xCommand: string[],
): Promise<void> {
  print(`\n${chalk.bold("Merging videos to")} ${outputPath}`);

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
    print(`\nError merging videos: ${spawnError}`, "error");
  } else if (ffmpeg.status === 0 && video2xSucceeded) {
    print(`\nSuccessfully merged videos to '${outputPath}'.`, "success");
  } else {
    print(
      `\nMerging videos failed: FFmpeg ${ffmpegStatus}, video2x exited with code ${video2x.status ?? "unknown"}.`,
      "error",
    );
  }
}

/**
 * Runs the merge workflow. Validates the inputs, optionally generates
 * stabilization data for each video, builds the filtergraph, and merges the
 * videos into a single file.
 * @param workflow - The validated merge workflow containing the options and
 * temp directory.
 * @returns A promise that resolves once the merge has finished.
 */
export async function runMerge(workflow: MergeWorkflow) {
  const opts = workflow.options;
  const encodingArgs = new FFmpegArgs(opts);
  const ffmpegPath = resolveProgramExecutable("ffmpeg", opts.ffmpegPath);
  const tmpDir = workflow.tmpDir;

  print(`\n${chalk.bold("Validating video files for merging...")}`);
  const videos = getFiles(opts.input, (file) => {
    print(`${chalk.green("+")} ${file.fullPath} added to merge list.`);
  });
  const inputPaths = getInputPaths(videos);
  const outputPath = resolveOutputPath(videos[0].fullPath, opts.output);
  const highestResolution = getHighestResolution(videos);
  const maxFps = getMaxFps(videos);

  // If stabilization is enabled, generate stabilization data for each video
  if (opts.stabilize) {
    print(
      `\n${chalk.bold(`Generating stabilization data for ${videos.length} videos...`)}`,
    );

    const strength = opts.stabilize;

    videos.forEach((video, index) => {
      print(
        `${chalk.gray(`Generating stabilization data for ${video.fullPath}`)}`,
      );
      const trfFilePath = generateStabilizationData(
        ffmpegPath,
        tmpDir,
        video.fullPath,
        strength,
        `transforms-${index}.trf`,
      );

      // Set the transformation file path in the video object for later use
      // in the filtergraph
      video.setTransformFilePath(trfFilePath);
    });
  }

  print(`\n${chalk.bold("Generating FFmpeg filtergraph for merging...")}`);
  const filtergraph = generateFiltergraph(
    videos,
    highestResolution,
    maxFps,
    opts,
    (filtergraph) => {
      print(`${chalk.green("+")} Filtergraph generated successfully.`);
      print(chalk.gray(filtergraph));
    },
  );

  if (opts.interpolationMode === "video2x") {
    const video2xPath = resolveProgramExecutable("video2x", opts.video2xPath);
    const video2xArgs = new Video2xArgs(opts);
    const ffmpegCommand = generateFFmpegPipeCommand(
      inputPaths,
      filtergraph,
      maxFps,
      opts,
    );
    const video2xCommand = generateVideo2xCommand(outputPath, video2xArgs);

    await encodeVideoWithVideo2x(
      outputPath,
      ffmpegPath,
      ffmpegCommand,
      video2xPath,
      video2xCommand,
    );
  } else {
    const command = generateFFmpegCommand(
      inputPaths,
      outputPath,
      filtergraph,
      maxFps,
      encodingArgs,
      opts,
    );

    mergeVideos(outputPath, ffmpegPath, command);
  }
}
