import type { DetectorCategory } from "../types/detection.js";

export interface ScoringWeights {
  detectorWeights: Record<string, number>;
  categoryWeights: Record<DetectorCategory, number>;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  detectorWeights: {},
  categoryWeights: {
    lexical: 1.0,
    structural: 1.0,
    semantic: 0.8,
    "code-smell": 0.7,
    consistency: 0.6,
  },
};
