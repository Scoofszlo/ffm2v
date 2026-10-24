import fs from "fs";
import path from "path";
import {
  checkIsVideo,
  createFileEntry,
  escapeFilterPath,
  runCommand,
  runFFprobe,
} from "@/workflow/helpers.ts";
import type { FFmpegEncodingParams } from "@/workflow/model/encodingParams.ts";
import type { FileEntry } from "@/workflow/model/fileEntry.ts";
import type { MergeWorkflowOpts } from "@/workflow/model/workflow.ts";
import { generateVidstabDetectFilter } from "./filters.ts";

export function getFiles(
  input: string[],
  onSuccess: (file: FileEntry) => void,
): [FileEntry, ...FileEntry[]] {
  const files: FileEntry[] = [];

  if (input.length < 2) {
    throw new Error("At least two video files must be provided for merging.");
  }
  for (const filePath of input) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Input file '${filePath}' does not exist.`);
    }
    if (!fs.statSync(filePath).isFile()) {
      throw new Error(`Input path '${filePath}' is not a file.`);
    }

    if (!checkIsVideo(filePath)) {
      throw new Error(`Input file '${filePath}' is not a valid video file.`);
    }

    const file = createFileEntry(filePath);
    onSuccess(file);
    files.push(file);
  }
  return files as [FileEntry, FileEntry, ...FileEntry[]];
}

export function getInputPaths(videos: FileEntry[]): string[] {
  return videos.map((video) => ["-i", video.fullPath]).flat();
}

export function resolveOutputPath(
  inputPath: string,
  outputPath: string | null,
): string {
  const baseName = path.basename(inputPath, path.extname(inputPath));

  // Check if output path is supplied
  if (outputPath) {
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output path '${outputPath}' does not exist.`);
    }

    // If the output path is a directory, create a default output file name.
    // Otherwise, throw an error
    if (fs.statSync(outputPath).isDirectory()) {
      return path.join(outputPath, `${baseName}-merged.mp4`);
    } else {
      throw new Error(`Output path '${outputPath}' is not a directory.`);
    }
  }

  // If no output path is supplied, create a default output file name in the
  // same directory as the first input video.
  const dir = path.dirname(inputPath);
  return path.join(dir, `${baseName}-merged.mp4`);
}

export function getHighestResolution(videos: FileEntry[]): [number, number] {
  let highestResolutionArea = 0;
  let highestResolution: [number, number] = [0, 0];

  for (const video of videos) {
    const resolution = getVideoResolution(video.fullPath);
    const area = resolution[0] * resolution[1];
    if (area > highestResolutionArea) {
      highestResolutionArea = area;
      highestResolution = resolution;
    }
  }
  return highestResolution;
}

export function getMaxFps(videos: FileEntry[]): number {
  let maxFps = 0;
  for (const video of videos) {
    const fps = getVideoFps(video.fullPath);
    if (fps > maxFps) {
      maxFps = fps;
    }
  }
  return maxFps;
}

export function generateFFMpegCommand(
  input: string[],
  outputPath: string,
  filtergraph: string,
  maxFps: number,
  params: FFmpegEncodingParams,
  opts: MergeWorkflowOpts,
): string[] {
  const command: string[] = [];

  command.push(...input);
  command.push("-filter_complex", filtergraph);
  command.push("-map", "[outv]");

  if (opts.disableAudio === false) {
    command.push("-map", "[outa]");
  }

  command.push("-r", `${maxFps}`);
  command.push(...params.videoCodec);
  command.push(...params.crf);
  command.push("-x265-params", "no-info=1");
  if (params.disableAudio[0] === "-an") {
    command.push(...params.disableAudio);
  } else {
    command.push("-c:a", "libmp3lame");
    command.push("-b:a", "320k");
  }
  command.push(outputPath);
  return command;
}

function getVideoResolution(videoPath: string): [number, number] {
  const output = runFFprobe(
    [
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0",
    ],
    videoPath,
  );
  const [width, height] = output.split(",").map(Number);
  if (!width || !height || isNaN(width) || isNaN(height)) {
    throw new Error(`Invalid resolution format for '${videoPath}': ${output}`);
  }
  return [width, height];
}

function getVideoFps(videoPath: string): number {
  const output = runFFprobe(
    [
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=r_frame_rate",
      "-of",
      "csv=p=0",
    ],
    videoPath,
  );
  const [numerator, denominator] = output.split("/").map(Number);
  if (!numerator || !denominator || isNaN(numerator) || isNaN(denominator)) {
    throw new Error(`Invalid fps format for '${videoPath}': ${output}`);
  }
  return numerator / denominator;
}

export function generateStabilizationData(
  ffmpegPath: string,
  tmpDir: string,
  inputPath: string,
  strength: number,
  idx: number,
) {
  const trfFilePath = path.join(tmpDir, `transforms-${idx}.trf`);
  const escapedTrfFilePath = escapeFilterPath(trfFilePath);

  const command = [
    "-i",
    inputPath,
    "-vf",
    generateVidstabDetectFilter(strength, escapedTrfFilePath),
    "-f",
    "null",
    "-",
  ];

  runCommand(ffmpegPath, command, { stdio: "inherit" });

  return trfFilePath;
}
