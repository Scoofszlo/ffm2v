import { FilterchainHandler } from "@/filtering/filterchain/handler.ts";
import { FiltergraphHandler } from "@/filtering/filtergraph/handler.ts";
import { generateMinterpolateFilter } from "@/filtering/filters/interpolation/generator.ts";
import { MINTERPOLATE_BALANCED_PRESET } from "@/filtering/filters/interpolation/presets.ts";
import { generateStabilizationFilter } from "@/filtering/filters/stabilization.ts";
import type { Resolution } from "@/types.ts";
import type { MediaFile } from "@/workflow/model/mediaFile.ts";
import type { MergeWorkflowOpts } from "@/workflow/model/workflow.ts";

/**
 * Builds the `concat` segment of the filtergraph that joins all per-video
 * streams. Audio labels are added only when audio is enabled and the video
 * has an audio stream; the concat filter itself keeps audio when enabled.
 * @param videos - The videos being merged, in input order.
 * @param opts - The merge options, used to determine whether audio is enabled.
 * @returns The concat filter segment, ending in the `[outv]` and optionally
 * `[outa]` labels.
 */
function getConcatFilterchain(
  videos: MediaFile[],
  opts: MergeWorkflowOpts,
): string {
  const fch = new FilterchainHandler();

  // Add input labels depending on the number of videos and whether audio is
  // enabled
  videos.forEach((video, index) => {
    fch.addInputLabel(`v${index}`);

    if (video.hasAudio && opts.disableAudio === false) {
      fch.addInputLabel(`a${index}`);
    }
  });

  // Add the concat filter with the appropriate number of video and audio streams
  if (opts.disableAudio === false) {
    fch.addFilter(`concat=n=${videos.length}:v=1:a=1`);
    fch.addOutputLabel("outv");
    fch.addOutputLabel("outa");
  } else {
    fch.addFilter(`concat=n=${videos.length}:v=1:a=0`);
    fch.addOutputLabel("outv");
  }

  return fch.getFilters({ includeLabels: true });
}

function getPerAudioStreamFilterchain(
  index: number,
  video: MediaFile,
  opts: MergeWorkflowOpts,
): string {
  const audFch = new FilterchainHandler({
    inputLabel: [`${index}:a`],
    outputLabel: [`a${index}`],
  });

  // Apply audio processing if the video has audio and audio is not disabled
  if (video.hasAudio && opts.disableAudio === false) {
    audFch.addFilter(
      `aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo`,
    );
  }

  return audFch.getFilters({ includeLabels: true });
}

/**
 * Builds the per-video filtergraph segments. Each video is optionally
 * stabilized, then scaled to the target resolution and given a target frame
 * rate: the interpolation filter when `--interpolate` is set, otherwise
 * `maxFps`.
 * Audio is resampled to 48 kHz stereo FLTP when present and enabled.
 * @param videos - The videos being merged, in input order.
 * @param highestResolution - The target `[width, height]` for all videos.
 * @param maxFps - The target frame rate used when interpolation is disabled.
 * @param opts - The merge options controlling stabilization, interpolation,
 * and audio.
 * @returns The concatenated per-video filtergraph segments.
 * @throws Will throw an error if stabilization is enabled and a video has no
 * transform file path.
 */
function getPerVideoStreamFilterchain(
  index: number,
  video: MediaFile,
  highestResolution: Resolution,
  maxFps: number,
  opts: MergeWorkflowOpts,
): string {
  const vidFch = new FilterchainHandler({
    inputLabel: [`${index}:v`],
    outputLabel: [`v${index}`],
  });

  // Apply stabilization filter if enabled, and throw an error if the
  // transformation file path is missing for the video
  if (opts.stabilize) {
    if (!video.transformFilePath) {
      throw new Error(
        `Transformation file path is missing for video: ${video.fullPath}`,
      );
    }

    const strength = opts.stabilize;
    vidFch.addFilter(
      generateStabilizationFilter(video.transformFilePath, strength),
    );
  }

  // Apply scaling and frame rate adjustments
  vidFch.addFilter(
    `scale=${highestResolution[0]}:${highestResolution[1]},setsar=1`,
  );

  // Apply interpolation filter if enabled, otherwise set the frame rate to the videos
  // who have the highest FPS.
  if (opts.interpolate) {
    const targetFps = opts.interpolate;

    vidFch.addFilter(
      generateMinterpolateFilter({
        ...MINTERPOLATE_BALANCED_PRESET,
        fps: targetFps,
      }),
    );
    vidFch.addFilter(`fps=${targetFps}`);
  } else {
    vidFch.addFilter(`fps=${maxFps}`);
  }

  return vidFch.getFilters({ includeLabels: true });
}

/**
 * Generates the full FFmpeg filtergraph for merging videos, combining the
 * per-video segments with the concat segment.
 * @param videos - The videos being merged, in input order.
 * @param highestResolution - The target `[width, height]` for all videos.
 * @param maxFps - The target frame rate used when interpolation is disabled.
 * @param opts - The merge options controlling stabilization, interpolation,
 * and audio.
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
  const fgh = new FiltergraphHandler();

  // For each video, get the per-video filterchain and the per-audio
  // filterchain, and add them to the filtergraph
  videos.forEach((video, index) => {
    const videoFilterchain = getPerVideoStreamFilterchain(
      index,
      video,
      highestResolution,
      maxFps,
      opts,
    );
    const audioFilterchain = getPerAudioStreamFilterchain(index, video, opts);

    fgh.addFilterchain(videoFilterchain);
    fgh.addFilterchain(audioFilterchain);
  });

  // Add the concat filterchain segment
  fgh.addFilterchain(getConcatFilterchain(videos, opts));

  const filtergraph = fgh.getFiltergraph();

  onSuccess(filtergraph);
  return filtergraph;
}
