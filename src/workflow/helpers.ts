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
    throw new Error(`Failed to check audio streams for '${filePath}': ${result.stderr}`);
  }
  const output = result.stdout.trim();
  const data = JSON.parse(output);
  return data.streams.length > 0;
}
