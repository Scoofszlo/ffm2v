import type { EncodeWorkflowOpts } from "./workflow.ts";

/**
 * Derives video2x CLI flag fragments from the validated encode options. Each
 * getter returns the flags to append to the video2x argument array.
 */
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

  /**
   * FPS multiplier flags. video2x requires a multiplier, so this throws if
   * none was validated.
   */
  get fpsMultiplier() {
    if (!this.opts.fpsMultiplier) {
      throw new Error(
        "FPS multiplier must be specified when using video2x interpolation.",
      );
    }
    return ["-m", this.opts.fpsMultiplier.toString()];
  }

  /**
   * Vulkan device flags, or an empty array when unset so video2x picks its
   * default device.
   */
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
