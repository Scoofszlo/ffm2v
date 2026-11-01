import { Option } from "commander";

export const commonGeneralOpts = [
  () =>
    new Option("-o, --output <dir>", "Output video directory").default(null),
  () =>
    new Option(
      "--ffmpeg-path <path>",
      "Custom path to the FFmpeg executable",
    ).default(null),
] as const;

export const commonEncodingOpts = [
  () =>
    new Option(
      "--vc, --video-codec <codec>",
      "Video codec to use for encoding",
    ).default("libx265"),
  () => new Option("--crf <number>", "Constant rate factor").default(23),
  () =>
    new Option(
      "--stabilize <strength>",
      "Stabilize the input video from 1 to 5 (1 = weakest, 5 = strongest)",
    ).default(null),
  () =>
    new Option("--disable-audio", "Disable audio in the output video").default(
      false,
    ),
] as const;

export const commonInterpolationOpts = [
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
