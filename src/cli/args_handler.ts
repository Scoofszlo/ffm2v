import { Command } from "commander";
import { APP_VERSION } from "../constants.ts";
import { applyCommonOptions } from "./common_options.ts";
import { print } from "./printer.ts";
import type {
  EncodeOptions,
  MergeOptions,
  ParsedArgs,
  UpdateOptions,
} from "./types.ts";

class ArgsHandler {
  program: Command;
  private parsedArgs: ParsedArgs | null = null;

  constructor() {
    this.program = new Command();

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
    applyCommonOptions({
      cmdObj: this.program
        .command("encode")
        .description("Encode a video file")
        .option("-i, --input <file>", "Input video file"),
    }).action((options: EncodeOptions) => {
      if (!options.input) {
        print("Input file must be specified.", "error");
        process.exit(1);
      } else if (options.input === options.output) {
        print("Input and output files cannot be the same.", "error");
        process.exit(1);
      }
      this.parsedArgs = {
        command: "encode",
        options,
      };
    });

    // Define 'merge' command with options and validation
    applyCommonOptions({
      cmdObj: this.program
        .command("merge")
        .description("Merge multiple video files")
        .option("-i, --input <file...>", "Input video files"),
      skipOptions: ["resolution"],
    }).action((options: MergeOptions) => {
      if (!options.input || options.input.length === 0) {
        print("Error: Input file/s must be specified.", "error");
        process.exit(1);
      }
      this.parsedArgs = {
        command: "merge",
        options,
      };
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
      .action((options: UpdateOptions) => {
        this.parsedArgs = {
          command: "update",
          options,
        };
      });
  }

  // Parse the command-line arguments and return the structured result
  parse(args: string[]) {
    try {
      this.program.parse(args);
    } catch (error) {
      if (error instanceof Error) {
        print(`${error.message}`, "error");
      } else {
        print("An unknown error occurred while parsing arguments.", "error");
      }
      process.exit(1);
    }
    return this.parsedArgs;
  }
}

export { ArgsHandler };
