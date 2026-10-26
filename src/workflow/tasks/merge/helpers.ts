import fs from "fs";
import path from "path";
import { generateVidstabDetectFilter } from "@/filters/stabilization.ts";
import {
  checkIsVideo,
  createFileEntry,
  escapeFilterPath,
  runCommand,
} from "@/workflow/helpers.ts";
import type { FFmpegEncodingParams } from "@/workflow/model/encodingParams.ts";
import type { FileEntry } from "@/workflow/model/fileEntry.ts";
import type { MergeWorkflowOpts } from "@/workflow/model/workflow.ts";

/**
 * Validates each input path and creates a file entry for it. Each path must
 * exist, be a file, and be a video.
 * @param input - The list of input file paths.
 * @param onSuccess - Callback invoked with each file entry as it is validated.
 * @returns The file entries as a tuple guaranteed to contain at least two
 * items.
 * @throws Will throw an error if fewer than two inputs are given, or if any
 * input does not exist, is not a file, or is not a video.
 */
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

/**
 * Converts the video list into FFmpeg input arguments, pairing each video with
 * an `-i` flag.
 * @param videos - The videos being merged, in input order.
 * @returns A flat array such as `['-i', 'a.mp4', '-i', 'b.mp4']`.
 */
export function getInputPaths(videos: FileEntry[]): string[] {
  return videos.map((video) => ["-i", video.fullPath]).flat();
}

/**
 * Resolves the merged output file path. If an output directory is given, the
 * file is placed there. Otherwise, it goes in the first input's directory. The
 * name is `<first input name>-merged.mp4`.
 * @param inputPath - The path to the first input video, used to derive the file
 * name.
 * @param outputPath - The optional output directory provided by the user.
 * @returns The full path for the merged output file.
 * @throws Will throw an error if the output path does not exist or is not a
 * directory.
 */
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

/**
 * Runs the FFmpeg `vidstabdetect` pass on a video to produce a transform file
 * used for stabilization. The file name includes the index so that each video
 * gets its own file.
 * @param ffmpegPath - The path to the FFmpeg executable.
 * @param tmpDir - The directory where the transform file is written.
 * @param inputPath - The path to the video to analyze.
 * @param strength - The stabilization strength, from 1 (weakest) to 5
 * (strongest).
 * @param idx - The video's position in the merge list, used to name the
 * transform file.
 * @returns The path to the generated transform (`.trf`) file.
 */
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

/**
 * Assembles the FFmpeg argument array for merging videos. It includes the
 * inputs, filtergraph, output mapping, frame rate, codec settings, and audio
 * handling. Audio is re-encoded as MP3 at 320k unless disabled.
 * @param input - The FFmpeg input arguments from {@link getInputPaths}.
 * @param outputPath - The path to write the merged video to.
 * @param filtergraph - The filtergraph from `generateFiltergraph`.
 * @param maxFps - The output frame rate.
 * @param params - The encoding parameters derived from the user options.
 * @param opts - The merge options, used to determine whether audio is enabled.
 * @returns The FFmpeg arguments, excluding the executable name.
 */
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
