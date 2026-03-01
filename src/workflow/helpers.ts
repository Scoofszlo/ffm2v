import { spawnSync } from "child_process";
import path from "path";
import { VIDEO_EXTENSIONS } from "../constants.ts";
import { FileEntry } from "./model.ts";

export function createFileEntry(filePath: string) {
  const sourceDir = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const isVideo = checkIsVideo(fileName);
  let hasAudio: boolean;
  let duration: number | null;
  if (isVideo) {
    duration = getVideoDuration(filePath);
    hasAudio = checkHasAudio(filePath);
  } else {
    duration = null;
    hasAudio = false;
  }
  const file = new FileEntry(sourceDir, fileName, isVideo, hasAudio, duration);

  return file;
}

export function checkIsVideo(filePath: string): boolean {
  return VIDEO_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

export function checkHasAudio(filePath: string): boolean {
  const ffmpegCommand = [
    "-v",
    "error",
    "-show_streams",
    "-select_streams",
    "a",
    "-print_format",
    "json",
    filePath,
  ];

  const result = spawnSync("ffprobe", ffmpegCommand, { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(
      `Failed to check audio streams for '${filePath}': ${result.stderr}`,
    );
  }
  const output = result.stdout.trim();
  const data = JSON.parse(output);
  return data.streams.length > 0;
}

export function getVideoDuration(filePath: string): number {
  const ffmpegCommand = [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ];
  const result = spawnSync("ffprobe", ffmpegCommand, { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(
      `Failed to get duration for '${filePath}': ${result.stderr}`,
    );
  }
  const output = result.stdout.trim();
  const duration = parseFloat(output);
  if (isNaN(duration)) {
    throw new Error(`Invalid duration format for '${filePath}': ${output}`);
  }
  return duration;
}
