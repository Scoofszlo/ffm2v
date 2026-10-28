import type { MinterpolateFilterOpts } from "./model.ts";

export const MINTERPOLATE_FAST_PRESET = Object.freeze({
  mi_mode: "blend",
} satisfies MinterpolateFilterOpts);

export const MINTERPOLATE_BALANCED_PRESET = Object.freeze({
  mi_mode: "mci",
  mc_mode: "aobmc",
  me_mode: "bilat",
} satisfies MinterpolateFilterOpts);

export const MINTERPOLATE_SLOW_PRESET = Object.freeze({
  mi_mode: "mci",
  mc_mode: "aobmc",
  me_mode: "bidir",
} satisfies MinterpolateFilterOpts);

export const MINTERPOLATE_VERY_SLOW_PRESET = Object.freeze({
  mi_mode: "mci",
  mc_mode: "aobmc",
  me_mode: "bidir",
  me: "esa",
  vsbmc: 1,
} satisfies MinterpolateFilterOpts);
