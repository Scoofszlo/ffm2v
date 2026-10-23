import { spawnSync } from "child_process";
import fs from "fs";
import { getFFmpegExecutable } from "@/workflow/helpers.ts";
import type { FileEntry } from "@/workflow/model/fileEntry.ts";
import type {
  MergeWorkflow,
  MergeWorkflowOpts,
} from "@/workflow/model/workflow.ts";
import chalk from "chalk";
import { print } from "../../../cli/printer.ts";
import { FFmpegEncodingParams } from "../../model/encodingParams.ts";
import { generateFiltergraph } from "./filters.ts";
import {
  generateFFMpegCommand,
  generateStabilizationData,
  getFiles,
  getHighestResolution,
  getInputPaths,
  getMaxFps,
  getOutputPath,
} from "./helpers.ts";

function cleanup(videos: FileEntry[], opts: MergeWorkflowOpts) {
  if (opts.stabilize) {
    videos.forEach((_, index) => {
      const stabilizationFile = `transforms-${index}.trf`;
      try {
        fs.rmSync(stabilizationFile, { force: true });
      } catch (err) {
        throw new Error(
          `Failed to delete temporary file '${stabilizationFile}': ${err}`,
          { cause: err },
        );
      }
    });
  }
}

function encodeVideo(
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

export function runMerge(workflow: MergeWorkflow) {
  const opts = workflow.options;
  const ffmpegPath = getFFmpegExecutable(opts.ffmpegPath);
  const params = new FFmpegEncodingParams(opts);

  print(`\n${chalk.bold("Validating video files for merging...")}`);
  const videos = getFiles(opts.input, (file) => {
    print(`${chalk.green("+")} ${file.fullPath} added to merge list.`);
  });
  const inputPaths = getInputPaths(videos);
  const outputPath = getOutputPath(videos[0].fullPath, opts.output);
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
      generateStabilizationData(ffmpegPath, video.fullPath, strength, index);
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
  const command = generateFFMpegCommand(
    inputPaths,
    outputPath,
    filtergraph,
    maxFps,
    params,
    opts,
  );

  encodeVideo(outputPath, ffmpegPath, command);
  cleanup(videos, opts);
}
