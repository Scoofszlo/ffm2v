import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import type { FFmpegEncodingParams } from "../../param/model.ts";
import { checkIsVideo, createFileEntry } from "../helpers.ts";
import { FileEntry } from "../model.ts";

export function getFiles(
  input: string[],
  onSuccess: (file: FileEntry) => void,
): [FileEntry, FileEntry, ...FileEntry[]] {
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

export function getOutputPath(inputPath: string, outputPath?: string): string {
  if (outputPath) {
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Output path '${outputPath}' does not exist.`);
    }
    return outputPath;
  }
  const dir = path.dirname(inputPath);
  const baseName = path.basename(inputPath, path.extname(inputPath));
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

export function generateFiltergraph(
  videos: FileEntry[],
  highestResolution: [number, number],
  maxFps: number,
  onSuccess: (filtergraph: string) => void,
): { input: string[]; filtergraph: string } {
  const input: string[] = [];
  let filtergraph = "";

  videos.forEach((video, index) => {
    input.push("-i", video.fullPath);
    filtergraph += `[${index}:v]scale=${highestResolution[0]}:${highestResolution[1]},setsar=1,fps=${maxFps}[v${index}];`;

    if (video.hasAudio) {
      filtergraph += `[${index}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${index}];`;
    } else {
      filtergraph += `anullsrc=channel_layout=stereo:sample_rate=48000:duration=${video.duration}[a${index}];`;
    }
  });

  filtergraph += " ";

  for (let i = 0; i < videos.length; i++) {
    filtergraph += `[v${i}]`;
    filtergraph += `[a${i}]`;
  }

  filtergraph += ` concat=n=${videos.length}:v=1:a=1 [outv][outa]`;

  onSuccess(filtergraph);
  return {
    input,
    filtergraph,
  };
}

export function generateFFMpegCommand(
  input: string[],
  outputPath: string,
  filtergraph: string,
  maxFps: number,
  params: FFmpegEncodingParams,
): string[] {
  const command: string[] = [];

  command.push(...input);
  command.push("-filter_complex", filtergraph);
  command.push("-map", "[outv]");
  command.push("-map", "[outa]");
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
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0",
      videoPath,
    ],
    { encoding: "utf-8" },
  );
  if (result.status !== 0) {
    throw new Error(`Failed to get video resolution for '${videoPath}'`);
  }
  const output = result.stdout.trim();
  const [width, height] = output.split(",").map(Number);
  if (!width || !height || isNaN(width) || isNaN(height)) {
    throw new Error(`Invalid resolution format for '${videoPath}': ${output}`);
  }
  return [width, height];
}

function getVideoFps(videoPath: string): number {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=r_frame_rate",
      "-of",
      "csv=p=0",
      videoPath,
    ],
    { encoding: "utf-8" },
  );
  if (result.status !== 0) {
    throw new Error(`Failed to get video fps for '${videoPath}'`);
  }
  const output = result.stdout.trim();
  const [numerator, denominator] = output.split("/").map(Number);
  if (!numerator || !denominator || isNaN(numerator) || isNaN(denominator)) {
    throw new Error(`Invalid fps format for '${videoPath}': ${output}`);
  }
  return numerator / denominator;
}
