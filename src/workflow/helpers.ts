import { spawnSync } from "child_process";
import path from "path";
import { VIDEO_EXTENSIONS } from "../constants.ts";
import { FileEntry } from "./model/fileEntry.ts";

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
  description: string,
  options: SpawnSyncOptions = {},
): string {
  const result = spawnSync(command, args, { encoding: "utf-8", ...options });

  if (result.error) {
    throw new Error(`Failed to run ${description}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    throw new Error(
      `${description} exited with code ${result.status}${stderr ? `: ${stderr}` : "."}`,
    );
  }

  // spawnSync may return result.stdout and result.stderr as null even if type
  // says the opposite so we need to handle that case and
  // return an empty string if stdout is null.
  return result.stdout?.trim() || "";
}

export function createFileEntry(filePath: string) {
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
  const file = new FileEntry(sourceDir, fileName, isVideo, hasAudio, duration);

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
