import { z } from "zod";

export const DetectorConfigSchema = z.object({
  enabled: z.boolean().default(true),
  weight: z.number().min(0).max(10).default(1),
});

export const LexicalConfigSchema = DetectorConfigSchema.extend({
  languages: z.array(z.string()).default(["en"]),
});

export const StructuralConfigSchema = DetectorConfigSchema.extend({
  "duplicate-threshold": z.number().min(0).max(1).default(0.85),
});

export const SemanticConfigSchema = DetectorConfigSchema.extend({
  "max-filler-ratio": z.number().min(0).max(1).default(0.3),
  "max-hedging-density": z.number().min(0).max(1).default(0.2),
});

export const CodeSmellConfigSchema = DetectorConfigSchema.extend({
  "max-comment-ratio": z.number().min(0).max(1).default(0.4),
  "flag-generic-names": z.boolean().default(true),
});

export const ConsistencyConfigSchema = DetectorConfigSchema.extend({
  "min-files": z.number().min(2).default(3),
});

export const AiConfigSchema = z.object({
  enabled: z.boolean().default(false),
  provider: z.enum(["openrouter", "openai", "anthropic", "ollama", "custom"]).default("openrouter"),
  model: z.string().default(""),
  "api-key-env": z.string().default(""),
  cache: z.boolean().default(true),
});

export const SlopGuardianConfigSchema = z.object({
  version: z.number().default(1),
  thresholds: z
    .object({
      warn: z.number().default(6),
      review: z.number().default(10),
      fail: z.number().default(15),
    })
    .default({}),
  detectors: z
    .object({
      lexical: LexicalConfigSchema.default({}),
      structural: StructuralConfigSchema.default({}),
      semantic: SemanticConfigSchema.default({}),
      "code-smell": CodeSmellConfigSchema.default({}),
      consistency: ConsistencyConfigSchema.default({}),
    })
    .default({}),
  ai: AiConfigSchema.default({}),
  include: z.array(z.string()).default(["**/*.ts", "**/*.md"]),
  exclude: z.array(z.string()).default(["node_modules/**", "dist/**"]),
});

export type SlopGuardianConfig = z.infer<typeof SlopGuardianConfigSchema>;
export type DetectorConfig = z.infer<typeof DetectorConfigSchema>;
export type LexicalConfig = z.infer<typeof LexicalConfigSchema>;
export type StructuralConfig = z.infer<typeof StructuralConfigSchema>;
export type SemanticConfig = z.infer<typeof SemanticConfigSchema>;
export type CodeSmellConfig = z.infer<typeof CodeSmellConfigSchema>;
