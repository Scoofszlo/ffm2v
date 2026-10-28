import type { MinterpolateFilterOpts } from "./model.ts";

/**
 * Fastest interpolation preset. Blends adjacent frames instead of calculating
 * motion, so output is smooth but may show ghosting.
 */
export const MINTERPOLATE_FAST_PRESET = Object.freeze({
  mi_mode: "blend",
} satisfies MinterpolateFilterOpts);

/**
 * Default interpolation preset used by the CLI. Motion-compensated
 * interpolation with adaptive overlapped block matching and bilateral motion
 * estimation.
 */
export const MINTERPOLATE_BALANCED_PRESET = Object.freeze({
  mi_mode: "mci",
  mc_mode: "aobmc",
  me_mode: "bilat",
} satisfies MinterpolateFilterOpts);

/**
 * Slower interpolation preset that uses bidirectional motion estimation for
 * better handling of fast motion.
 */
export const MINTERPOLATE_SLOW_PRESET = Object.freeze({
  mi_mode: "mci",
  mc_mode: "aobmc",
  me_mode: "bidir",
} satisfies MinterpolateFilterOpts);

/**
 * Slowest interpolation preset. Adds exhaustive search and variable-size block
 * matching on top of bidirectional motion estimation for the best quality.
 */
export const MINTERPOLATE_VERY_SLOW_PRESET = Object.freeze({
  mi_mode: "mci",
  mc_mode: "aobmc",
  me_mode: "bidir",
  me: "esa",
  vsbmc: 1,
} satisfies MinterpolateFilterOpts);
