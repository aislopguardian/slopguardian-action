import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { LexicalDetector } from "../../src/detectors/lexical.js";
import { PatternRegistry } from "../../src/patterns/registry.js";

const PATTERNS_DIR = join(__dirname, "../../patterns");

describe("LexicalDetector", () => {
  let detector: LexicalDetector;

  beforeAll(() => {
    detector = new LexicalDetector();
    const registry = new PatternRegistry();
    registry.loadFromDirectory(PATTERNS_DIR);
    detector.loadPatterns(registry.getPatterns("en"));
  });

  it("flags 'As an AI language model' with score >= 5", async () => {
    const result = await detector.analyze({
      content: "As an AI language model, I cannot help with that.",
      filePath: "test.md",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    expect(signals.length).toBeGreaterThan(0);
    const aiSignal = signals.find((s) => s.patternId === "ai-identity");
    expect(aiSignal).toBeDefined();
    expect(aiSignal?.score).toBeGreaterThanOrEqual(5);
  });

  it("flags filler phrases in prose files", async () => {
    const result = await detector.analyze({
      content:
        "It's important to note that this function is deprecated.\nIt's worth mentioning the API changed.",
      filePath: "docs.md",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const fillerSignals = signals.filter((s) => s.patternId === "filler-phrases");
    expect(fillerSignals.length).toBeGreaterThanOrEqual(2);
  });

  it("flags buzzword soup", async () => {
    const result = await detector.analyze({
      content: "This comprehensive solution leverages the power of cutting-edge technology.",
      filePath: "readme.md",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const buzzSignals = signals.filter((s) => s.patternId === "buzzword-soup");
    expect(buzzSignals.length).toBeGreaterThanOrEqual(2);
  });

  it("does not flag clean technical writing", async () => {
    const result = await detector.analyze({
      content:
        "The scanner runs 31 checks per PR. Each detector produces signals with scores.\nDefault thresholds: 0-5 clean, 6-11 suspicious, 12+ likely-slop.",
      filePath: "docs.md",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    expect(signals.length).toBe(0);
  });

  it("flags code comment slop in .ts files", async () => {
    const result = await detector.analyze({
      content:
        "// This function handles the user authentication\nfunction authenticate() {}\n// Import dependencies\nimport { x } from 'y';",
      filePath: "auth.ts",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const commentSlop = signals.filter((s) => s.patternId === "code-comment-slop");
    expect(commentSlop.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag code comment patterns in markdown files", async () => {
    const result = await detector.analyze({
      content: "// This function handles the user authentication",
      filePath: "notes.md",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const commentSlop = signals.filter((s) => s.patternId === "code-comment-slop");
    expect(commentSlop.length).toBe(0);
  });

  it("flags false confidence openers", async () => {
    const result = await detector.analyze({
      content: "Great question! Let me explain.\nAbsolutely! That's the right approach.",
      filePath: "response.md",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const confidenceSignals = signals.filter((s) => s.patternId === "false-confidence");
    expect(confidenceSignals.length).toBeGreaterThanOrEqual(1);
  });

  it("flags generic commit messages", async () => {
    const result = await detector.analyze({
      content: "update",
      filePath: "commit.txt",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const commitSignals = signals.filter((s) => s.patternId === "generic-commit");
    expect(commitSignals.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag specific commit messages", async () => {
    const result = await detector.analyze({
      content: "fix(core): skip version field in package.json dependency scan",
      filePath: "commit.txt",
    });

    expect(result.isOk()).toBe(true);
    const signals = result._unsafeUnwrap();
    const commitSignals = signals.filter((s) => s.patternId === "generic-commit");
    expect(commitSignals.length).toBe(0);
  });
});
