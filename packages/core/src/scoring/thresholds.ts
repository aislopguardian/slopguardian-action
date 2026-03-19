import type { Verdict } from "../types/detection.js";

export interface VerdictThresholds {
  warn: number;
  review: number;
  fail: number;
}

export const DEFAULT_THRESHOLDS: VerdictThresholds = {
  warn: 6,
  review: 10,
  fail: 15,
};

export function scoreToVerdict(totalScore: number, thresholds: VerdictThresholds): Verdict {
  if (totalScore >= thresholds.fail) return "likely-slop";
  if (totalScore >= thresholds.review) return "needs-review";
  if (totalScore >= thresholds.warn) return "suspicious";
  return "clean";
}
