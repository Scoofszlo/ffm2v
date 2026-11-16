import * as z from "zod";

export const h265Schema = z.object({
  // H.265 is the default codec, so an omitted `videoCodec` resolves to this
  // branch of the discriminated union.
  videoCodec: z.literal("h265").default("h265"),
  encoder: z.literal("libx265").default("libx265"),
  crf: z.coerce
    .number()
    .int()
    .min(0, { message: "CRF must be between 0 and 51" })
    .max(51, { message: "CRF must be between 0 and 51" })
    .default(23),
});
