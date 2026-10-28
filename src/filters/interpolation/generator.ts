import {
  MinterpolateFilterOptsSchema,
  type MinterpolateFilterOpts,
} from "./model.ts";

/**
 * Builds an FFmpeg `minterpolate` filter expression from the supplied options.
 * The options are validated against {@link MinterpolateFilterOptsSchema} and
 * serialized in schema order.
 * @param opts - The filter options, keyed by FFmpeg option name. `fps` sets
 * the output rate and `mi_mode` selects the interpolation mode (`mci`, `dup`,
 * or `blend`); `mci` additionally accepts motion estimation options. See
 * {@link MinterpolateFilterOpts}.
 * @returns A `minterpolate` filter string, e.g.
 * `minterpolate=fps=60:mi_mode=mci`.
 * @throws Will throw a `ZodError` if `opts` does not match
 * `MinterpolateFilterOptsSchema`.
 */
export function generateMinterpolateFilter(
  opts: MinterpolateFilterOpts,
): string {
  const entries = MinterpolateFilterOptsSchema.parse(opts);
  const parts = Object.entries(entries).map(
    ([key, value]) => `${key}=${value}`,
  );

  return `minterpolate=${parts.join(":")}`;
}
