import { generateStabilizationFilter } from "@/filters/stabilization.ts";
import type { Resolution } from "@/types.ts";
import type { MediaFile } from "@/workflow/model/mediaFile.ts";
import type { MergeWorkflowOpts } from "@/workflow/model/workflow.ts";

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
  videos: MediaFile[],
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
  videos: MediaFile[],
  highestResolution: Resolution,
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
      if (!video.transformFilePath) {
        throw new Error(
          `Transformation file path is missing for video: ${video.fullPath}`,
        );
      }

      const strength = opts.stabilize;
      filtergraph += `${generateStabilizationFilter(video.transformFilePath, strength)},`;
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
  videos: MediaFile[],
  highestResolution: Resolution,
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
