import { spawnSync } from "child_process";
import type { Resolution } from "@/types.ts";
import type { MediaFile } from "@/workflow/model/mediaFile.ts";
import {
  parseFps,
  parseResolution,
  pickHighestResolution,
  pickMaxFps,
} from "./parsers.ts";

/**
 * Runs ffprobe with the given arguments (plus the target file) and returns its
 * trimmed stdout. Spawn failures such as a missing ffprobe binary and non-zero
 * exits are both reported with the target file, so callers never surface an
 * `undefined` stderr to the user.
 * @param args - The ffprobe arguments, excluding the executable name.
 * @param filePath - The path to the media file to probe.
 * @returns The trimmed stdout of the ffprobe process.
 * @throws Will throw an error if ffprobe cannot be started or exits non-zero.
 */
export function runFFprobe(args: string[], filePath: string): string {
  const result = spawnSync("ffprobe", ["-v", "error", ...args, filePath], {
    encoding: "utf-8",
  });

  if (result.error) {
    throw new Error(
      `Failed to run ffprobe for '${filePath}': ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(
      `ffprobe exited with code ${result.status} for '${filePath}'${stderr ? `: ${stderr}` : "."}`,
    );
  }

  return result.stdout.trim();
}

/**
 * Reads the width and height of a video's first video stream using ffprobe.
 * @param videoPath - The path to the video.
 * @returns The `[width, height]` of the video.
 * @throws Will throw an error if ffprobe fails or returns an invalid resolution.
 */
export function getVideoResolution(videoPath: string): Resolution {
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
  return parseResolution(output, videoPath);
}

/**
 * Reads the frame rate of a video's first video stream using ffprobe.
 * @param videoPath - The path to the video.
 * @returns The frame rate in frames per second.
 * @throws Will throw an error if ffprobe fails or returns an invalid frame rate.
 */
export function getVideoFps(videoPath: string): number {
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
  return parseFps(output, videoPath);
}

/**
 * Finds the largest resolution among the videos by probing each one.
 * @param videos - The videos to inspect.
 * @returns The `[width, height]` of the video with the largest area.
 * @throws Will throw an error if ffprobe fails for any video.
 */
export function getHighestResolution(videos: MediaFile[]): Resolution {
  return pickHighestResolution(
    videos.map((video) => getVideoResolution(video.fullPath)),
  );
}

/**
 * Finds the highest frame rate among the videos by probing each one.
 * @param videos - The videos to inspect.
 * @returns The highest frame rate found.
 * @throws Will throw an error if ffprobe fails for any video.
 */
export function getMaxFps(videos: MediaFile[]): number {
  return pickMaxFps(videos.map((video) => getVideoFps(video.fullPath)));
}

/**
 * Checks whether a video contains at least one audio stream using ffprobe.
 * @param filePath - The path to the video.
 * @returns `true` if at least one audio stream is present.
 * @throws Will throw an error if ffprobe fails.
 */
export function checkHasAudio(filePath: string): boolean {
  const output = runFFprobe(
    ["-show_streams", "-select_streams", "a", "-print_format", "json"],
    filePath,
  );
  const data = JSON.parse(output);
  return data.streams.length > 0;
}

/**
 * Reads a video's duration in seconds using ffprobe.
 * @param filePath - The path to the video.
 * @returns The duration in seconds.
 * @throws Will throw an error if ffprobe fails or returns an invalid duration.
 */
export function getVideoDuration(filePath: string): number {
  const output = runFFprobe(
    [
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
    ],
    filePath,
  );
  const duration = parseFloat(output);
  if (isNaN(duration)) {
    throw new Error(`Invalid duration format for '${filePath}': ${output}`);
  }
  return duration;
}
