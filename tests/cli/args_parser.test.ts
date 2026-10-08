import { describe, expect, it } from "vitest";
import { ArgsParser } from "../../src/cli/args_parser.ts";

const parseArgs = (args: string[]) => {
  return new ArgsParser().parseArgs(["node", "ffm2v", ...args]);
};

describe("ArgsParser", () => {
  it("parses encode input and applies common-option defaults", () => {
    expect(parseArgs(["encode", "--input", "video.mp4"])).toEqual({
      type: "encode",
      options: {
        input: "video.mp4",
        output: null,
        videoCodec: "libx265",
        crf: 23,
        resolution: null,
        disableAudio: false,
        allowAutoRotate: false,
      },
    });
  });

  it("parses encode option values without applying workflow validation", () => {
    expect(
      parseArgs([
        "encode",
        "-i",
        "video.mp4",
        "-o",
        "encoded",
        "--vc",
        "libx264",
        "--crf",
        "99",
        "--resolution",
        "invalid-resolution",
        "--disable-audio",
        "--allow-auto-rotate",
      ]),
    ).toEqual({
      type: "encode",
      options: {
        input: "video.mp4",
        output: "encoded",
        videoCodec: "libx264",
        crf: "99",
        resolution: "invalid-resolution",
        disableAudio: true,
        allowAutoRotate: true,
      },
    });
  });

  it("parses multiple merge inputs and its supported common options", () => {
    expect(
      parseArgs([
        "merge",
        "-i",
        "first.mp4",
        "second.mp4",
        "--output",
        "merged",
        "--video-codec",
        "libx265",
        "--crf",
        "51",
        "--disable-audio",
        "--allow-auto-rotate",
      ]),
    ).toEqual({
      type: "merge",
      options: {
        input: ["first.mp4", "second.mp4"],
        output: "merged",
        videoCodec: "libx265",
        crf: "51",
        disableAudio: true,
        allowAutoRotate: true,
      },
    });
  });

  it.each([
    { args: [], expected: { disableArchive: false, checkOnly: false } },
    {
      args: ["--disable-archive"],
      expected: { disableArchive: true, checkOnly: false },
    },
    { args: ["-c"], expected: { disableArchive: false, checkOnly: true } },
    {
      args: ["--disable-archive", "--check-only"],
      expected: { disableArchive: true, checkOnly: true },
    },
  ])("parses update-ffmpeg $args", ({ args, expected }) => {
    expect(parseArgs(["update-ffmpeg", ...args])).toEqual({
      type: "update",
      options: expected,
    });
  });
});
