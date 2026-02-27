import chalk from "chalk";
import os from "os";
import path from "path";
import { print, spinnerPrint } from "../../cli/printer.ts";
import type { UpdateOptions } from "../../cli/types.ts";
import { FFMPEG_LATEST_DOWNLOAD_URL } from "../../constants.ts";
import {
  archiveOldVersion,
  checkDeps,
  cleanup,
  deleteOldVersion,
  downloadNewVersion,
  extractAndMove,
  getFFmpegDirPath,
  getFFmpegExecutablePath,
  getLocalFFmpegVersion,
  getRemoteFFmpegVersion,
  isVersionOutdated,
} from "./helpers.ts";

function runUpdate(opts: UpdateOptions) {
  if (process.platform !== "win32") {
    print(
      "The update feature is currently only supported on Windows.",
      "error",
    );
    process.exit(1);
  }

  const result = checkDeps();
  if (result.status === "missing") {
    if (!result.deps.ffmpeg) {
      print(
        "FFmpeg is not installed or not found in PATH. Please install FFmpeg to use the update feature.",
        "error",
      );
    } else if (!result.deps.sevenZip) {
      print(
        "7-Zip is not installed or not found in PATH. Please install 7-Zip to use the update feature.",
        "error",
      );
    }
    process.exit(1);
  }

  const { ffmpegExecutablePath, ffmpegDirPath } = getFFmpegPaths();

  const { localVersion, remoteVersion } = spinnerPrint(
    "Checking FFmpeg version...",
    () => {
      try {
        const localVersion = getLocalFFmpegVersion(ffmpegExecutablePath);
        const remoteVersion = getRemoteFFmpegVersion();

        return { localVersion, remoteVersion };
      } catch (error) {
        const errorMsg = `Error checking FFmpeg version: ${error}`;
        print(errorMsg, "error");
        process.exit(1);
      }
    },
  );

  try {
    if (!isVersionOutdated(localVersion, remoteVersion)) {
      console.log(chalk.green("FFmpeg is up to date."));
      console.log(`Current version: '${localVersion}'`);
      return;
    } else {
      console.log(chalk.yellow.bold("Update available!"));
      console.log(`Upgradable from '${localVersion}' to '${remoteVersion}'`);
    }
  } catch (error) {
    console.error("Error comparing versions:", error);
    process.exit(1);
  }

  if (opts.checkOnly) return;

  print(`Starting update from '${localVersion}' to '${remoteVersion}'`);

  if (opts.disableArchive) {
    spinnerPrint("Deleting existing FFmpeg installation...", () => {
      try {
        deleteOldVersion(ffmpegDirPath);
      } catch (error) {
        const errorMsg = `Failed to delete existing FFmpeg installation: ${error}`;
        print(errorMsg, "error");
        process.exit(1);
      }
      print("Existing FFmpeg installation deleted.");
    });
  } else {
    spinnerPrint("Archiving existing FFmpeg installation...", () => {
      try {
        archiveOldVersion(ffmpegDirPath, localVersion);
      } catch (error) {
        const errorMsg = `Failed to archive existing FFmpeg installation: ${error}`;
        print(errorMsg, "error");
        process.exit(1);
      }
      print("Existing FFmpeg installation archived.");
    });
  }

  const archiveDir = os.tmpdir();
  const archivePath = path.join(archiveDir, `ffmpeg-${remoteVersion}.7z`);

  spinnerPrint("Downloading new FFmpeg version...", () => {
    try {
      downloadNewVersion(
        FFMPEG_LATEST_DOWNLOAD_URL(remoteVersion),
        archivePath,
      );
    } catch (error) {
      const errorMsg = `Failed to download new FFmpeg version: ${error}`;
      print(errorMsg, "error");
      process.exit(1);
    }
  });

  spinnerPrint("Setting up the new version...", () => {
    try {
      extractAndMove(archiveDir, archivePath, ffmpegDirPath);
    } catch (error) {
      const errorMsg = `Failed to set up the new FFmpeg version: ${error}`;
      print(errorMsg, "error");
      process.exit(1);
    } finally {
      cleanup(archivePath);
    }
  });

  print(`FFmpeg ${remoteVersion} has been installed successfully!`, "success");
}

function getFFmpegPaths() {
  const ffmpegExecutablePath = getFFmpegExecutablePath();
  if (!ffmpegExecutablePath) {
    console.error("FFmpeg is not installed or not found in PATH.");
    process.exit(1);
  }

  const ffmpegDirPath = getFFmpegDirPath(ffmpegExecutablePath);
  return { ffmpegExecutablePath, ffmpegDirPath };
}

export { runUpdate };
