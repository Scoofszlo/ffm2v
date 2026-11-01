import os from "os";
import path from "path";
import { print, spinnerPrint } from "@/cli/printer.ts";
import { buildFFmpegDownloadUrl } from "@/constants.ts";
import type { UpdateWorkflow } from "@/workflow/model/workflow.ts";
import chalk from "chalk";
import {
  archiveOldVersion,
  cleanup,
  deleteOldVersion,
  downloadNewVersion,
  extractAndMove,
  getFFmpegDirPath,
  getFFmpegExecutablePath,
  getLocalFFmpegVersion,
  getRemoteFFmpegVersion,
  isVersionOutdated,
} from "./util.ts";

function runUpdate(workflow: UpdateWorkflow) {
  const opts = workflow.options;

  if (process.platform !== "win32") {
    throw new Error(
      "The update feature is currently only supported on Windows.",
    );
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
        throw new Error(`Error checking FFmpeg version: ${error}`, {
          cause: error,
        });
      }
    },
  );

  try {
    if (!isVersionOutdated(localVersion, remoteVersion)) {
      print(chalk.green("FFmpeg is up to date."));
      print(`Current version: '${localVersion}'`);
      return;
    } else {
      print(chalk.yellow.bold("Update available!"));
      print(`Upgradable from '${localVersion}' to '${remoteVersion}'`);
    }
  } catch (error) {
    throw new Error(`Error comparing versions: ${error}`, { cause: error });
  }

  if (opts.checkOnly) return;

  print(`Starting update from '${localVersion}' to '${remoteVersion}'`);

  if (opts.disableArchive) {
    spinnerPrint("Deleting existing FFmpeg installation...", () => {
      try {
        deleteOldVersion(ffmpegDirPath);
      } catch (error) {
        throw new Error(
          `Failed to delete existing FFmpeg installation: ${error}`,
          {
            cause: error,
          },
        );
      }
      print("Existing FFmpeg installation deleted.");
    });
  } else {
    spinnerPrint("Archiving existing FFmpeg installation...", () => {
      try {
        archiveOldVersion(ffmpegDirPath, localVersion);
      } catch (error) {
        throw new Error(
          `Failed to archive existing FFmpeg installation: ${error}`,
          { cause: error },
        );
      }
      print("Existing FFmpeg installation archived.");
    });
  }

  const archiveDir = os.tmpdir();
  const archivePath = path.join(archiveDir, `ffmpeg-${remoteVersion}.7z`);
  const extractionPath = path.join(archiveDir, "extracted");

  spinnerPrint("Downloading new FFmpeg version...", () => {
    try {
      downloadNewVersion(buildFFmpegDownloadUrl(remoteVersion), archivePath);
    } catch (error) {
      throw new Error(`Failed to download new FFmpeg version: ${error}`, {
        cause: error,
      });
    }
  });

  spinnerPrint("Setting up the new version...", () => {
    try {
      extractAndMove(archivePath, extractionPath, ffmpegDirPath);
    } catch (error) {
      throw new Error(`Failed to set up the new FFmpeg version: ${error}`, {
        cause: error,
      });
    } finally {
      cleanup([archivePath, extractionPath]);
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
