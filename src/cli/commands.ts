import { Option, type Command } from "commander";

const optionFactory = <TDefaultValue>(
  name: string,
  flags: string,
  description: string,
  defaultValue: TDefaultValue | undefined = undefined,
) => {
  return {
    name,
    flags,
    description,
    defaultValue,
  };
};

export const commonOptions = [
  optionFactory("output", "-o, --output <dir>", "Output video directory", null),
  optionFactory(
    "videoCodec",
    "--vc, --video-codec <codec>",
    "Video codec to use",
    "libx265",
  ),
  optionFactory("crf", "--crf <number>", "Constant rate factor", 23),
  optionFactory(
    "resolution",
    "--resolution <width:height>",
    "Output video resolution",
    null,
  ),
  optionFactory(
    "disableAudio",
    "--disable-audio",
    "Disable audio in the output video",
    false,
  ),
  optionFactory(
    "allowAutoRotate",
    "--allow-auto-rotate",
    "Allow automatic rotation based on metadata",
    false,
  ),
];

export function applyCommonOptions(
  commandObj: Command,
  skipOptions: string[] = [],
): Command {
  commonOptions.forEach((option) => {
    if (skipOptions.includes(option.name)) {
      return;
    }

    const commandOption = new Option(option.flags, option.description);

    if (option.defaultValue !== undefined) {
      commandOption.default(option.defaultValue);
    }

    commandObj.addOption(commandOption);
  });

  return commandObj;
}
