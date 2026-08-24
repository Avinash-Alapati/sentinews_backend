import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const searchNewsSchema = paginationSchema.extend({
  q: z.string().trim().optional(),
});

export const companyNewsSchema = paginationSchema.extend({
  company: z.string().trim().min(1),
});

export const sectorNewsSchema = paginationSchema.extend({
  sector: z.string().trim().min(1),
});