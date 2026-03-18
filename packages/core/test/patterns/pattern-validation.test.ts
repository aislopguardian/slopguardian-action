import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PatternRegistry } from "../../src/patterns/registry.js";
import type { PatternFile } from "../../src/types/pattern.js";

const PATTERNS_DIR = join(__dirname, "../../patterns");

describe("Pattern YAML validation", () => {
  let registry: PatternRegistry;
  let allPatterns: PatternFile[];

  beforeAll(() => {
    registry = new PatternRegistry();
    const loadResult = registry.loadFromDirectory(PATTERNS_DIR);
    expect(loadResult.isOk()).toBe(true);
    allPatterns = registry.getAllPatterns();
  });

  it("loads at least 8 pattern files", () => {
    expect(allPatterns.length).toBeGreaterThanOrEqual(8);
  });

  it("has zero load errors", () => {
    expect(registry.loadErrors.length).toBe(0);
  });

  it("every pattern file has unique id", () => {
    const ids = allPatterns.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("every pattern file has at least 1 pattern entry", () => {
    for (const patternFile of allPatterns) {
      expect(patternFile.patterns.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every pattern file has should-match test cases", () => {
    for (const patternFile of allPatterns) {
      expect(patternFile.tests["should-match"].length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every pattern file has should-not-match test cases", () => {
    for (const patternFile of allPatterns) {
      expect(patternFile.tests["should-not-match"].length).toBeGreaterThanOrEqual(1);
    }
  });

  it("should-match cases actually match at least one pattern", () => {
    for (const patternFile of allPatterns) {
      for (const testCase of patternFile.tests["should-match"]) {
        const matched = patternFile.patterns.some((p) => {
          try {
            const regex = new RegExp(p.pattern, p.flags);
            return regex.test(testCase);
          } catch {
            return false;
          }
        });

        expect(matched).toBe(true);
      }
    }
  });

  it("should-not-match cases do not match any pattern", () => {
    for (const patternFile of allPatterns) {
      for (const testCase of patternFile.tests["should-not-match"]) {
        const matched = patternFile.patterns.some((p) => {
          try {
            const regex = new RegExp(p.pattern, p.flags);
            return regex.test(testCase);
          } catch {
            return false;
          }
        });

        if (matched) {
          // Some patterns like hedging-excess use score:0 patterns for density counting
          // that legitimately match common words like "might" or "typically"
          const onlyZeroScoreMatch = patternFile.patterns.every((p) => {
            try {
              const regex = new RegExp(p.pattern, p.flags);
              return !regex.test(testCase) || p.score === 0;
            } catch {
              return true;
            }
          });

          if (!onlyZeroScoreMatch) {
            expect.fail(
              `Pattern '${patternFile.id}' should-not-match case triggered: "${testCase}"`,
            );
          }
        }
      }
    }
  });

  it("all regex patterns compile without error", () => {
    for (const patternFile of allPatterns) {
      for (const entry of patternFile.patterns) {
        expect(() => new RegExp(entry.pattern, entry.flags)).not.toThrow();
      }
    }
  });
});
