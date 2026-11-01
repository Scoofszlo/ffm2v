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
 * Builds the audio arguments for the merged output. The audio comes from the
 * concat filtergraph, and filtered streams cannot be stream-copied, so it is
 * re-encoded as MP3 at 320k unless audio is disabled.
 * @param opts - The merge options, used to determine whether audio is enabled.
 * @returns The FFmpeg audio arguments, or `-an` when audio is disabled.
 */
function buildAudioArgs(opts: MergeWorkflowOpts): string[] {
  if (opts.disableAudio) {
    return ["-an"];
  }

  return ["-c:a", "libmp3lame", "-b:a", "320k"];
}

export function buildFFmpegInputArgs(
  inputs: string[],
  maxFps: number,
  opts: MergeWorkflowOpts,
  filtergraph: string,
): string[] {
  const command: string[] = [];

  command.push(...inputs);
  command.push("-filter_complex", filtergraph);
  command.push("-map", "[outv]");

  if (opts.disableAudio === false) {
    command.push("-map", "[outa]");
  }

  if (opts.interpolationMode === "minterpolate" && opts.targetFps) {
    command.push("-r", opts.targetFps.toString());
  } else {
    command.push("-r", maxFps.toString());
  }

  return command;
}

/**
 * Assembles the FFmpeg arguments for the pre-stage of the merge video2x
 * pipeline. The merged streams are written to stdout as a lossless Matroska
 * stream that video2x reads from its stdin.
 * @param input - The FFmpeg input arguments from {@link getInputPaths}.
 * @param filtergraph - The filtergraph from `generateFiltergraph`.
 * @param maxFps - The output frame rate used when interpolation is disabled.
 * @param opts - The merge options controlling audio and interpolation.
 * @returns The FFmpeg arguments, excluding the executable name.
 */
export function generateFFmpegPipeCommand(
  input: string[],
  filtergraph: string,
  maxFps: number,
  opts: MergeWorkflowOpts,
) {
  const command = buildFFmpegInputArgs(input, maxFps, opts, filtergraph);

  command.push("-c:v", "ffv1");
  command.push(...buildAudioArgs(opts));
  command.push("-f", "matroska", "pipe:1");

  return command;
}

/**
 * Assembles the FFmpeg argument array for merging videos. It includes the
 * inputs, filtergraph, output mapping, frame rate (the interpolation target
 * when set, otherwise `maxFps`), codec settings, and audio handling. Audio is
 * re-encoded as MP3 at 320k unless disabled.
 * @param input - The FFmpeg input arguments from {@link getInputPaths}.
 * @param outputPath - The path to write the merged video to.
 * @param filtergraph - The filtergraph from `generateFiltergraph`.
 * @param maxFps - The output frame rate used when interpolation is disabled.
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
  const command = buildFFmpegInputArgs(input, maxFps, opts, filtergraph);

  command.push(...args.videoCodec);
  command.push(...args.crf);
  command.push("-x265-params", "no-info=1");
  command.push(...buildAudioArgs(opts));
  command.push(outputPath);
  return command;
}
