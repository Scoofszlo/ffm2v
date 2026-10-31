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
