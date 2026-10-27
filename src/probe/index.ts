import { runFFprobe } from "@/workflow/util.ts";
import type { MediaFile } from "@/workflow/model/mediaFile.ts";
import {
  parseFps,
  parseResolution,
  pickHighestResolution,
  pickMaxFps,
} from "./parsers.ts";

/**
 * Reads the width and height of a video's first video stream using ffprobe.
 * @param videoPath - The path to the video.
 * @returns The `[width, height]` of the video.
 * @throws Will throw an error if ffprobe fails or returns an invalid resolution.
 */
export function getVideoResolution(videoPath: string): [number, number] {
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
export function getHighestResolution(videos: MediaFile[]): [number, number] {
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
