import * as z from "zod";

const MciModeOptsSchema = z.object({
  mi_mode: z.literal("mci"),
  mc_mode: z.enum(["obmc", "aobmc"]).optional(),
  me_mode: z.enum(["bidir", "bilat"]).optional(),
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
  mb_size: z.number().optional(),
  search_param: z.number().optional(),
  vsbmc: z.number().optional(),
});

const DupModeOptsSchema = z.object({
  mi_mode: z.literal("dup"),
});

const BlendOptsSchema = z.object({
  mi_mode: z.literal("blend"),
});

const BaseMinterpolateFilterOptsSchema = z.object({
  fps: z.number().optional(),
  scd: z.enum(["none", "fdiff"]).optional(),
  scd_threshold: z.number().optional(),
});

export const MinterpolateFilterOptsSchema =
  BaseMinterpolateFilterOptsSchema.and(
    z.discriminatedUnion("mi_mode", [
      MciModeOptsSchema,
      DupModeOptsSchema,
      BlendOptsSchema,
    ]),
  );

export type MinterpolateFilterOpts = z.infer<
  typeof MinterpolateFilterOptsSchema
>;
