import * as z from "zod";

const SCALE_REGEX = /^(-2|-1|[1-9][0-9]*):(-2|-1|[1-9][0-9]*)$/;

const commonOptionsSchema = z.object({
  output: z.string().min(1).nullable(),
  videoCodec: z
    .enum(["libx265"], {
      message: "Invalid video codec. Available options are: libx265",
    })
    .default("libx265"),
  crf: z.coerce
    .number()
    .int()
    .min(0, { message: "CRF must be between 0 and 51" })
    .max(51, { message: "CRF must be be between 0 and 51" })
    .default(23),
  interpolate: z.coerce
    .number()
    .min(1, "Interpolation FPS must be a positive number")
    .nullable()
    .default(null),
  stabilize: z.coerce
    .number()
    .int()
    .min(1, "Stabilization level must be between 1 and 5")
    .max(5, "Stabilization level must be between 1 and 5")
    .nullable()
    .default(null),
  disableAudio: z.boolean().default(false),
  ffmpegPath: z.string().nullable().default(null),
});

const encodeOptionsSchema = commonOptionsSchema
  .extend({
    input: z
      .string("Input file must be specified")
      .min(1, "Input file must be specified"),
    resolution: z
      .string()
      .nullable()
      .refine((value) => {
        if (value === null) return true;

        const match = value.match(SCALE_REGEX);
        return match !== null;
      }, "Resolution must be in the format 'width:height' (e.g., 1920:1080, -2:1080, 1920:-2)")
      .default(null)
      .transform((value, ctx) => {
        if (value === null) return null;
        const [width, height] = value.split(":").map(Number);

        if (height === undefined || width === undefined) {
          ctx.addIssue({
            code: "custom",
            message: "Height/width is in undefined value.",
          });
          return z.NEVER;
        }

        return { width, height };
      }),
    keepRotationMetadata: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.input === data.output) {
      ctx.addIssue({
        code: "custom",
        message: "Input and output files cannot be the same.",
        path: ["output"],
      });
    }
  });

const mergeOptionsSchema = commonOptionsSchema.extend({
  input: z
    .array(
      z
        .string("Input file must be specified")
        .min(1, "Input file must be specified"),
    )
    .min(1),
});

const updateOptionsSchema = z.object({
  disableArchive: z.boolean().default(false),
  checkOnly: z.boolean().default(false),
});

const BaseWorkflowSchema = z.object({
  tmpDir: z.string().min(1, "Temporary directory must be specified"),
});

const EncodeSchema = z.object({
  ...BaseWorkflowSchema.shape,
  type: z.literal("encode"),
  options: encodeOptionsSchema,
});

const MergeSchema = z.object({
  ...BaseWorkflowSchema.shape,
  type: z.literal("merge"),
  options: mergeOptionsSchema,
});

const UpdateSchema = z.object({
  ...BaseWorkflowSchema.shape,
  type: z.literal("update"),
  options: updateOptionsSchema,
});

export const WorkflowSchema = z.discriminatedUnion("type", [
  EncodeSchema,
  MergeSchema,
  UpdateSchema,
]);

export type Workflow = z.infer<typeof WorkflowSchema>;
export type EncodeWorkflow = z.infer<typeof EncodeSchema>;
export type EncodeWorkflowOpts = z.infer<typeof encodeOptionsSchema>;
export type MergeWorkflow = z.infer<typeof MergeSchema>;
export type MergeWorkflowOpts = z.infer<typeof mergeOptionsSchema>;
export type UpdateWorkflow = z.infer<typeof UpdateSchema>;
export type UpdateWorkflowOpts = z.infer<typeof updateOptionsSchema>;
