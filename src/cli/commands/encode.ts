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

const interpolationOpts = [
  () =>
    new Option("--interpolation-mode <mode>", "Mode to use for interpolation")
      .choices(["minterpolate", "video2x"])
      .default(null),
  () =>
    new Option(
      "--target-fps <fps>",
      "Interpolate the input video to the target frame rate. Only works for minterpolate mode",
    ).default(null),
  () =>
    new Option(
      "--fps-multiplier <number>",
      "Multiply the input video's frame rate by this factor. Only works for video2x mode",
    ).default(null),
  () =>
    new Option(
      "--vulkan-device-id <number>",
      "The Vulkan device ID to use for video2x. To get the available IDs, run `video2x -l` in the terminal and get the device ID of your choice that will be used for interpolation. This is recommended to set so that appropriate GPU will be selected for faster interpolation. Only works for video2x mode",
    ).default(null),
  () =>
    new Option(
      "--video2x-path <path>",
      "Path to the video2x executable. Only works for video2x mode",
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
 * Creates the `encode` command with its general and encoding options.
 *
 * @param cmd - Program or parent command to attach the command to.
 * @returns The configured `encode` command.
 */
export const createEncodeCommand = (cmd: Command) => {
  return withEncodingOpts(
    cmd.command("encode").description("Encode a video file"),
  );
};
