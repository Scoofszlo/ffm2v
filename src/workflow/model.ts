import path from "path";

class FileEntry {
  sourceDir: string;
  fileName: string;
  fullPath: string;
  fileNameWithoutExt: string;
  extension: string;
  isVideo: boolean;
  hasAudio: boolean;
  duration: number | null = null;

  constructor(
    sourceDir: string,
    fileName: string,
    isVideo: boolean,
    hasAudio: boolean,
    duration: number | null = null,
  ) {
    this.sourceDir = sourceDir;
    this.fileName = fileName;
    this.fullPath = this.getFullPath();
    this.fileNameWithoutExt = this.getFileNameWithoutExt();
    this.extension = this.getExtension();
    this.isVideo = isVideo;
    this.hasAudio = hasAudio;
    this.duration = duration;
  }

  private getFullPath(): string {
    return path.join(this.sourceDir, this.fileName);
  }

  private getFileNameWithoutExt(): string {
    return path.parse(this.fileName).name;
  }

  private getExtension(): string {
    return path.extname(this.fileName);
  }
}

export { FileEntry };
