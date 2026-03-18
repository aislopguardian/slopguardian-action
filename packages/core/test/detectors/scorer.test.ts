import { describe, expect, it } from "vitest";
import { scoreSignals } from "../../src/scoring/scorer.js";
import { DEFAULT_WEIGHTS } from "../../src/scoring/weights.js";
import type { Signal } from "../../src/types/detection.js";

describe("scoreSignals", () => {
  it("sums weighted scores across signals", () => {
    const signals: Signal[] = [
      {
        detectorId: "lexical",
        category: "lexical",
        severity: "warning",
        score: 3,
        message: "filler phrase detected",
      },
      {
        detectorId: "lexical",
        category: "lexical",
        severity: "error",
        score: 5,
        message: "AI identity leak",
      },
    ];

    const result = scoreSignals(signals);
    expect(result.totalScore).toBe(8);
  });

  it("returns 'clean' for score 0-5", () => {
    const signals: Signal[] = [
      {
        detectorId: "lexical",
        category: "lexical",
        severity: "info",
        score: 2,
        message: "minor filler",
      },
    ];

    const result = scoreSignals(signals);
    expect(result.verdict).toBe("clean");
  });

  it("returns 'suspicious' for score 6-11", () => {
    const signals: Signal[] = [
      {
        detectorId: "lexical",
        category: "lexical",
        severity: "warning",
        score: 3,
        message: "filler",
      },
      {
        detectorId: "lexical",
        category: "lexical",
        severity: "warning",
        score: 3,
        message: "filler",
      },
      {
        detectorId: "semantic",
        category: "semantic",
        severity: "info",
        score: 2,
        message: "hedging",
      },
    ];

    const result = scoreSignals(signals);
    expect(result.verdict).toBe("suspicious");
  });

  it("returns 'likely-slop' for score >= 12", () => {
    const signals: Signal[] = [
      {
        detectorId: "lexical",
        category: "lexical",
        severity: "error",
        score: 5,
        message: "AI identity",
      },
      {
        detectorId: "lexical",
        category: "lexical",
        severity: "error",
        score: 5,
        message: "buzzword",
      },
      {
        detectorId: "semantic",
        category: "semantic",
        severity: "warning",
        score: 5,
        message: "hedging",
      },
    ];

    const result = scoreSignals(signals);
    expect(result.verdict).toBe("likely-slop");
  });

  it("handles empty signal array", () => {
    const result = scoreSignals([]);
    expect(result.totalScore).toBe(0);
    expect(result.verdict).toBe("clean");
    expect(result.weightedSignals.length).toBe(0);
  });

  it("applies category weights from config", () => {
    const signals: Signal[] = [
      {
        detectorId: "semantic",
        category: "semantic",
        severity: "warning",
        score: 10,
        message: "high filler",
      },
    ];

    const result = scoreSignals(signals, DEFAULT_WEIGHTS);
    // semantic category weight is 0.8, so 10 * 0.8 = 8
    expect(result.totalScore).toBeLessThan(10);
    expect(result.totalScore).toBeGreaterThan(0);
  });

  it("respects custom thresholds", () => {
    const signals: Signal[] = [
      {
        detectorId: "lexical",
        category: "lexical",
        severity: "warning",
        score: 4,
        message: "test",
      },
    ];

    const result = scoreSignals(signals, DEFAULT_WEIGHTS, { warn: 3, fail: 5 });
    expect(result.verdict).toBe("suspicious");
  });
});
