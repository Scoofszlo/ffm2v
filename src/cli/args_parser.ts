import { APP_VERSION } from "@/constants.ts";
import { Command } from "commander";
import { applyCommonOptions } from "./commands.ts";
import { print } from "./printer.ts";

type ParsedOptions = {
  options: [x: unknown];
};

class ArgsParser {
  program: Command;
  parseCommand: string | null = null;
  parsedOptions: ParsedOptions | null = null;

  constructor() {
    this.program = new Command();

    // Configure custom error output to remove the "error:" prefix and
    // trim whitespace
    this.program.configureOutput({
      writeErr: (str) =>
        print(str.replace(/^error:\s*/, "").trimEnd(), "error"),
    });

    // Generate program introduction and version
    this.program
      .name("ffm2v")
      .description(
        "A personalized FFmpeg tool for converting video files to H.265 with easy-to-run commands.",
      )
      .version(APP_VERSION);

    // Define 'encode' command with options and validation
    applyCommonOptions(
      this.program
        .command("encode")
        .description("Encode a video file")
        .option("-i, --input <file>", "Input video file"),
    ).action((options) => {
      this.parseCommand = "encode";
      this.parsedOptions = options;
    });

    // Define 'merge' command with options and validation
    applyCommonOptions(
      this.program
        .command("merge")
        .description("Merge multiple video files")
        .option("-i, --input <file...>", "Input video files"),
    ).action((options) => {
      this.parseCommand = "merge";
      this.parsedOptions = options;
    });

    // Define 'update' command with options
    this.program
      .command("update-ffmpeg")
      .description("Update locally installed FFmpeg to the latest version")
      .option(
        "--disable-archive",
        "Deletes the installed FFmpeg instead of moving it to the archive folder",
        false,
      )
      .option(
        "-c, --check-only",
        "Only check for updates without performing the update",
        false,
      )
      .action((options) => {
        this.parseCommand = "update";
        this.parsedOptions = options;
      });
  }

  parseArgs() {
    try {
      this.program.parse(process.argv);
      return {
        type: this.parseCommand,
        options: this.parsedOptions,
      };
    } catch (error) {
      print(`Error parsing arguments: ${error}`, "error");
      process.exit(1);
    }
  }
}

const argsParser = new ArgsParser();

export { argsParser };
