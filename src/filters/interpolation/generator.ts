import {
  MinterpolateFilterOptsSchema,
  type MinterpolateFilterOpts,
} from "./model.ts";

export function generateMinterpolateFilter(
  opts: MinterpolateFilterOpts,
): string {
  const entries = MinterpolateFilterOptsSchema.parse(opts);
  const parts = Object.entries(entries).map(
    ([key, value]) => `${key}=${value}`,
  );

  return `minterpolate=${parts.join(":")}`;
}
