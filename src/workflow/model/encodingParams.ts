import type {
  EncodeWorkflowOpts,
  MergeWorkflowOpts,
} from "@/workflow/model/workflow.ts";

class FFmpegEncodingParams {
  opts: EncodeWorkflowOpts | MergeWorkflowOpts;

  constructor(params: EncodeWorkflowOpts | MergeWorkflowOpts) {
    this.opts = params;
  }

  get videoCodec() {
    return ["-c:v", this.opts.videoCodec];
  }

  get crf() {
    return ["-crf", this.opts.crf.toString()];
  }

  get resolution() {
    if ("resolution" in this.opts && this.opts.resolution) {
      const { width, height } = this.opts.resolution;
      return ["-vf", `scale=${width}:${height}`];
    }
    return [];
  }

  get disableAudio() {
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

export { FFmpegEncodingParams };
