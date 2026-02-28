import { spawnSync } from "child_process";
import fs from "fs";
import { print } from "../../cli/printer.ts";
import type { EncodeOptions } from "../../cli/types.ts";
import { FFmpegEncodingParams } from "../../param/model.ts";
import type { MediaFile } from "../model.ts";
import {
  generateFFMpegCommand,
  getOutputDir,
  getOutputPath,
  getSource,
  getVideoFiles,
} from "./helpers.ts";

function runEncode(opts: EncodeOptions) {
  const params = new FFmpegEncodingParams(opts);
  const { source, outputDir } = getSourceAndOutput(opts);

  const videoFiles = getVideoFiles(source, (video) => {
    print(`${video.fullPath} added to list.`);
  });

  for (const video of videoFiles) {
    if (!video.isVideo) {
      const outputPath = getOutputPath(video, outputDir, false);
      moveFile(video.fullPath, outputPath);
      continue;
    }

    const outputPath = getOutputPath(video, outputDir, true);
    encodeVideo(video, outputPath, params);
  }
}

function getSourceAndOutput(opts: EncodeOptions) {
  const source = getSource(opts.input);
  if (!source) {
    print(`Input source '${opts.input}' does not exist.`, "error");
    process.exit(1);
  }

  try {
    const outputDir = getOutputDir(source, opts.output);
    return { source, outputDir };
  } catch (error) {
    print(`${error}`, "error");
    process.exit(1);
  }
}

function encodeVideo(
  video: MediaFile,
  outputPath: string,
  params: FFmpegEncodingParams,
) {
  print(`Encoding '${video.fullPath}' to '${outputPath}'`);
  const command = generateFFMpegCommand(video.fullPath, outputPath, params);
  print(`Running FFmpeg command: ffmpeg ${command.join(" ")}`);

  const result = spawnSync("ffmpeg", command, { stdio: "inherit" });
  if (result.error) {
    print(
      `\nError encoding '${video.fullPath}': ${result.error.message}`,
      "error",
    );
  } else if (result.status !== 0) {
    print(
      `\nFFmpeg exited with code ${result.status} while encoding '${video.fullPath}'.`,
      "error",
    );
  } else {
    print(
      `\nSuccessfully encoded '${video.fullPath}' to '${outputPath}'.`,
      "success",
    );
  }
}

function moveFile(src: string, dest: string) {
  if (fs.existsSync(dest)) {
    print(
      `File '${dest}' already exists. Skipping move for '${src}'.`,
      "warning",
    );
    return;
  }
  fs.renameSync(src, dest);
  print(`Moved file from '${src}' to '${dest}'.`, "success");
}

export { runEncode };
