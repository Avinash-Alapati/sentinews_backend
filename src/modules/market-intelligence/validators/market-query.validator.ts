import { z } from "zod";

export const institutionalQuerySchema = z.object({
  limit: z
    .preprocess(
      (val) => (val === undefined ? undefined : Number(val)),
      z.number().int().min(1).max(180)
    )
    .default(30),
});

export type InstitutionalQueryInput = z.infer<typeof institutionalQuerySchema>;
