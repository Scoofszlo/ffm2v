import pkgDetails from "../package.json" with { type: "json" };
export const APP_VERSION = pkgDetails.version;

export const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mkv",
  ".avi",
  ".mov",
  ".webm",
  ".flv",
  ".mpeg",
  ".mpg",
  ".m4v",
  ".3gp",
  ".ts",
];

export const REMOTE_FFMPEG_VERSION_URL =
  "https://www.gyan.dev/ffmpeg/builds/git-version";

export const FFMPEG_LATEST_DOWNLOAD_URL = (version: string) => {
  return `https://github.com/GyanD/codexffmpeg/releases/download/${version}/ffmpeg-${version}-full_build.7z`;
};
