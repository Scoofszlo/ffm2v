import path from "path";

class MediaFile {
  sourceDir: string;
  fileName: string;
  isVideo: boolean = true;

  constructor(sourceDir: string, fileName: string, isVideo: boolean = true) {
    this.sourceDir = sourceDir;
    this.fileName = fileName;
    this.isVideo = isVideo;
  }

  get fullPath(): string {
    return path.join(this.sourceDir, this.fileName);
  }
}

export { MediaFile };
