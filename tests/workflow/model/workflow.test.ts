import { describe, expect, it } from "vitest";
import { WorkflowSchema } from "../../../src/workflow/model/workflow.ts";

// tmpDir is created at runtime by the CLI entry, so tests pass a fixed string
// instead of touching the filesystem.
const TEST_TMP_DIR = "ffm2v-test-tmp";

const parseWorkflow = (workflow: Record<string, unknown>) =>
  WorkflowSchema.parse({ tmpDir: TEST_TMP_DIR, ...workflow });

describe("WorkflowSchema", () => {
  describe("tmpDir", () => {
    it("rejects an empty tmpDir", () => {
      expect(() =>
        WorkflowSchema.parse({
          tmpDir: "",
          type: "update",
          options: {},
        }),
      ).toThrow("Temporary directory must be specified");
    });
  });

  describe("encode", () => {
    it("applies defaults and normalizes valid option values", () => {
      expect(
        parseWorkflow({
          type: "encode",
          options: {
            input: "video.mp4",
            output: null,
            crf: "0",
            resolution: "1920:1080",
          },
        }),
      ).toEqual({
        tmpDir: TEST_TMP_DIR,
        type: "encode",
        options: {
          input: "video.mp4",
          output: null,
          videoCodec: "libx265",
          crf: 0,
          resolution: { width: 1920, height: 1080 },
          disableAudio: false,
          keepRotationMetadata: false,
          interpolationMode: null,
          targetFps: null,
          fpsMultiplier: null,
          vulkanDeviceId: null,
          video2xPath: null,
          stabilize: null,
          ffmpegPath: null,
        },
      });
    });

    it.each([
      { keepRotationMetadata: true, expected: true },
      { keepRotationMetadata: false, expected: false },
    ])(
      "accepts the keepRotationMetadata option $keepRotationMetadata",
      ({ keepRotationMetadata, expected }) => {
        const workflow = parseWorkflow({
          type: "encode",
          options: { input: "video.mp4", output: null, keepRotationMetadata },
        });

        if (workflow.type !== "encode") {
          throw new Error("Expected the encode workflow");
        }

        expect(workflow.options.keepRotationMetadata).toEqual(expected);
      },
    );

    it.each([
      { resolution: "-2:1080", expected: { width: -2, height: 1080 } },
      { resolution: "1920:-2", expected: { width: 1920, height: -2 } },
      { resolution: "-1:1080", expected: { width: -1, height: 1080 } },
      { resolution: "1920:-1", expected: { width: 1920, height: -1 } },
      { resolution: "1920:1080", expected: { width: 1920, height: 1080 } },
    ])("accepts the resolution $resolution", ({ resolution, expected }) => {
      const workflow = parseWorkflow({
        type: "encode",
        options: { input: "video.mp4", output: null, resolution },
      });

      if (workflow.type !== "encode") {
        throw new Error("Expected the encode workflow");
      }

      expect(workflow.options.resolution).toEqual(expected);
    });

    it.each(["-1", "52", "12.5", "not-a-number"])(
      "rejects the invalid CRF value %s",
      (crf) => {
        expect(() =>
          parseWorkflow({
            type: "encode",
            options: { input: "video.mp4", output: null, crf },
          }),
        ).toThrow();
      },
    );

    it.each(["libx264", "h264"])(
      "rejects the unsupported codec %s",
      (videoCodec) => {
        expect(() =>
          parseWorkflow({
            type: "encode",
            options: { input: "video.mp4", output: null, videoCodec },
          }),
        ).toThrow();
      },
    );

    it.each(["1920x1080", "0:1080", "1920:0", "-3:1080"])(
      "rejects the invalid resolution %s",
      (resolution) => {
        expect(() =>
          parseWorkflow({
            type: "encode",
            options: { input: "video.mp4", output: null, resolution },
          }),
        ).toThrow();
      },
    );

    it("rejects an output that is the same as the input", () => {
      expect(() =>
        parseWorkflow({
          type: "encode",
          options: { input: "video.mp4", output: "video.mp4" },
        }),
      ).toThrow("Input and output files cannot be the same.");
    });
  });

  describe("merge", () => {
    it("accepts multiple inputs and applies common-option defaults", () => {
      expect(
        parseWorkflow({
          type: "merge",
          options: { input: ["first.mp4", "second.mp4"], output: null },
        }),
      ).toEqual({
        tmpDir: TEST_TMP_DIR,
        type: "merge",
        options: {
          input: ["first.mp4", "second.mp4"],
          output: null,
          videoCodec: "libx265",
          crf: 23,
          disableAudio: false,
          stabilize: null,
          ffmpegPath: null,
        },
      });
    });
  });

  describe("update", () => {
    it("applies defaults for update options", () => {
      expect(parseWorkflow({ type: "update", options: {} })).toEqual({
        tmpDir: TEST_TMP_DIR,
        type: "update",
        options: { disableArchive: false, checkOnly: false },
      });
    });

    it("accepts both update flags", () => {
      expect(
        parseWorkflow({
          type: "update",
          options: { disableArchive: true, checkOnly: true },
        }),
      ).toEqual({
        tmpDir: TEST_TMP_DIR,
        type: "update",
        options: { disableArchive: true, checkOnly: true },
      });
    });
  });
});
