import which from "which";
import path from "path";
import { execSync, spawnSync } from "child_process";
import { REMOTE_FFMPEG_VERSION_URL } from "../../constants.ts";
import fs from "fs";
import { print } from "../../cli/printer.ts";

const FFMPEG_VERSION_REGEX = /ffmpeg version (\d{4}-\d{2}-\d{2}-git-[a-f0-9]+)/;

export function checkDeps(): {
  status: "success" | "missing";
  deps: { ffmpeg: boolean; sevenZip: boolean };
} {
  let ffmpegAvailable;
  let sevenZipAvailable;
  let status: "success" | "missing" = "success";

  try {
    which.sync("ffmpeg");
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
    status = "missing";
  }

  try {
    which.sync("7z");
    sevenZipAvailable = true;
  } catch {
    sevenZipAvailable = false;
    status = "missing";
  }

  return {
    status,
    deps: { ffmpeg: ffmpegAvailable, sevenZip: sevenZipAvailable },
  };
}

export function getFFmpegExecutablePath(): string | null {
  return which.sync("ffmpeg", { nothrow: true });
}

export function getFFmpegDirPath(executablePath: string): string {
  return path.dirname(path.dirname(executablePath));
}

export function getLocalFFmpegVersion(executablePath: string): string {
  const output = execSync(`"${executablePath}" -version`).toString();
  const versionMatch = output.match(FFMPEG_VERSION_REGEX);

  if (!(versionMatch && versionMatch[1])) {
    throw new Error("Failed to extract FFmpeg version from output: " + output);
  }

  return versionMatch[1];
}

export function getRemoteFFmpegVersion(): string {
  const output = execSync(`curl -s ${REMOTE_FFMPEG_VERSION_URL}`)
    .toString()
    .trim();
  return output;
}

export function isVersionOutdated(
  localVersion: string,
  remoteVersion: string,
): boolean {
  const localVers = localVersion.slice(0, 10);
  const remoteVers = remoteVersion.slice(0, 10);

  const localDate = new Date(localVers);
  const remoteDate = new Date(remoteVers);

  return localDate < remoteDate;
}

export function archiveOldVersion(
  ffmpegDirPath: string,
  localVersion: string,
): void {
  const archiveDir = path.join(ffmpegDirPath, ".old_versions", localVersion);
  fs.mkdirSync(archiveDir, { recursive: true });

  for (const file of fs.readdirSync(ffmpegDirPath)) {
    if (file === ".old_versions") continue;
    const src = path.join(ffmpegDirPath, file);
    const dest = path.join(archiveDir, file);
    fs.mkdirSync(archiveDir, { recursive: true });
    fs.renameSync(src, dest);
  }
}

export function deleteOldVersion(ffmpegDirPath: string): void {
  for (const file of fs.readdirSync(ffmpegDirPath)) {
    if (file === ".old_versions") continue;
    const filePath = path.join(ffmpegDirPath, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  }
}

export function downloadNewVersion(
  downloadUrl: string,
  destinationPath: string,
): void {
  execSync(`curl -L -o "${destinationPath}" "${downloadUrl}"`, {
    stdio: "pipe",
  });
}

export function extractAndMove(
  archivePath: string,
  extractionPath: string,
  ffmpegDirPath: string,
): void {
  const extractionCommand = ["x", archivePath, `-o${extractionPath}`, "-y"];
  const result = spawnSync("7z", extractionCommand, { stdio: "inherit" });

  if (result.status !== 0) {
    throw new Error(
      `Failed to extract archive: ${result.error?.message || "Unknown error"}`,
    );
  }

  const entries = fs.readdirSync(extractionPath);
  const firstEntry = entries[0];
  if (!firstEntry) {
    throw new Error("Extraction produced no output.");
  }
  const extractedFolder = path.join(extractionPath, firstEntry);

  for (const item of fs.readdirSync(extractedFolder)) {
    const src = path.join(extractedFolder, item);
    const dst = path.join(ffmpegDirPath, item);
    fs.renameSync(src, dst);
  }
}

export function cleanup(paths: string[]): void {
  for (const path of paths) {
    if (fs.existsSync(path)) {
      const stat = fs.lstatSync(path);

      if (stat.isDirectory()) {
        fs.rmSync(path, { recursive: true, force: true });
      } else {
        fs.unlinkSync(path);
      }
    } else {
      print("Cleanup path does not exist, skipping: " + path, "warning");
    }
  }
}
