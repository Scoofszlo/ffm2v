import { spawnSync } from "child_process";
import { print } from "@/cli/printer.ts";
import { getHighestResolution, getMaxFps } from "@/probe/index.ts";
import { FFmpegArgs } from "@/workflow/model/ffmpegArgs.ts";
import type { MergeWorkflow } from "@/workflow/model/workflow.ts";
import { generateStabilizationData } from "@/workflow/stabilization.ts";
import { resolveFFmpegExecutable } from "@/workflow/util.ts";
import chalk from "chalk";
import { generateFiltergraph } from "./filters.ts";
import {
  generateFFmpegCommand,
  getFiles,
  getInputPaths,
  resolveOutputPath,
} from "./util.ts";

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
 * Runs the merge workflow. Validates the inputs, optionally generates
 * stabilization data for each video, builds the filtergraph, and merges the
 * videos into a single file.
 * @param workflow - The validated merge workflow containing the options and
 * temp directory.
 */
export function runMerge(workflow: MergeWorkflow) {
  const opts = workflow.options;
  const encodingArgs = new FFmpegArgs(opts);
  const ffmpegPath = resolveFFmpegExecutable(opts.ffmpegPath);
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
