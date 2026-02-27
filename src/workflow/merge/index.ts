import { spawnSync } from "child_process";
import { print } from "../../cli/printer.ts";
import type { MergeOptions } from "../../cli/types.ts";
import { FFmpegEncodingParams } from "../../param/model.ts";
import {
  generateFFMpegCommand,
  generateFiltergraph,
  getHighestResolution,
  getMaxFps,
  getOutputPath,
  validateInputVideos,
} from "./helpers.ts";

function runMerge(opts: MergeOptions) {
  try {
    const params = new FFmpegEncodingParams(opts);
    const videoPaths = validateInputVideos(opts.input);
    const outputPath = getOutputPath(videoPaths[0], opts.output);
    const highestResolution = getHighestResolution(videoPaths);
    const maxFps = getMaxFps(videoPaths);
    const { input, filtergraph } = generateFiltergraph(
      videoPaths,
      highestResolution,
      maxFps,
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
    print(`An error occurred: ${error}`, "error");
    process.exit(1);
  }
}

function encodeVideo(command: string[], outputPath: string) {
  print(`Merging videos to '${outputPath}'`);
  print(`Running FFmpeg command: ffmpeg ${command.join(" ")}`);

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
