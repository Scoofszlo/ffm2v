import { Command, Option } from "commander";
import type { VideoCodecs } from "../types.ts";
import type { CLIOptions, CommonCLIOption } from "./types.ts";

const SCALE_REGEX = /^(-2|-1|[1-9][0-9]*):(-2|-1|[1-9][0-9]*)$/;
const VALID_VIDEO_CODECS: VideoCodecs[] = ["libx265"];

function applyCommonOptions({
  cmdObj,
  skipOptions = [],
}: {
  cmdObj: Command;
  skipOptions?: (keyof CLIOptions)[];
}): Command {
  options.forEach((opt) => {
    if (!skipOptions.includes(opt.name)) {
      cmdObj.addOption(generateOption(opt));
    }
  });
  return cmdObj;
}
const options = createOptions([
  {
    name: "output",
    options: {
      flags: "-o, --output <dir>",
      description: "Output video directory",
      default: null,
    },
  },
  {
    name: "videoCodec",
    options: {
      flags: "--vc, --video-codec <codec>",
      description: "Video codec to use",
      default: "libx265",
      choices: VALID_VIDEO_CODECS,
    },
  },
  {
    name: "crf",
    options: {
      flags: "--crf <number>",
      description:
        "Constant Rate Factor (CRF) for encoding quality (lower is better)",
      default: 18,
    },
  },
  {
    name: "resolution",
    options: {
      flags: "--resolution <width:height>",
      description: "Output resolution (e.g., 1920:1080, -2:1080, 1920:-2)",
      default: null,
    },
    validation: (value: string) => {
      const match = value.match(SCALE_REGEX);
      if (!match) {
        throw new Error(
          "Resolution must be in the format 'width height' (e.g., 1920:1080, -2:1080, 1920:-2)",
        );
      }
      const [width, height] = value.split(":").map(Number);
      if (width === undefined || height === undefined) {
        throw new Error("Resolution must be in the format 'width height'");
      }
      if (isNaN(width) || isNaN(height)) {
        throw new Error("Invalid resolution format");
      }
      return { width, height };
    },
  },
  {
    name: "disableAudio",
    options: {
      flags: "--disable-audio",
      description: "Disable audio in the output video",
      default: false,
    },
  },
  {
    name: "allowAutoRotate",
    options: {
      flags: "--allow-auto-rotate",
      description: "Allow automatic rotation based on metadata",
      default: false,
    },
  },
]);

// A helper function to create typed options array
function createOptions<K extends keyof CLIOptions>(
  opts: CommonCLIOption<K>[],
): CommonCLIOption<K>[] {
  return opts;
}

function generateOption(opt: CommonCLIOption<keyof CLIOptions>): Option {
  const { options: optConfig, validation } = opt;
  const option = new Option(optConfig.flags, optConfig.description);
  if (optConfig.default !== undefined) {
    option.default(optConfig.default);
  }
  if (optConfig.choices) {
    option.choices(optConfig.choices);
  }
  if (validation) {
    option.argParser(validation);
  }
  return option;
};

export { applyCommonOptions };
