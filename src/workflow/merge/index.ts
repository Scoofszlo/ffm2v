import chalk from "chalk";
import { spawnSync } from "child_process";
import { print } from "../../cli/printer.ts";
import type { MergeOptions } from "../../cli/types.ts";
import { FFmpegEncodingParams } from "../../param/model.ts";
import {
  generateFFMpegCommand,
  generateFiltergraph,
  getFiles,
  getHighestResolution,
  getMaxFps,
  getOutputPath,
} from "./helpers.ts";

function runMerge(opts: MergeOptions) {
  try {
    const params = new FFmpegEncodingParams(opts);

    print(`\n${chalk.bold("Validating video files for merging...")}`);
    const videos = getFiles(opts.input, (file) => {
      print(`${chalk.green("+")} ${file.fullPath} added to merge list.`);
    });
    const outputPath = getOutputPath(videos[0].fullPath, opts.output);
    const highestResolution = getHighestResolution(videos);
    const maxFps = getMaxFps(videos);

    print(`\n${chalk.bold("Generating FFmpeg filtergraph for merging...")}`);
    const { input, filtergraph } = generateFiltergraph(
      videos,
      highestResolution,
      maxFps,
      (filtergraph) => {
        print(`${chalk.green("+")} Filtergraph generated successfully.`);
        print(chalk.gray(filtergraph));
      },
    );
    const command = generateFFMpegCommand(
      input,
      outputPath,
      filtergraph,
      maxFps,
      params,
    );
    encodeVideo(command, outputPath);
  } catch (error) {
    print(`${error}`, "error");
    process.exit(1);
  }
}

function encodeVideo(command: string[], outputPath: string) {
  print(`\n${chalk.bold("Merging videos to")} ${outputPath}`);
  print(chalk.gray(`Running FFmpeg command: ffmpeg ${command.join(" ")}\n`));

  const result = spawnSync("ffmpeg", command, { stdio: "inherit" });
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

export { runMerge };

