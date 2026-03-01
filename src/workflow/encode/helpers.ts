import fs from "fs";
import path from "path";
import type { FFmpegEncodingParams } from "../../param/model.ts";
import { checkIsVideo, createFileEntry } from "../helpers.ts";
import { FileEntry } from "../model.ts";
import type { InputSource } from "./types.ts";

export function getInputSource(source: string): InputSource {
  // Check if the source is a directory or a file
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

export function getOutputPath(
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

  const SourceDirRelativePathToOutputPath = path.relative(
    inputSource.dirName,
    video.sourceDir,
  );

  fs.mkdirSync(path.join(outputDir, SourceDirRelativePathToOutputPath), {
    recursive: true,
  });

  return path.join(
    outputDir,
    SourceDirRelativePathToOutputPath,
    outputFilename,
  );
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
