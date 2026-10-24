import { escapeFilterPath } from "@/workflow/helpers.ts";
import type { MergeWorkflowOpts } from "@/workflow/model/workflow.ts";
import type { FileEntry } from "../../model/fileEntry.ts";

export function generateUnsharpFilter(): string {
  return "unsharp=5:5:0.8:3:3:0.4";
}

export function generateStabilizationFilter(
  trfFilePath: string,
  strength: number,
): string {
  let filter = "vidstabtransform=";

  switch (strength) {
    case 1:
      filter += `smoothing=10:input=${trfFilePath}:maxangle=0.0`;
      break;
    case 2:
      filter += `smoothing=15:input=${trfFilePath}:maxangle=0.0`;
      break;
    case 3:
      filter += `smoothing=22:input=${trfFilePath}:maxangle=0.0`;
      break;
    case 4:
      filter += `smoothing=30:input=${trfFilePath}:maxangle=0.0`;
      break;
    case 5:
      filter += `smoothing=40:input=${trfFilePath}:maxangle=0.0`;
      break;
    default:
      throw new Error(`Invalid stabilization strength: ${strength}`);
  }

  filter += ",";
  filter += generateUnsharpFilter();

  return filter;
}

export function generateVidstabDetectFilter(
  strength: number,
  trfFilePath: string,
): string {
  let filter = "vidstabdetect=";

  switch (strength) {
    case 1:
      filter += "shakiness=4:accuracy=9";
      break;
    case 2:
      filter += "shakiness=6:accuracy=12";
      break;
    case 3:
      filter += "shakiness=8:accuracy=15";
      break;
    case 4:
      filter += "shakiness=10:accuracy=15";
      break;
    case 5:
      filter += "shakiness=10:accuracy=15";
      break;
    default:
      throw new Error(`Invalid stabilization strength: ${strength}`);
  }

  filter += `:result=${trfFilePath}`;

  return filter;
}

function getConcatFilterchain(
  videos: FileEntry[],
  opts: MergeWorkflowOpts,
): string {
  let filterchain = "";

  videos.forEach((video, index) => {
    filterchain += `[v${index}]`;

    if (video.hasAudio && opts.disableAudio === false) {
      filterchain += `[a${index}]`;
    }
  });

  if (opts.disableAudio === false) {
    filterchain += ` concat=n=${videos.length}:v=1:a=1 [outv][outa]`;
  } else {
    filterchain += ` concat=n=${videos.length}:v=1:a=0 [outv]`;
  }

  return filterchain;
}

function getPerVideoFilterchain(
  videos: FileEntry[],
  highestResolution: [number, number],
  maxFps: number,
  opts: MergeWorkflowOpts,
): string {
  let filtergraph = "";

  videos.forEach((video, index) => {
    // Start the filtergraph segment for this video
    filtergraph += `[${index}:v]`;

    // Apply stabilization filter if enabled, and throw an error if the
    // transformation file path is missing for the video
    if (opts.stabilize) {
      if (!video.transFormFilePath) {
        throw new Error(
          `Transformation file path is missing for video: ${video.fullPath}`,
        );
      }

      const strength = opts.stabilize;
      const cleanTrfFilePath = escapeFilterPath(video.transFormFilePath);
      filtergraph += `${generateStabilizationFilter(cleanTrfFilePath, strength)},`;
    }

    // Apply scaling and frame rate adjustments
    filtergraph += `scale=${highestResolution[0]}:${highestResolution[1]},setsar=1,fps=${maxFps}`;

    // End the filtergraph segment for this video
    filtergraph += `[v${index}];`;

    // Apply audio processing if the video has audio and audio is not disabled
    if (video.hasAudio && opts.disableAudio === false) {
      filtergraph += `[${index}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${index}];`;
    }
  });

  return filtergraph;
}

export function generateFiltergraph(
  videos: FileEntry[],
  highestResolution: [number, number],
  maxFps: number,
  opts: MergeWorkflowOpts,
  onSuccess: (filtergraph: string) => void,
): string {
  let filtergraph = "";

  // Get the per-video filterchain segments for scaling and audio processing
  filtergraph += getPerVideoFilterchain(
    videos,
    highestResolution,
    maxFps,
    opts,
  );

  // Add a space before the concat filterchain segment
  filtergraph += " ";

  // Add the concat filterchain segment
  filtergraph += getConcatFilterchain(videos, opts);

  onSuccess(filtergraph);
  return filtergraph;
}
