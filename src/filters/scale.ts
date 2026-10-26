/**
 * Builds an FFmpeg `scale` filter expression from the supplied dimensions.
 * @param width - The target width in pixels, or a value FFmpeg interprets
 * (e.g. `-2` to keep the aspect ratio and round to an even number).
 * @param height - The target height in pixels, with the same value rules as
 * `width`.
 * @returns A `scale` filter string, e.g. `scale=1920:1080`.
 */
export function generateScaleFilter(width: number, height: number): string {
  return `scale=${width}:${height}`;
}
