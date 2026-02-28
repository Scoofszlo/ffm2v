import fs from "fs";
import path from "path";
import type { FFmpegEncodingParams } from "../../param/model.ts";
import { checkHasAudio, checkIsVideo, getVideoDuration } from "../helpers.ts";
import { MediaFile } from "../model.ts";
import type { Source } from "./types.ts";

export function getInputSource(source: string): Source | null {
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

export function getOutputDir(source: Source, output?: string): string {
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

export function getVideoFiles(
  source: Source,
  onSuccess: (video: MediaFile) => void,
): MediaFile[] {
  const videos: MediaFile[] = [];

  if (source.type === "file") {
    const sourceDir = path.dirname(source.path);
    const fileName = path.basename(source.path);
    const isVideo = checkIsVideo(fileName);
    const hasAudio = checkHasAudio(source.path);
    let duration: number | null;
    if (isVideo) {
      duration = getVideoDuration(source.path);
    } else {
      duration = null;
    }
    const video = new MediaFile(
      sourceDir,
      fileName,
      isVideo,
      hasAudio,
      duration,
    );
    videos.push(video);
    onSuccess(video);
  } else if (source.type === "dir") {
    collectVideoFiles(source.path, videos, onSuccess);
  }
  return videos;
}

export function getOutputPath(
  video: MediaFile,
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

function collectVideoFiles(
  dirPath: string,
  videos: MediaFile[],
  onSuccess: (video: MediaFile) => void,
): void {
  for (const file of fs.readdirSync(dirPath)) {
    const filePath = path.join(dirPath, file);
    const stat = fs.lstatSync(filePath);

    if (stat.isDirectory()) {
      collectVideoFiles(filePath, videos, onSuccess);
    } else {
      const isVideo = checkIsVideo(file);
      const hasAudio = checkHasAudio(filePath);
      let duration: number | null;
      if (isVideo) {
        duration = getVideoDuration(filePath);
      } else {
        duration = null;
      }
      const video = new MediaFile(dirPath, file, isVideo, hasAudio, duration);
      videos.push(video);
      onSuccess(video);
    }
  }
}
