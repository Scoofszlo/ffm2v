export type VideoCodecs = "libx265";

export type Params = {
  videoCodec: VideoCodecs;
  crf: number;
  resolution: {
    width: number;
    height: number;
  } | null;
  disableAudio: boolean;
  allowAutoRotate: boolean;
};
