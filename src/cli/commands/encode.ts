import { Command, Option } from "commander";
import { commonEncodingOpts, commonGeneralOpts } from "./common.ts";

const generalOpts = [
  () => new Option("-i, --input <file>", "Input video file"),
  ...commonGeneralOpts,
] as const;

const encodingOpts = [
  () =>
    new Option(
      "--resolution <width:height>",
      "Output video resolution (e.g., 1920:1080)",
    ).default(null),
  ...commonEncodingOpts,
  () =>
    new Option(
      "--keep-rotation-metadata",
      "Keep the input video's rotation metadata instead of baking rotation into the pixels",
    ).default(false),
] as const;

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

export const createEncodeCommand = (cmd: Command) => {
  return withEncodingOpts(
    cmd.command("encode").description("Encode a video file"),
  );
};
