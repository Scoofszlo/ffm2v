import path from "path";

class MediaFile {
  sourceDir: string;
  fileName: string;
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
    this.isVideo = isVideo;
    this.hasAudio = hasAudio;
    this.duration = duration;
  }

  get fullPath(): string {
    return path.join(this.sourceDir, this.fileName);
  }
}

export { MediaFile };
