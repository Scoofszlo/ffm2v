import path from "path";
import { generateVidstabDetectFilter } from "@/filters/stabilization.ts";
import { escapeFilterPath } from "@/filters/util.ts";
import { runCommand } from "@/workflow/util.ts";

/**
 * Runs the FFmpeg `vidstabdetect` pass on a video to produce a transform file
 * used for stabilization. Shared by the encode and merge tasks, which differ
 * only in how the transform file is named.
 * @param ffmpegPath - The path to the FFmpeg executable.
 * @param tmpDir - The directory where the transform file is written.
 * @param inputPath - The path to the video to analyze.
 * @param strength - The stabilization strength, from 1 (weakest) to 5
 * (strongest).
 * @param transformFileName - The name of the transform file to write inside
 * `tmpDir`, such as `transforms.trf` or `transforms-0.trf`.
 * @returns The path to the generated transform (`.trf`) file.
 * @throws Will throw an error if the FFmpeg process cannot be started or exits
 * with a non-zero status.
 */
export function generateStabilizationData(
  ffmpegPath: string,
  tmpDir: string,
  inputPath: string,
  strength: number,
  transformFileName = "transforms.trf",
): string {
  const trfFilePath = path.join(tmpDir, transformFileName);
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
