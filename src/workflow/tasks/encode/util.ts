import fs from "fs";
import path from "path";
import type { FFmpegArgs } from "@/workflow/model/ffmpegArgs.ts";
import type { MediaFile } from "@/workflow/model/mediaFile.ts";
import type { Video2xArgs } from "@/workflow/model/video2xArgs.ts";
import { createMediaFile, hasVideoExtension } from "@/workflow/util.ts";
import type { InputSource } from "./types.ts";

/**
 * Resolves the input source, which can be either a directory or a single video
 * file.
 * @param source - The path to the input source.
 * @returns An object representing the input source, including its path,
 * directory name, and type (file or directory).
 * @throws Will throw an error if the input source does not exist or if a single
 * file is provided that is not a video file.
 */
export function resolveInputSource(source: string): InputSource {
  if (!fs.existsSync(source)) {
    throw new Error(`Input source '${source}' does not exist.`);
  }

  const stat = fs.lstatSync(source);

  if (stat.isDirectory()) {
    return { path: source, dirName: source, type: "dir" };
  }

  if (!hasVideoExtension(source)) {
    throw new Error(`File '${source}' is not a video file.`);
  }

  return { path: source, dirName: path.dirname(source), type: "file" };
}

/**
 * Resolves the output directory based on the input source and the provided
 * output path. If no output path is provided, it defaults to the input source's
 * directory.
 * @param source - The input source object containing the path and type (file or
 * directory).
 * @param output - The optional output path provided by the user.
 * @returns The resolved output directory path.
 * @throws Will throw an error if the provided output path does not exist.
 */
export function resolveOutputDir(
  source: InputSource,
  output: string | null,
): string {
  if (!output) {
    if (source.type === "file") {
      return path.dirname(source.path);
    } else {
      return source.path;
    }
  }

  if (fs.existsSync(output)) {
    return output;
  }
  throw new Error(`Output path '${output}' does not exist.`);
}

/**
 * Collects the files to process from the input source. For a single file, only
 * that file is returned. For a directory, it recursively walks all
 * subdirectories.
 * @param inputSource - The input source to collect files from.
 * @param onSuccess - Callback invoked with each media file as it is added.
 * @returns The list of collected media files.
 */
export function getFiles(
  inputSource: InputSource,
  onSuccess: (file: MediaFile) => void,
): MediaFile[] {
  const files: MediaFile[] = [];

  const collect = (dirPath: string) => {
    for (const fetchedPath of fs.readdirSync(dirPath)) {
      const constructedPath = path.join(dirPath, fetchedPath);
      const stat = fs.lstatSync(constructedPath);
      if (stat.isDirectory()) {
        collect(constructedPath);
      } else {
        const file = createMediaFile(constructedPath);
        files.push(file);
        onSuccess(file);
      }
    }
  };

  if (inputSource.type === "file") {
    const file = createMediaFile(inputSource.path);
    files.push(file);
    onSuccess(file);
  } else if (inputSource.type === "dir") {
    collect(inputSource.path);
  }
  return files;
}

/**
 * Builds the output path for a file, preserving its subdirectory structure
 * relative to the input source. Video files get an `-encoded` suffix. The
 * necessary output directories are created if they do not exist.
 * @param video - The media file being processed.
 * @param inputSource - The input source the file was collected from.
 * @param outputDir - The resolved output directory.
 * @param isVideo - Whether the file is a video, which controls the `-encoded`
 * suffix.
 * @returns The full path where the output file should be written.
 */
export function resolveOutputPath(
  video: MediaFile,
  inputSource: InputSource,
  outputDir: string,
  isVideo: boolean,
): string {
  let outputFilename: string;

  if (isVideo) {
    outputFilename = `${video.baseName}-encoded${video.extension}`;
  } else {
    outputFilename = video.fileName;
  }

  const sourceDirRelativePathToOutputPath = path.relative(
    inputSource.dirName,
    video.sourceDir,
  );

  fs.mkdirSync(path.join(outputDir, sourceDirRelativePathToOutputPath), {
    recursive: true,
  });

  return path.join(
    outputDir,
    sourceDirRelativePathToOutputPath,
    outputFilename,
  );
}

/**
 * Assembles the FFmpeg argument array for encoding a single video, in the
 * order: rotation metadata, input, filter chain, video codec, CRF, audio
 * options, and output path.
 * @param inputPath - The path to the input video.
 * @param outputPath - The path to write the encoded video to.
 * @param args - The encoding arguments derived from the user options.
 * @param filterchain - The filter chain to apply, emitted via `-vf`; an
 * empty string omits the flag. It already includes any resolution scale.
 * @returns The FFmpeg arguments, excluding the executable name.
 */
export function generateFFmpegCommand(
  inputPath: string,
  outputPath: string,
  args: FFmpegArgs,
  filterchain: string,
): string[] {
  const command: string[] = [];

  if (args.keepRotationMetadata) {
    command.push(...args.keepRotationMetadata);
  }
  command.push("-i", inputPath);

  if (filterchain) {
    command.push("-vf", filterchain);
  }

  command.push(...args.videoCodec);
  command.push(...args.crf);
  command.push(...args.audioArgs);
  command.push(outputPath);

  return command;
}

export function generateVideo2xCommand(
  inputPath: string,
  outputPath: string,
  args: Video2xArgs,
): string[] {
  const command: string[] = [];

  // Input path
  command.push("-i", inputPath);
  // Output path
  command.push("-o", outputPath);
  // Target FPS
  command.push(...args.fpsMultiplier);
  // Video codec
  command.push(...args.videoCodec);
  // CRF
  command.push(...args.crf);
  // Other common defaults
  command.push("--processor", "rife");
  command.push("--rife-model", "rife-v4.26");
  command.push("-d", "1"); // TO-DO: Add logic to automatically target GPU

  return command;
}
