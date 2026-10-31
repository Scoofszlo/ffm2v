import { Command, Option } from "commander";
import { commonEncodingOpts, commonGeneralOpts } from "./common.ts";

const generalOpts = [
  () => new Option("-i, --input <file...>", "Input video files"),
  ...commonGeneralOpts,
];

const encodingOpts = [...commonEncodingOpts];

const withGeneralOpts = (cmd: Command) => {
  generalOpts.forEach((opt) =>
    cmd.addOption(opt().helpGroup("General Options:")),
  );
  return cmd;
};

const withEncodingOpts = (cmd: Command) => {
  withGeneralOpts(cmd);
  encodingOpts.forEach((opt) =>
    cmd.addOption(opt().helpGroup("Encoding Options:")),
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
