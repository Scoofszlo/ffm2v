import path from "path";
import { VIDEO_EXTENSIONS } from "../constants.ts";
import { spawnSync } from "child_process";

export function isVideo(filePath: string): boolean {
  return VIDEO_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

export function hasAudio(filePath: string): boolean {
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
