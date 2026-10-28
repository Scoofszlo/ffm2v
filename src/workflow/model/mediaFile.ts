import path from "path";

/**
 * Describes a single file collected from an input source, plus the media
 * metadata read from it by ffprobe. Non-video files are represented too, with
 * `isVideo` false and no duration.
 */
class MediaFile {
  sourceDir: string;
  fileName: string;
  fullPath: string;
  baseName: string;
  extension: string;
  isVideo: boolean;
  hasAudio: boolean;
  duration: number | null = null;
  transformFilePath: string | null = null;

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
    this.baseName = this.getBaseName();
    this.extension = this.getExtension();
    this.isVideo = isVideo;
    this.hasAudio = hasAudio;
    this.duration = duration;
  }

  private getFullPath(): string {
    return path.join(this.sourceDir, this.fileName);
  }

  private getBaseName(): string {
    return path.parse(this.fileName).name;
  }

  private getExtension(): string {
    return path.extname(this.fileName);
  }

  setTransformFilePath(transformFilePath: string) {
    this.transformFilePath = transformFilePath;
  }
}

export { MediaFile };
