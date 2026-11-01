import { spawn, spawnSync } from "child_process";
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

/**
 * One of the standard channels of a spawned command: `pipe` exposes it as a
 * stream on the child process, `inherit` reuses our own channel (the terminal),
 * and `ignore` discards it.
 */
export type StdioOption = "ignore" | "pipe" | "inherit";

/**
 * A command and the stdio wiring to give it when it is spawned.
 */
export type PipedCommand = {
  command: string;
  args: string[];
  stdio: StdioOption[];
};

/**
 * The outcome of one command in a two-command pipeline: the exit status (or
 * `null` when the process was killed) and the spawn error when it could not be
 * started.
 */
export type PipedCommandResult = {
  status: number | null;
  error: string | null;
};

/**
 * Runs two commands concurrently, piping the first command's stdout straight
 * into the second command's stdin, and resolves once both have exited. Neither
 * command waits for the other to finish: data is copied chunk by chunk, and
 * back-pressure from the consumer pauses the producer.
 *
 * The pipe is only wired when the first command's stdout and the second
 * command's stdin are both `pipe` channels. Spawn failures are reported in the
 * result rather than thrown, and the other command is killed so it cannot hang
 * waiting for a stream that will never be closed. The first command is also
 * stopped when the second one dies before consuming everything, since it would
 * otherwise block writing to a pipe nobody reads.
 * @param first - The command whose stdout is piped onward.
 * @param second - The command whose stdin receives the piped output.
 * @returns A promise with the exit status or spawn error of each command.
 */
export function runPipedCommands(
  first: PipedCommand,
  second: PipedCommand,
): Promise<{ first: PipedCommandResult; second: PipedCommandResult }> {
  return new Promise((resolve) => {
    // Start both commands right away. spawn does not wait for the first one to
    // finish: both run at the same time, and we connect their streams below.
    //
    // `stdio` picks where each channel goes. "pipe" hands us a JS stream
    // (child.stdout / child.stdin), "inherit" sends it to our terminal, and
    // "ignore" throws it away.
    const firstProcess = spawn(first.command, first.args, {
      stdio: first.stdio,
    });
    const secondProcess = spawn(second.command, second.args, {
      stdio: second.stdio,
    });

    // Collect the outcome of each command here. Errors are stored instead of
    // thrown so the caller can print a friendly message and keep going.
    const firstResult: PipedCommandResult = { status: null, error: null };
    const secondResult: PipedCommandResult = { status: null, error: null };

    // "close" events can arrive in any order, so remember which command is
    // finished and only resolve once both are done.
    let firstDone = false;
    let secondDone = false;

    // If either command fails to start, the other one has nobody to talk to and
    // could wait forever, so stop both.
    const stopBoth = () => {
      firstProcess.kill();
      secondProcess.kill();
    };

    // Called from every handler below. The guard makes extra calls harmless:
    // it only resolves once both commands have reported back.
    const finish = () => {
      if (!(firstDone && secondDone)) return;
      resolve({ first: firstResult, second: secondResult });
    };

    // "error" fires when the process could not be started at all (e.g. the
    // executable does not exist). There is no usable exit code in that case.
    firstProcess.on("error", (error) => {
      firstResult.error ??= `${first.command}: ${error.message}`;
      firstDone = true;
      stopBoth();
      finish();
    });
    // "close" fires when the process has exited and its streams are closed.
    // `code` is the exit status, or null when the process was killed.
    firstProcess.on("close", (code) => {
      firstResult.status = code;
      firstDone = true;
      finish();
    });

    // Same two events for the second command.
    secondProcess.on("error", (error) => {
      secondResult.error ??= `${second.command}: ${error.message}`;
      secondDone = true;
      stopBoth();
      finish();
    });
    secondProcess.on("close", (code) => {
      secondResult.status = code;
      secondDone = true;
      finish();
    });

    // The data travels through these two streams: everything the first command
    // writes to its stdout, and everything the second command reads from its
    // stdin. They only exist when the caller used "pipe" for those channels.
    const firstStdout = firstProcess.stdout;
    const secondStdin = secondProcess.stdin;

    if (!firstStdout || !secondStdin) {
      // The caller asked for a pipe but forgot to configure that channel as
      // "pipe", so there is nothing to connect. Report the mistake instead of
      // hanging around waiting for data that can never flow.
      const command = firstStdout ? second.command : first.command;
      const result = firstStdout ? secondResult : firstResult;
      result.error ??= `${command}: stdio was not configured as a pipe.`;
      stopBoth();
      firstDone = true;
      secondDone = true;
      finish();
      return;
    }

    // pipe() copies bytes as they arrive: firstStdout (what FFmpeg writes) is
    // written into secondStdin (what video2x reads), chunk by chunk. It pauses
    // the reading side when the writing side is full so memory stays bounded,
    // and it ends secondStdin when firstStdout ends, which is how the second
    // command learns that the input is complete.
    //
    // If the second command dies early (bad device, GPU crash, user abort), its
    // end of the pipe is closed and the next write fails with EPIPE. Node treats
    // an unhandled "error" event as fatal, and the first command would then
    // block forever writing into a pipe nobody reads. So listen for it and kill
    // the producer; the exit statuses already explain what happened.
    secondStdin.on("error", () => {
      firstProcess.kill();
    });
    firstStdout.pipe(secondStdin);
  });
}
