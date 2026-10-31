import type { EncodeWorkflowOpts } from "./workflow.ts";

export class Video2xArgs {
  opts: EncodeWorkflowOpts;

  constructor(options: EncodeWorkflowOpts) {
    this.opts = options;
  }

  get videoCodec() {
    return ["-c", this.opts.videoCodec];
  }

  get crf() {
    return this.buildExtraEncoderOption("crf", this.opts.crf.toString());
  }

  get fpsMultiplier() {
    if (!this.opts.fpsMultiplier) {
      throw new Error(
        "FPS multiplier must be specified when using video2x interpolation.",
      );
    }
    return ["-m", this.opts.fpsMultiplier.toString()];
  }

  get vulkanDeviceId() {
    if (!this.opts.vulkanDeviceId) {
      // If nothing is specified, we will let video2x choose the default device.
      return [];
    }
    return ["-d", this.opts.vulkanDeviceId.toString()];
  }

  private buildExtraEncoderOption<T>(key: string, value: T): string[] {
    return ["-e", `${key}=${value}`];
  }
}
