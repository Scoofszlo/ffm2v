import path from "path";

class MediaFile {
  sourceDir: string;
  fileName: string;
  isVideo: boolean = true;
  hasAudio: boolean = false;

  constructor(sourceDir: string, fileName: string, isVideo: boolean = true, hasAudio: boolean) {
    this.sourceDir = sourceDir;
    this.fileName = fileName;
    this.isVideo = isVideo;
    this.hasAudio = hasAudio;
  }

  get fullPath(): string {
    return path.join(this.sourceDir, this.fileName);
  }
}

export { MediaFile };
