import { escapeFilterPath } from "@/workflow/helpers.ts";
import {
  generateUnsharpFilter,
  VIDEO_STABILIZATION_UNSHARP_PRESET,
} from "./unsharp.ts";

/**
 * Generates the FFmpeg `vidstabtransform` filter chain that applies
 * stabilization using a previously generated transform file, followed by the
 * unsharp filter.
 * @param trfFilePath - The path to the transform (`.trf`) file produced by the
 * detect pass.
 * @param strength - The stabilization strength, from 1 (weakest) to 5
 * (strongest).
 * @returns The combined stabilization and unsharp filter chain.
 * @throws Will throw an error if the strength is not between 1 and 5.
 */
export function generateStabilizationFilter(
  trfFilePath: string,
  strength: number,
): string {
  let filter = "vidstabtransform=";
  const escapedTrfFilePath = escapeFilterPath(trfFilePath);

  switch (strength) {
    case 1:
      filter += "smoothing=10";
      break;
    case 2:
      filter += "smoothing=15";
      break;
    case 3:
      filter += "smoothing=22";
      break;
    case 4:
      filter += "smoothing=30";
      break;
    case 5:
      filter += "smoothing=40";
      break;
    default:
      throw new Error(`Invalid stabilization strength: ${strength}`);
  }

  filter += `:input=${escapedTrfFilePath}:maxangle=0.0,`;
  filter += generateUnsharpFilter(VIDEO_STABILIZATION_UNSHARP_PRESET);

  return filter;
}

/**
 * Generates the FFmpeg `vidstabdetect` filter string that analyzes camera
 * motion and writes a transform file.
 * @param strength - The stabilization strength, from 1 (weakest) to 5
 * (strongest).
 * @param trfFilePath - The path where the transform (`.trf`) file will be
 * written.
 * @returns The `vidstabdetect` filter definition.
 * @throws Will throw an error if the strength is not between 1 and 5.
 */
export function generateVidstabDetectFilter(
  strength: number,
  trfFilePath: string,
): string {
  let filter = "vidstabdetect=";

  switch (strength) {
    case 1:
      filter += "shakiness=4:accuracy=9";
      break;
    case 2:
      filter += "shakiness=6:accuracy=12";
      break;
    case 3:
      filter += "shakiness=8:accuracy=15";
      break;
    case 4:
      filter += "shakiness=10:accuracy=15";
      break;
    case 5:
      filter += "shakiness=10:accuracy=15";
      break;
    default:
      throw new Error(`Invalid stabilization strength: ${strength}`);
  }

  filter += `:result=${trfFilePath}`;

  return filter;
}
