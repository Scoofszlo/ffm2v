import type {
  EncodeWorkflowOpts,
  MergeWorkflowOpts,
} from "@/workflow/model/workflow.ts";

class FFmpegEncodingParams {
  opts: EncodeWorkflowOpts | MergeWorkflowOpts;

  constructor(params?: EncodeWorkflowOpts | MergeWorkflowOpts) {
    if (!params) {
      console.error("error: No parameters provided for FFmpeg encoding.");
      process.exit(1);
    }
    this.opts = params;
  }

  get videoCodec() {
    return ["-c:v", this.opts.videoCodec];
  }

  get crf() {
    return ["-crf", this.opts.crf.toString()];
  }

  get resolution() {
    if (this.opts.resolution) {
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

  get allowAutoRotate() {
    if (this.opts.allowAutoRotate) {
      return ["-noautorotate"];
    }
    return [];
  }
}

export { FFmpegEncodingParams };
