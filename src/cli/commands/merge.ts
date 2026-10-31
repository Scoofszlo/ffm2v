import { Command, Option } from "commander";
import { commonEncodingOpts, commonGeneralOpts } from "./common.ts";

const generalOpts = [
  () => new Option("-i, --input <file...>", "Input video files"),
  ...commonGeneralOpts,
];

const encodingOpts = [...commonEncodingOpts];

const interpolationOpts = [
  () =>
    new Option(
      "--interpolation-mode <mode>",
      "Mode to use for interpolation. Only minterpolate is supported for now.",
    )
      .choices(["minterpolate"])
      .default(null),
  () =>
    new Option(
      "--target-fps <fps>",
      "Interpolate the input video to the target frame rate.",
    ).default(null),
] as const;

const withEncodingOpts = (cmd: Command) => {
  generalOpts.forEach((opt) =>
    cmd.addOption(opt().helpGroup("General Options:")),
  );
  encodingOpts.forEach((opt) =>
    cmd.addOption(opt().helpGroup("Encoding Options:")),
  );
  interpolationOpts.forEach((opt) =>
    cmd.addOption(opt().helpGroup("Interpolation Options:")),
  );
  return cmd;
};

/**
 * Creates the `merge` command with its general and encoding options.
 *
 * @param cmd - Program or parent command to attach the command to.
 * @returns The configured `merge` command.
 */
export const createMergeCommand = (cmd: Command) => {
  return withEncodingOpts(
    cmd.command("merge").description("Merge multiple video files"),
  );
};
