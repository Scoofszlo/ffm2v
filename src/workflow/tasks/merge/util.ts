import fs from "fs";
import path from "path";
import type { FFmpegArgs } from "@/workflow/model/ffmpegArgs.ts";
import type { MediaFile } from "@/workflow/model/mediaFile.ts";
import type { MergeWorkflowOpts } from "@/workflow/model/workflow.ts";
import { createMediaFile, hasVideoExtension } from "@/workflow/util.ts";

/**
 * Validates each input path and creates a media file for it. Each path must
 * exist, be a file, and be a video.
 * @param input - The list of input file paths.
 * @param onSuccess - Callback invoked with each media file as it is validated.
 * @returns The media files as a tuple guaranteed to contain at least two
 * items.
 * @throws Will throw an error if fewer than two inputs are given, or if any
 * input does not exist, is not a file, or is not a video.
 */
export function getFiles(
  input: string[],
  onSuccess: (file: MediaFile) => void,
): [MediaFile, ...MediaFile[]] {
  const files: MediaFile[] = [];

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

    if (!hasVideoExtension(filePath)) {
      throw new Error(`Input file '${filePath}' is not a valid video file.`);
    }

    const file = createMediaFile(filePath);
    onSuccess(file);
    files.push(file);
  }
  return files as [MediaFile, MediaFile, ...MediaFile[]];
}

/**
 * Converts the video list into FFmpeg input arguments, pairing each video with
 * an `-i` flag.
 * @param videos - The videos being merged, in input order.
 * @returns A flat array such as `['-i', 'a.mp4', '-i', 'b.mp4']`.
 */
export function getInputPaths(videos: MediaFile[]): string[] {
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
 * Assembles the FFmpeg argument array for merging videos. It includes the
 * inputs, filtergraph, output mapping, frame rate, codec settings, and audio
 * handling. Audio is re-encoded as MP3 at 320k unless disabled.
 * @param input - The FFmpeg input arguments from {@link getInputPaths}.
 * @param outputPath - The path to write the merged video to.
 * @param filtergraph - The filtergraph from `generateFiltergraph`.
 * @param maxFps - The output frame rate.
 * @param args - The encoding arguments derived from the user options.
 * @param opts - The merge options, used to determine whether audio is enabled.
 * @returns The FFmpeg arguments, excluding the executable name.
 */
export function generateFFmpegCommand(
  input: string[],
  outputPath: string,
  filtergraph: string,
  maxFps: number,
  args: FFmpegArgs,
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
  command.push(...args.videoCodec);
  command.push(...args.crf);
  command.push("-x265-params", "no-info=1");
  if (opts.disableAudio) {
    command.push("-an");
  } else {
    command.push("-c:a", "libmp3lame");
    command.push("-b:a", "320k");
  }
  command.push(outputPath);
  return command;
}
