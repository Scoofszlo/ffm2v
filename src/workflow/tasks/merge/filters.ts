import { escapeFilterPath } from "@/workflow/helpers.ts";
import type { MergeWorkflowOpts } from "@/workflow/model/workflow.ts";
import type { FileEntry } from "../../model/fileEntry.ts";

/**
 * Generates the FFmpeg `unsharp` filter string used to sharpen video after
 * stabilization.
 * @returns The `unsharp` filter definition.
 */
export function generateUnsharpFilter(): string {
  return "unsharp=5:5:0.8:3:3:0.4";
}

/**
 * Generates the FFmpeg `vidstabtransform` filter chain that applies
 * stabilization using a previously generated transform file, followed by the
 * unsharp filter.
 * @param trfFilePath - The path to the transform (`.trf`) file produced by the
 * detect pass.
 * @param strength - The stabilization strength, from 1 (weakest) to 5
 * (strongest).
 * @returns The combined stabilization and unsharp filter chain.
 * @throws Will throw an error if the strength is not between 1 and 5.
 */
export function generateStabilizationFilter(
  trfFilePath: string,
  strength: number,
): string {
  let filter = "vidstabtransform=";
  const escapedTrfFilePath = escapeFilterPath(trfFilePath);

  switch (strength) {
    case 1:
      filter += "smoothing=10";
      break;
    case 2:
      filter += "smoothing=15";
      break;
    case 3:
      filter += "smoothing=22";
      break;
    case 4:
      filter += "smoothing=30";
      break;
    case 5:
      filter += "smoothing=40";
      break;
    default:
      throw new Error(`Invalid stabilization strength: ${strength}`);
  }

  filter += `:input=${escapedTrfFilePath}:maxangle=0.0,`;
  filter += generateUnsharpFilter();

  return filter;
}

/**
 * Generates the FFmpeg `vidstabdetect` filter string that analyzes camera
 * motion and writes a transform file.
 * @param strength - The stabilization strength, from 1 (weakest) to 5
 * (strongest).
 * @param trfFilePath - The path where the transform (`.trf`) file will be
 * written.
 * @returns The `vidstabdetect` filter definition.
 * @throws Will throw an error if the strength is not between 1 and 5.
 */
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

/**
 * Builds the `concat` segment of the filtergraph that joins all per-video
 * streams. Audio is included only when audio is enabled and the video has an
 * audio stream.
 * @param videos - The videos being merged, in input order.
 * @param opts - The merge options, used to determine whether audio is enabled.
 * @returns The concat filter segment, ending in the `[outv]` and optionally
 * `[outa]` labels.
 */
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

/**
 * Builds the per-video filtergraph segments. Each video is optionally
 * stabilized, then scaled to the target resolution with a fixed frame rate.
 * Audio is resampled to 48 kHz stereo FLTP when present and enabled.
 * @param videos - The videos being merged, in input order.
 * @param highestResolution - The target `[width, height]` for all videos.
 * @param maxFps - The target frame rate for all videos.
 * @param opts - The merge options controlling stabilization and audio.
 * @returns The concatenated per-video filtergraph segments.
 * @throws Will throw an error if stabilization is enabled and a video has no
 * transform file path.
 */
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
      filtergraph += `${generateStabilizationFilter(video.transFormFilePath, strength)},`;
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

/**
 * Generates the full FFmpeg filtergraph for merging videos, combining the
 * per-video segments with the concat segment.
 * @param videos - The videos being merged, in input order.
 * @param highestResolution - The target `[width, height]` for all videos.
 * @param maxFps - The target frame rate for all videos.
 * @param opts - The merge options controlling stabilization and audio.
 * @param onSuccess - Callback invoked with the generated filtergraph.
 * @returns The complete filtergraph string.
 * @throws Will throw an error if stabilization is enabled and a video has no
 * transform file path.
 */
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
