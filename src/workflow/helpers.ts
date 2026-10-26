import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { VIDEO_EXTENSIONS } from "@/constants.ts";
import which from "which";
import { MediaFile } from "./model/mediaFile.ts";

type SpawnSyncOptions = {
  stdio?: "pipe" | "ignore" | "inherit";
};

/**
 * Runs a command synchronously and returns its trimmed stdout, converting spawn
 * failures and non-zero exits into descriptive errors.
 */
export function runCommand(
  command: string,
  args: string[],
  options: SpawnSyncOptions = {},
): string {
  const result = spawnSync(command, args, { encoding: "utf-8", ...options });

  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(
      `${command} exited with code ${result.status}${stderr ? `: ${stderr}` : "."}`,
    );
  }

  // spawnSync may return result.stdout and result.stderr as null even if type
  // says the opposite so we need to handle that case and
  // return an empty string if stdout is null.
  return result.stdout?.trim() || "";
}

export function createMediaFile(filePath: string) {
  const sourceDir = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const isVideo = checkIsVideo(fileName);
  let hasAudio: boolean;
  let duration: number | null;
  if (isVideo) {
    duration = getVideoDuration(filePath);
    hasAudio = checkHasAudio(filePath);
  } else {
    duration = null;
    hasAudio = false;
  }
  const file = new MediaFile(sourceDir, fileName, isVideo, hasAudio, duration);

  return file;
}

export function checkIsVideo(filePath: string): boolean {
  return VIDEO_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

/**
 * Runs ffprobe with the given arguments (plus the target file) and returns its
 * trimmed stdout. Spawn failures such as a missing ffprobe binary and non-zero
 * exits are both reported with the target file, so callers never surface an
 * `undefined` stderr to the user.
 */
export function runFFprobe(args: string[], filePath: string): string {
  const result = spawnSync("ffprobe", ["-v", "error", ...args, filePath], {
    encoding: "utf-8",
  });

  if (result.error) {
    throw new Error(
      `Failed to run ffprobe for '${filePath}': ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(
      `ffprobe exited with code ${result.status} for '${filePath}'${stderr ? `: ${stderr}` : "."}`,
    );
  }

  return result.stdout.trim();
}

export function checkHasAudio(filePath: string): boolean {
  const output = runFFprobe(
    ["-show_streams", "-select_streams", "a", "-print_format", "json"],
    filePath,
  );
  const data = JSON.parse(output);
  return data.streams.length > 0;
}

export function getVideoDuration(filePath: string): number {
  const output = runFFprobe(
    [
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
    ],
    filePath,
  );
  const duration = parseFloat(output);
  if (isNaN(duration)) {
    throw new Error(`Invalid duration format for '${filePath}': ${output}`);
  }
  return duration;
}

/**
 * Returns the path to the ffmpeg executable. If a custom path is provided, it
 * will be resolved and returned. If no custom path is provided, "ffmpeg" will
 * be returned, which assumes that ffmpeg is in the system's PATH.
 */
export function resolveFFmpegExecutable(customPath: string | null): string {
  if (customPath) {
    try {
      const resolvedPath = which.sync(customPath);
      return resolvedPath;
    } catch (error) {
      const errorMsg = `Failed to resolve custom FFmpeg path '${customPath}'.`;
      throw new Error(errorMsg, { cause: error });
    }
  }

  return "ffmpeg";
}

/**
 * Escapes a path for use in FFmpeg filter options.
 *
 * Step 1: Resolve the path to an absolute path using `path.resolve()`. Step 2:
 * Replace backslashes (`\`) with forward slashes (`/`) for FFmpeg
 * compatibility. Step 3: Escape colons (`:`) and single quotes (`'`) by
 * prefixing them with a double backslash (`\\`).
 *
 * @param p The path to escape.
 * @returns The escaped path.
 */
export function escapeFilterPath(p: string): string {
  return path
    .resolve(p) // Resolve the path to an absolute path
    .replace(/\\/g, "/") // Replace backslashes with forward slashes for FFmpeg compatibility
    .replace(/[:']/g, (c) => `\\\\${c}`); // Escape colons and single quotes by prefixing them with a double backslash
}

export function moveFile({
  src,
  dest,
  onSuccess,
  onExists,
  onFailure,
}: {
  src: string;
  dest: string;
  onSuccess?: () => void;
  onExists?: () => void;
  onFailure?: (error: unknown) => void;
}) {
  try {
    if (fs.existsSync(dest)) {
      onExists?.();
      return;
    }

    fs.renameSync(src, dest);
    onSuccess?.();
  } catch (error) {
    onFailure?.(error);
  }
}
