import fs from "fs";
import path from "path";
import { generateScaleFilter } from "@/filters/scale.ts";
import { checkIsVideo, createFileEntry } from "@/workflow/helpers.ts";
import type { FFmpegEncodingParams } from "@/workflow/model/encodingParams.ts";
import type { FileEntry } from "@/workflow/model/fileEntry.ts";
import type { EncodeWorkflowOpts } from "@/workflow/model/workflow.ts";
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

  if (!checkIsVideo(source)) {
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
 * @param onSuccess - Callback invoked with each file entry as it is added.
 * @returns The list of collected file entries.
 */
export function getFiles(
  inputSource: InputSource,
  onSuccess: (file: FileEntry) => void,
): FileEntry[] {
  const files: FileEntry[] = [];

  const collect = (dirPath: string) => {
    for (const fetchedPath of fs.readdirSync(dirPath)) {
      const constructedPath = path.join(dirPath, fetchedPath);
      const stat = fs.lstatSync(constructedPath);
      if (stat.isDirectory()) {
        collect(constructedPath);
      } else {
        const file = createFileEntry(constructedPath);
        files.push(file);
        onSuccess(file);
      }
    }
  };

  if (inputSource.type === "file") {
    const file = createFileEntry(inputSource.path);
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
 * @param video - The file entry being processed.
 * @param inputSource - The input source the file was collected from.
 * @param outputDir - The resolved output directory.
 * @param isVideo - Whether the file is a video, which controls the `-encoded`
 * suffix.
 * @returns The full path where the output file should be written.
 */
export function resolveOutputPath(
  video: FileEntry,
  inputSource: InputSource,
  outputDir: string,
  isVideo: boolean,
): string {
  let outputFilename: string;

  if (isVideo) {
    outputFilename = `${video.fileNameWithoutExt}-encoded${path.extname(video.fileName)}`;
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
 * order: rotation metadata, input, optional filter chain, video codec, CRF,
 * resolution, audio options, and output path.
 * @param inputPath - The path to the input video.
 * @param outputPath - The path to write the encoded video to.
 * @param params - The encoding parameters derived from the user options.
 * @param filterchain - The filter chain to apply, or `null` to skip the `-vf`
 * flag.
 * @returns The FFmpeg arguments, excluding the executable name.
 */
export function generateFFmpegCommand(
  inputPath: string,
  outputPath: string,
  params: FFmpegEncodingParams,
  opts: EncodeWorkflowOpts,
  filterchain: string | null,
): string[] {
  const command: string[] = [];
  const filterchainArr: string[] = [];

  if (params.keepRotationMetadata) {
    command.push(...params.keepRotationMetadata);
  }
  command.push("-i", inputPath);

  // If a filterchain is provided, add it to the command
  if (filterchain) {
    filterchainArr.push("-vf", filterchain);
  }

  // If user specified a output resolution, create a scale filter and append
  // it to the filterchain at the end so that it is applied after all
  // other filters.
  if (opts.resolution) {
    const scaleFilter = generateScaleFilter(
      opts.resolution.width,
      opts.resolution.height,
    );

    // If filterchainArr is empty, append "-vf" then the filter
    if (filterchainArr.length === 0) {
      filterchainArr.push("-vf", scaleFilter);
    } else {
      // If filterchainArr already has "-vf", append the resolution to the
      // existing filterchain, which is at the second index of the array.
      filterchainArr[1] += `,${scaleFilter}`;
    }
  }

  command.push(...filterchainArr);

  command.push(...params.videoCodec);

  if (params.crf) {
    command.push(...params.crf);
  }

  if (params.disableAudio) {
    command.push(...params.disableAudio);
  }
  command.push(outputPath);

  return command;
}
