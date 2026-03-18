import { z } from "zod";

export const PatternContextSchema = z.enum(["prose", "code", "comment", "any"]).default("any");

export const PatternTestsSchema = z.object({
  "should-match": z.array(z.string()).min(1),
  "should-not-match": z.array(z.string()).min(1),
});

export const PatternEntrySchema = z.object({
  pattern: z.string(),
  flags: z.string().default("i"),
  context: PatternContextSchema,
  score: z.number().min(0).max(10),
  max: z.number().min(0).max(20).optional(),
  description: z.string(),
});

export const PatternFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  language: z.string().default("en"),
  "score-base": z.number().min(0).max(10),
  patterns: z.array(PatternEntrySchema),
  tests: PatternTestsSchema,
});

export type PatternContext = z.infer<typeof PatternContextSchema>;
export type PatternEntry = z.infer<typeof PatternEntrySchema>;
export type PatternFile = z.infer<typeof PatternFileSchema>;
export type PatternTests = z.infer<typeof PatternTestsSchema>;
