import { Command, Option } from "commander";
import { commonEncodingOpts, commonGeneralOpts } from "./common.ts";

const generalOpts = [
  () => new Option("-i, --input <file...>", "Input video files"),
  ...commonGeneralOpts,
];

const encodingOpts = [...commonEncodingOpts];

const withGeneralOpts = (cmd: Command) => {
  generalOpts.forEach((opt) =>
    cmd.addOption(opt().helpGroup("General Options")),
  );
  return cmd;
};

const withEncodingOpts = (cmd: Command) => {
  withGeneralOpts(cmd);
  encodingOpts.forEach((opt) =>
    cmd.addOption(opt().helpGroup("Encoding Options")),
  );
  return cmd;
};

export const createMergeCommand = (cmd: Command) => {
  return withEncodingOpts(
    cmd.command("merge").description("Merge multiple video files"),
  );
};
