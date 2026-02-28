import fs from "fs";
import path from "path";
import type { FFmpegEncodingParams } from "../../param/model.ts";
import { checkHasAudio, checkIsVideo, getVideoDuration } from "../helpers.ts";
import { FileEntry } from "../model.ts";
import type { InputSource } from "./types.ts";

export function getInputSource(source: string): InputSource | null {
  // Check if the source is a directory or a file
  if (!fs.existsSync(source)) return null;

  const stat = fs.lstatSync(source);

  if (stat.isDirectory()) {
    return { path: source, type: "dir" };
  } else if (stat.isFile()) {
    return { path: source, type: "file" };
  }

  return null;
}

export function getOutputDir(source: InputSource, output?: string): string {
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

export function getFiles(
  inputSource: InputSource,
  onSuccess: (file: FileEntry) => void,
): FileEntry[] {
  const files: FileEntry[] = [];

  if (inputSource.type === "file") {
    const sourceDir = path.dirname(inputSource.path);
    const fileName = path.basename(inputSource.path);
    const isVideo = checkIsVideo(fileName);
    const hasAudio = checkHasAudio(inputSource.path);
    let duration: number | null;
    if (isVideo) {
      duration = getVideoDuration(inputSource.path);
    } else {
      duration = null;
    }
    const file = new FileEntry(
      sourceDir,
      fileName,
      isVideo,
      hasAudio,
      duration,
    );
    files.push(file);
    onSuccess(file);
  } else if (inputSource.type === "dir") {
    collectFiles(inputSource.path, files, onSuccess);
  }
  return files;
}

export function getOutputPath(
  video: FileEntry,
  outputDir: string,
  isVideo: boolean,
): string {
  if (isVideo) {
    const fileNameWithoutExt = path.parse(video.fileName).name;
    const outputFileName = `${fileNameWithoutExt}-encoded${path.extname(video.fileName)}`;
    return path.join(outputDir, outputFileName);
  } else {
    return path.join(outputDir, video.fileName);
  }
}

export function generateFFMpegCommand(
  inputPath: string,
  outputPath: string,
  params: FFmpegEncodingParams,
): string[] {
  const command: string[] = [];

  if (params.allowAutoRotate) {
    command.push(...params.allowAutoRotate);
  }
  command.push("-i", inputPath);
  command.push(...params.videoCodec);

  if (params.crf) {
    command.push(...params.crf);
  }

  if (params.resolution) {
    command.push(...params.resolution);
  }
  if (params.disableAudio) {
    command.push(...params.disableAudio);
  }
  command.push(outputPath);

  return command;
}

function collectFiles(
  dirPath: string,
  files: FileEntry[],
  onSuccess: (video: FileEntry) => void,
): void {
  for (const fetchedFile of fs.readdirSync(dirPath)) {
    const filePath = path.join(dirPath, fetchedFile);
    const stat = fs.lstatSync(filePath);

    if (stat.isDirectory()) {
      collectFiles(filePath, files, onSuccess);
    } else {
      const isVideo = checkIsVideo(fetchedFile);
      const hasAudio = checkHasAudio(filePath);
      let duration: number | null;
      if (isVideo) {
        duration = getVideoDuration(filePath);
      } else {
        duration = null;
      }
      const file = new FileEntry(
        dirPath,
        fetchedFile,
        isVideo,
        hasAudio,
        duration,
      );
      files.push(file);
      onSuccess(file);
    }
  }
}
