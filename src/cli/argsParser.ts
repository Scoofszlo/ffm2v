import { APP_VERSION } from "@/constants.ts";
import { Command, Option } from "commander";
import { createEncodeCommand } from "./commands/encode.ts";
import { createMergeCommand } from "./commands/merge.ts";
import { createUpdateFFmpegCommand } from "./commands/updateFFmpeg.ts";
import { print } from "./printer.ts";

type ParsedOptions = Record<string, unknown>;

export class ArgsParser {
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

    // Add help option with custom help group
    this.program.addHelpOption(
      new Option("-h, --help", "Display help information").helpGroup(
        "General Options:",
      ),
    );

    // Add version option and handle its action
    this.program.addOption(
      new Option("-v, --version", "Display app version").helpGroup(
        "General Options:",
      ),
    );
    this.program.on("option:version", () => {
      console.log(APP_VERSION);
      process.exit(0);
    });

    // Generate program introduction and version
    this.program
      .name("ffm2v")
      .description(
        "A personalized FFmpeg tool for converting video files to H.265 with easy-to-run commands.",
      );

    // Define 'encode' command with options
    createEncodeCommand(this.program).action((options) => {
      this.parseCommand = "encode";
      this.parsedOptions = options;
    });

    // Define 'merge' command with options
    createMergeCommand(this.program).action((options) => {
      this.parseCommand = "merge";
      this.parsedOptions = options;
    });

    // Define 'update' command with options
    createUpdateFFmpegCommand(this.program).action((options) => {
      this.parseCommand = "update";
      this.parsedOptions = options;
    });
  }

  parseArgs(argv: string[] = process.argv) {
    try {
      this.program.parse(argv);
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
