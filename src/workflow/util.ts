import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { VIDEO_EXTENSIONS } from "@/constants.ts";
import { checkHasAudio, getVideoDuration } from "@/probe/index.ts";
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

/**
 * Creates a `MediaFile` for the given path. For videos, duration and audio
 * presence are read with ffprobe; other files are marked as non-video with no
 * duration.
 * @param filePath - The path to the file.
 * @returns The populated media file.
 * @throws Will throw an error if ffprobe fails while reading video metadata.
 */
export function createMediaFile(filePath: string) {
  const sourceDir = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const isVideo = hasVideoExtension(fileName);
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

/**
 * Checks whether a path has a supported video file extension.
 * @param filePath - The path to check.
 * @returns `true` if the extension is in `VIDEO_EXTENSIONS`, ignoring case.
 */
export function hasVideoExtension(filePath: string): boolean {
  return VIDEO_EXTENSIONS.includes(path.extname(filePath).toLowerCase());
}

/**
 * Resolves the executable path for a program. If a custom path is provided, it
 * is resolved with `which`; otherwise the bare program name is returned so the
 * executable is looked up on the system PATH.
 * @param programName - The program name, also used in error messages.
 * @param customPath - The custom executable path, or `null` to use PATH.
 * @returns The resolved executable path, or `programName` when no custom path
 * is given.
 * @throws Error if `customPath` cannot be resolved.
 */
export function resolveProgramExecutable(
  programName: string,
  customPath: string | null,
): string {
  if (customPath) {
    try {
      const resolvedPath = which.sync(customPath);
      return resolvedPath;
    } catch (error) {
      const errorMsg = `Failed to resolve custom path for '${programName}' executable '${customPath}'.`;
      throw new Error(errorMsg, { cause: error });
    }
  }

  return programName;
}

/**
 * Moves a file, invoking exactly one callback based on the outcome: the
 * destination already exists, the move succeeds, or the move fails.
 * @param options - The move options.
 * @param options.src - The path to move from.
 * @param options.dest - The path to move to.
 * @param options.onSuccess - Called after a successful move.
 * @param options.onExists - Called when `dest` already exists, in which case
 * the file is not moved.
 * @param options.onFailure - Called with the error if the move throws.
 */
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

/**
 * Verifies that every given program is available on the system PATH.
 * @param deps - The program names to check for.
 * @throws Error listing every missing program, so the user knows what to
 * install or add to PATH.
 */
export function checkDeps(deps: string[]) {
  const missingDeps = new Set<string>();

  for (const programName of deps) {
    try {
      which.sync(programName);
    } catch {
      missingDeps.add(programName);
    }
  }

  if (missingDeps.size > 0) {
    throw new Error(
      `Missing dependencies: ${Array.from(missingDeps).join(", ")}. Please install them and ensure they are in your PATH.`,
    );
  }
}
