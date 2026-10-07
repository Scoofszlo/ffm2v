import type { MergeOptions } from "../../cli/types.ts";
import type { FileEntry } from "../model.ts";

function getConcatFilter(videos: FileEntry[], opts: MergeOptions): string {
  let filtergraph = "";

  videos.forEach((video, index) => {
    filtergraph += `[v${index}]`;

    if (video.hasAudio && opts.disableAudio === false) {
      filtergraph += `[a${index}]`;
    }
  });

  if (opts.disableAudio === false) {
    filtergraph += ` concat=n=${videos.length}:v=1:a=1 [outv][outa]`;
  } else {
    filtergraph += ` concat=n=${videos.length}:v=1:a=0 [outv]`;
  }

  return filtergraph;
}

function getPerVideoFilter(
  videos: FileEntry[],
  highestResolution: [number, number],
  maxFps: number,
  opts: MergeOptions,
): string {
  let filtergraph = "";

  videos.forEach((video, index) => {
    filtergraph += `[${index}:v]scale=${highestResolution[0]}:${highestResolution[1]},setsar=1,fps=${maxFps}[v${index}];`;

    if (video.hasAudio && opts.disableAudio === false) {
      filtergraph += `[${index}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${index}];`;
    }
  });
  filtergraph += " "; // Add a space before the concat filtergraph segment

  return filtergraph;
}

export function generateFiltergraph(
  videos: FileEntry[],
  highestResolution: [number, number],
  maxFps: number,
  opts: MergeOptions,
  onSuccess: (filtergraph: string) => void,
): string {
  let filtergraph = "";

  // Get the per-video filtergraph segments for scaling and audio processing
  filtergraph += getPerVideoFilter(videos, highestResolution, maxFps, opts);

  // Add the concat filtergraph segment
  filtergraph += getConcatFilter(videos, opts);

  onSuccess(filtergraph);
  return filtergraph;
}
