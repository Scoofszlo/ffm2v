import { Command, Option } from "commander";
import {
  commonEncodingOpts,
  commonGeneralOpts,
  commonInterpolationOpts,
} from "./common";

const generalOpts = [
  () => new Option("-i, --input <file...>", "Input video files"),
  ...commonGeneralOpts,
];

const encodingOpts = [...commonEncodingOpts];

const withEncodingOpts = (cmd: Command) => {
  generalOpts.forEach((opt) =>
    cmd.addOption(opt().helpGroup("General Options:")),
  );
  encodingOpts.forEach((opt) =>
    cmd.addOption(opt().helpGroup("Encoding Options:")),
  );
  commonInterpolationOpts.forEach((opt) =>
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
