interface UnsharpFilterOpts {
  lx?: number;
  ly?: number;
  la?: number;
  cx?: number;
  cy?: number;
  ca?: number;
  ax?: number;
  ay?: number;
  aa?: number;
}

export const VIDEO_STABILIZATION_UNSHARP_PRESET = Object.freeze({
  lx: 5,
  ly: 5,
  la: 0.8,
  cx: 3,
  cy: 3,
  ca: 0.4,
} satisfies UnsharpFilterOpts);

/**
 * Builds an FFmpeg `unsharp` filter expression from the supplied options.
 *
 * Options are emitted in FFmpeg's required parameter order (`lx`, `ly`, `la`,
 * `cx`, `cy`, `ca`, `ax`, `ay`, `aa`) and undefined options are skipped.
 *
 * @param opts - Unsharp parameters to encode; when omitted or empty, the bare
 *   `unsharp` filter defaults are used.
 * @returns An `unsharp` filter string, e.g.
 *   `unsharp=lx=5:ly=5:la=0.8:cx=3:cy=3:ca=0.4`, or `unsharp` when no
 *   parameters are provided.
 */
export function generateUnsharpFilter(opts?: UnsharpFilterOpts): string {
  // If no options are provided, return the default unsharp filter
  if (!opts) {
    return "unsharp";
  }

  // Ensure that the parameters are in the correct order for unsharp filter
  const PARAM_ORDER = [
    "lx",
    "ly",
    "la",
    "cx",
    "cy",
    "ca",
    "ax",
    "ay",
    "aa",
  ] as const;

  // Loop through each PARAM_ORDER key and add it to the filter string
  // if it is defined in opts
  const parts = PARAM_ORDER.filter((key) => opts[key] !== undefined).map(
    (key) => `${key}=${opts[key]}`,
  );

  // If no parameters are defined, return the default unsharp filter
  return parts.length > 0 ? `unsharp=${parts.join(":")}` : "unsharp";
}
