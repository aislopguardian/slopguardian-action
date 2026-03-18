import type { SlopGuardianConfig } from "../types/config.js";

export const DEFAULT_CONFIG: SlopGuardianConfig = {
  version: 1,
  thresholds: { warn: 6, fail: 12 },
  detectors: {
    lexical: { enabled: true, weight: 1, languages: ["en"] },
    structural: { enabled: true, weight: 1, "duplicate-threshold": 0.85 },
    semantic: { enabled: true, weight: 1, "max-filler-ratio": 0.3, "max-hedging-density": 0.2 },
    "code-smell": {
      enabled: true,
      weight: 1,
      "max-comment-ratio": 0.4,
      "flag-generic-names": true,
    },
    consistency: { enabled: true, weight: 1, "min-files": 3 },
  },
  ai: {
    enabled: false,
    provider: "openrouter",
    model: "",
    "api-key-env": "",
    cache: true,
  },
  include: ["**/*.ts", "**/*.md"],
  exclude: ["node_modules/**", "dist/**"],
};
