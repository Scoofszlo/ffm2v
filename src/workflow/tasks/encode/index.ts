import { spawnSync } from "child_process";
import fs from "fs";
import { escapeFilterPath, getFFmpegExecutable } from "@/workflow/helpers.ts";
import type { EncodeWorkflow } from "@/workflow/model/workflow.ts";
import chalk from "chalk";
import { print } from "../../../cli/printer.ts";
import { FFmpegEncodingParams } from "../../model/encodingParams.ts";
import { generateStabilizationFilter } from "./filters.ts";
import {
  generateFFMpegCommand,
  generateStabilizationData,
  getFiles,
  resolveInputSource,
  resolveOutputDir,
  resolveOutputPath,
} from "./helpers.ts";

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

export function runEncode(workflow: EncodeWorkflow) {
  // Prepare the encoding parameters and input/output paths
  const opts = workflow.options;
  const params = new FFmpegEncodingParams(opts);
  const ffmpegPath = getFFmpegExecutable(opts.ffmpegPath);
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
      moveFile(file.fullPath, outputPath);
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

      filterchain += generateStabilizationFilter(
        escapeFilterPath(trfFilePath),
        opts.stabilize,
      );
    }

    const outputPath = resolveOutputPath(file, inputSource, outputDir, true);

    // If filterchain is not empty, append a "-vf" flag
    if (!filterchain) {
      filterchain = null;
    }

    const command = generateFFMpegCommand(
      file.fullPath,
      outputPath,
      params,
      filterchain,
    );

    encodeVideo(file.fullPath, outputPath, ffmpegPath, command);
  }
}
