import * as z from "zod";

export const h264Schema = z.object({
  videoCodec: z.literal("h264"),
  encoder: z.literal("libx264").default("libx264"),
  crf: z.coerce
    .number()
    .int()
    .min(0, { message: "CRF must be between 0 and 51" })
    .max(51, { message: "CRF must be between 0 and 51" })
    .default(23),
});
