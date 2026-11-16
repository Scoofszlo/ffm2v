import type {
  EncodeWorkflowOpts,
  MergeWorkflowOpts,
} from "@/workflow/model/workflow";

/**
 * Derives FFmpeg CLI flag fragments from the validated user options. Each
 * getter returns the flags to append to the FFmpeg argument array. The
 * `encoder` and `crf` getters are shared by the encode and merge tasks,
 * while the audio and rotation getters are task-specific.
 */
class FFmpegArgs {
  opts: EncodeWorkflowOpts | MergeWorkflowOpts;

  constructor(options: EncodeWorkflowOpts | MergeWorkflowOpts) {
    this.opts = options;
  }

  /**
   * FFmpeg encoder flags. `encoder` is the FFmpeg encoder name derived from the
   * user's codec choice, e.g. `libx265` for `h265`.
   */
  get encoder() {
    return ["-c:v", this.opts.encoder];
  }

  get crf() {
    return ["-crf", this.opts.crf.toString()];
  }

  /**
   * Audio flags: `-an` when audio is disabled, otherwise a stream copy.
   */
  get audioArgs() {
    if (this.opts.disableAudio) {
      return ["-an"];
    }

    return ["-c:a", "copy"];
  }

  get keepRotationMetadata() {
    if ("keepRotationMetadata" in this.opts && this.opts.keepRotationMetadata) {
      return ["-noautorotate"];
    }
    return [];
  }
}

export { FFmpegArgs };
