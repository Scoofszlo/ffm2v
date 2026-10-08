import { describe, expect, it } from "vitest";
import { WorkflowSchema } from "../../../src/workflow/model/workflow.ts";

const parseWorkflow = (workflow: unknown) => WorkflowSchema.parse(workflow);

describe("WorkflowSchema", () => {
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
        type: "encode",
        options: {
          input: "video.mp4",
          output: null,
          videoCodec: "libx265",
          crf: 0,
          resolution: { width: 1920, height: 1080 },
          disableAudio: false,
          allowAutoRotate: false,
        },
      });
    });

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
        type: "merge",
        options: {
          input: ["first.mp4", "second.mp4"],
          output: null,
          videoCodec: "libx265",
          crf: 23,
          disableAudio: false,
          allowAutoRotate: false,
        },
      });
    });
  });

  describe("update", () => {
    it("applies defaults for update options", () => {
      expect(parseWorkflow({ type: "update", options: {} })).toEqual({
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
        type: "update",
        options: { disableArchive: true, checkOnly: true },
      });
    });
  });
});
