import type { Command } from "commander";

export const createUpdateFFmpegCommand = (cmd: Command) => {
  return cmd
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
    );
};
