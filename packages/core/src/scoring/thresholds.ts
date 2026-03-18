import type { Verdict } from "../types/detection.js";

export interface VerdictThresholds {
  warn: number;
  fail: number;
}

export const DEFAULT_THRESHOLDS: VerdictThresholds = {
  warn: 6,
  fail: 12,
};

export function scoreToVerdict(totalScore: number, thresholds: VerdictThresholds): Verdict {
  if (totalScore >= thresholds.fail) return "likely-slop";
  if (totalScore >= thresholds.warn) return "suspicious";
  return "clean";
}
