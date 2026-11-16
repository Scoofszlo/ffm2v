import * as z from "zod";

export const av1Schema = z.object({
  videoCodec: z.literal("av1"),
  encoder: z.literal("libsvtav1").default("libsvtav1"),
  crf: z.coerce
    .number()
    .int()
    .min(1, { message: "CRF must be between 1 and 63" })
    .max(63, { message: "CRF must be between 1 and 63" })
    .default(23),
});
