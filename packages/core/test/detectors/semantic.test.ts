import { describe, expect, it } from "vitest";
import { SemanticDetector } from "../../src/detectors/semantic.js";

describe("SemanticDetector", () => {
  const detector = new SemanticDetector(0.3, 0.2);

  it("flags paragraphs with high filler word density", async () => {
    const result = await detector.analyze({
      content:
        "This is basically just really very quite simply essentially fundamentally actually literally the same thing that we already had before.",
      filePath: "test.md",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const fillerSignals = signals.filter((s) => s.message.includes("filler"));
    expect(fillerSignals.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag concise technical paragraphs", async () => {
    const result = await detector.analyze({
      content:
        "The scanner processes each file through the detector pipeline. Each detector returns signals with scores. The scorer sums weighted scores and maps to a verdict.",
      filePath: "docs.md",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    expect(signals.length).toBe(0);
  });

  it("flags hedging overload", async () => {
    const result = await detector.analyze({
      content:
        "This might potentially work in most cases, and it's possible that to some extent, generally speaking, the results could potentially be what you typically expect, perhaps.",
      filePath: "test.md",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const hedgingSignals = signals.filter((s) => s.message.includes("edging"));
    expect(hedgingSignals.length).toBeGreaterThanOrEqual(1);
  });

  it("ignores short paragraphs under 10 words", async () => {
    const result = await detector.analyze({
      content: "Just basically really very quite.",
      filePath: "test.md",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    expect(signals.length).toBe(0);
  });

  it("handles empty input without error", async () => {
    const result = await detector.analyze({
      content: "",
      filePath: "empty.md",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().length).toBe(0);
  });
});
