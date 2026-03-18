import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Scanner } from "../../src/engine/scanner.js";

const PATTERNS_DIR = join(__dirname, "../../patterns");
const FIXTURES_DIR = join(__dirname, "../fixtures");

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf-8");
}

describe("Scanner end-to-end", () => {
  const config = {
    version: 1 as const,
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
      provider: "openrouter" as const,
      model: "",
      "api-key-env": "",
      cache: true,
    },
    include: ["**/*.ts", "**/*.md"],
    exclude: ["node_modules/**", "dist/**"],
  };

  it("flags known-slop.md as likely-slop", async () => {
    const scanner = new Scanner(config, PATTERNS_DIR);
    const content = readFixture("known-slop.md");

    const result = await scanner.scan([{ filePath: "known-slop.md", content }]);

    expect(result.isOk()).toBe(true);
    const scanResult = result._unsafeUnwrap();
    expect(scanResult.verdict).toBe("likely-slop");
    expect(scanResult.totalScore).toBeGreaterThanOrEqual(12);
    expect(scanResult.signals.length).toBeGreaterThanOrEqual(5);
  });

  it("marks known-clean.md as clean", async () => {
    const scanner = new Scanner(config, PATTERNS_DIR);
    const content = readFixture("known-clean.md");

    const result = await scanner.scan([{ filePath: "known-clean.md", content }]);

    expect(result.isOk()).toBe(true);
    const scanResult = result._unsafeUnwrap();
    expect(scanResult.verdict).toBe("clean");
    expect(scanResult.totalScore).toBeLessThanOrEqual(5);
  });

  it("detects code smells in known-slop.ts", async () => {
    const scanner = new Scanner(config, PATTERNS_DIR);
    const content = readFixture("known-slop.ts");

    const result = await scanner.scan([{ filePath: "known-slop.ts", content }]);

    expect(result.isOk()).toBe(true);
    const scanResult = result._unsafeUnwrap();
    expect(scanResult.signals.length).toBeGreaterThanOrEqual(3);
    const codeSmells = scanResult.signals.filter((s) => s.category === "code-smell");
    expect(codeSmells.length).toBeGreaterThanOrEqual(1);
  });

  it("passes known-clean.ts with minimal signals", async () => {
    const scanner = new Scanner(config, PATTERNS_DIR);
    const content = readFixture("known-clean.ts");

    const result = await scanner.scan([{ filePath: "known-clean.ts", content }]);

    expect(result.isOk()).toBe(true);
    const scanResult = result._unsafeUnwrap();
    expect(scanResult.verdict).toBe("clean");
  });

  it("handles empty file list", async () => {
    const scanner = new Scanner(config, PATTERNS_DIR);

    const result = await scanner.scan([]);

    expect(result.isOk()).toBe(true);
    const scanResult = result._unsafeUnwrap();
    expect(scanResult.verdict).toBe("clean");
    expect(scanResult.totalScore).toBe(0);
  });

  it("includes file path in signal metadata", async () => {
    const scanner = new Scanner(config, PATTERNS_DIR);

    const result = await scanner.scan([
      {
        filePath: "src/example.md",
        content: "As an AI language model, I can help you.",
      },
    ]);

    expect(result.isOk()).toBe(true);
    const scanResult = result._unsafeUnwrap();
    const signalsWithFile = scanResult.signals.filter((s) => s.file === "src/example.md");
    expect(signalsWithFile.length).toBeGreaterThanOrEqual(1);
  });

  it("populates fileResults map", async () => {
    const scanner = new Scanner(config, PATTERNS_DIR);

    const result = await scanner.scan([
      { filePath: "a.md", content: "As an AI language model, this is slop." },
      { filePath: "b.md", content: "Clean technical documentation about the scanner." },
    ]);

    expect(result.isOk()).toBe(true);
    const scanResult = result._unsafeUnwrap();
    expect(scanResult.fileResults.has("a.md")).toBe(true);
    expect(scanResult.fileResults.has("b.md")).toBe(true);
    const aSignals = scanResult.fileResults.get("a.md") ?? [];
    expect(aSignals.length).toBeGreaterThan(0);
  });
});
