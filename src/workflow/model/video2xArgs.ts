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

  private buildExtraEncoderOption<T>(key: string, value: T): string[] {
    return ["-e", `${key}=${value}`];
  }
}
