import { spawnSync } from "child_process";
import fs from "fs";
import { print } from "../../cli/printer.ts";
import type { EncodeOptions } from "../../cli/types.ts";
import { FFmpegEncodingParams } from "../../param/model.ts";
import type { FileEntry } from "../model.ts";
import {
  generateFFMpegCommand,
  getFiles,
  getInputSource,
  getOutputDir,
  getOutputPath,
} from "./helpers.ts";

function runEncode(opts: EncodeOptions) {
  try {
    const params = new FFmpegEncodingParams(opts);
    const { inputSource, outputDir } = getSourceAndOutput(opts);

    const files = getFiles(inputSource, (file) => {
      print(`${file.fullPath} added to list.`);
    });

    for (const file of files) {
      if (!file.isVideo) {
        const outputPath = getOutputPath(file, outputDir, false);
        moveFile(file.fullPath, outputPath);
        continue;
      }

      const outputPath = getOutputPath(file, outputDir, true);
      encodeVideo(file, outputPath, params);
    }
  } catch (error) {
    print(`${error}`, "error");
    process.exit(1);
  }
}

function getSourceAndOutput(opts: EncodeOptions) {
  const inputSource = getInputSource(opts.input);
  const outputDir = getOutputDir(inputSource, opts.output);
  return { inputSource, outputDir };
}

function encodeVideo(
  file: FileEntry,
  outputPath: string,
  params: FFmpegEncodingParams,
) {
  print(`Encoding '${file.fullPath}' to '${outputPath}'`);
  const command = generateFFMpegCommand(file.fullPath, outputPath, params);
  print(`Running FFmpeg command: ffmpeg ${command.join(" ")}`);

  const result = spawnSync("ffmpeg", command, { stdio: "inherit" });
  if (result.error) {
    print(
      `\nError encoding '${file.fullPath}': ${result.error.message}`,
      "error",
    );
  } else if (result.status !== 0) {
    print(
      `\nFFmpeg exited with code ${result.status} while encoding '${file.fullPath}'.`,
      "error",
    );
  } else {
    print(
      `\nSuccessfully encoded '${file.fullPath}' to '${outputPath}'.`,
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
