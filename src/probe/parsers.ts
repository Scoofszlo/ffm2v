import type { Resolution } from "@/types.ts";

/**
 * Picks the largest resolution (by pixel area). All videos are scaled to this
 * size when merging.
 * @param resolutions - The `[width, height]` of each video.
 * @returns The `[width, height]` with the largest area, or `[0, 0]` if the list
 * is empty.
 */
export function pickHighestResolution(resolutions: Resolution[]): Resolution {
  let highestResolutionArea = 0;
  let highestResolution: Resolution = [0, 0];

  for (const resolution of resolutions) {
    const area = resolution[0] * resolution[1];
    if (area > highestResolutionArea) {
      highestResolutionArea = area;
      highestResolution = resolution;
    }
  }
  return highestResolution;
}

/**
 * Parses the output of an ffprobe `width,height` query.
 * @param output - The raw ffprobe output, such as `1920,1080`.
 * @param videoPath - The video path, used in the error message.
 * @returns The `[width, height]` of the video.
 * @throws Will throw an error if the output is not a valid resolution.
 */
export function parseResolution(output: string, videoPath: string): Resolution {
  const [width, height] = output.split(",").map(Number);
  if (!width || !height || isNaN(width) || isNaN(height)) {
    throw new Error(`Invalid resolution format for '${videoPath}': ${output}`);
  }
  return [width, height];
}

/**
 * Parses the output of an ffprobe `r_frame_rate` query, which is in the
 * `numerator/denominator` form.
 * @param output - The raw ffprobe output, such as `30000/1001`.
 * @param videoPath - The video path, used in the error message.
 * @returns The frame rate in frames per second.
 * @throws Will throw an error if the output is not a valid frame rate.
 */
export function parseFps(output: string, videoPath: string): number {
  const [numerator, denominator] = output.split("/").map(Number);
  if (!numerator || !denominator || isNaN(numerator) || isNaN(denominator)) {
    throw new Error(`Invalid fps format for '${videoPath}': ${output}`);
  }
  return numerator / denominator;
}

/**
 * Picks the highest frame rate. All videos are set to this frame rate when
 * merging.
 * @param fpsValues - The frame rate of each video.
 * @returns The highest frame rate, or `0` if the list is empty.
 */
export function pickMaxFps(fpsValues: number[]): number {
  let maxFps = 0;
  for (const fps of fpsValues) {
    if (fps > maxFps) {
      maxFps = fps;
    }
  }
  return maxFps;
}
