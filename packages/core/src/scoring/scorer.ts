import type { Signal, Verdict } from "../types/detection.js";
import { DEFAULT_THRESHOLDS, scoreToVerdict, type VerdictThresholds } from "./thresholds.js";
import type { ScoringWeights } from "./weights.js";
import { DEFAULT_WEIGHTS } from "./weights.js";

export interface ScoringResult {
  totalScore: number;
  weightedSignals: WeightedSignal[];
  verdict: Verdict;
}

export interface WeightedSignal {
  signal: Signal;
  weight: number;
  weightedScore: number;
}

export function scoreSignals(
  signals: Signal[],
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  thresholds: VerdictThresholds = DEFAULT_THRESHOLDS,
): ScoringResult {
  const weightedSignals: WeightedSignal[] = signals.map((signal) => {
    const detectorWeight = weights.detectorWeights[signal.detectorId] ?? 1.0;
    const categoryWeight = weights.categoryWeights[signal.category] ?? 1.0;
    const weight = detectorWeight * categoryWeight;

    return {
      signal,
      weight,
      weightedScore: Math.round(signal.score * weight * 100) / 100,
    };
  });

  const totalScore = weightedSignals.reduce((sum, ws) => sum + ws.weightedScore, 0);
  const verdict = scoreToVerdict(totalScore, thresholds);

  return { totalScore, weightedSignals, verdict };
}
