import * as z from "zod";

const MciModeOptsSchema = z.object({
  /** Motion-compensated interpolation. */
  mi_mode: z.literal("mci"),
  /** Motion compensation mode: overlapped `obmc` or adaptive `aobmc`. */
  mc_mode: z.enum(["obmc", "aobmc"]).optional(),
  /** Motion estimation mode: bidirectional `bidir` or bilateral `bilat`. */
  me_mode: z.enum(["bidir", "bilat"]).optional(),
  /**
   * Motion estimation algorithm, e.g. `epzs`, `umh`, `esa`.
   */
  me: z
    .enum([
      "esa",
      "tss",
      "ess",
      "tdlss",
      "ntss",
      "fss",
      "ds",
      "hexbs",
      "epzs",
      "umh",
    ])
    .optional(),
  /** Motion estimation macroblock size. */
  mb_size: z.number().optional(),
  /** Motion estimation search range. */
  search_param: z.number().optional(),
  /** Variable-size block motion compensation, `0` or `1`. */
  vsbmc: z.number().optional(),
});

const DupModeOptsSchema = z.object({
  /** Duplicates frames instead of interpolating them. */
  mi_mode: z.literal("dup"),
});

const BlendOptsSchema = z.object({
  /** Blends adjacent frames; smooth, but may show ghosting. */
  mi_mode: z.literal("blend"),
});

const BaseMinterpolateFilterOptsSchema = z.object({
  /** Target output frame rate. */
  fps: z.number().optional(),
  /** Scene-change detection: `none` or frame difference `fdiff`. */
  scd: z.enum(["none", "fdiff"]).optional(),
  /** Frame-difference threshold used when `scd` is `fdiff`. */
  scd_threshold: z.number().optional(),
});

/**
 * Schema for FFmpeg `minterpolate` filter options. `mi_mode` selects the
 * interpolation mode; `mci` additionally accepts motion estimation options.
 */
export const MinterpolateFilterOptsSchema =
  BaseMinterpolateFilterOptsSchema.and(
    z.discriminatedUnion("mi_mode", [
      MciModeOptsSchema,
      DupModeOptsSchema,
      BlendOptsSchema,
    ]),
  );

/**
 * Validated options for FFmpeg's `minterpolate` filter.
 */
export type MinterpolateFilterOpts = z.infer<
  typeof MinterpolateFilterOptsSchema
>;
