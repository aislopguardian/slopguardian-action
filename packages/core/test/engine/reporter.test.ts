import { describe, expect, it } from "vitest";
import {
  formatJson,
  formatMarkdown,
  formatReport,
  formatSarif,
} from "../../src/engine/reporter.js";
import type { ScanResult, Signal } from "../../src/types/detection.js";

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    detectorId: "lexical",
    category: "lexical",
    severity: "warning",
    score: 3,
    message: "filler phrase detected",
    ...overrides,
  };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    signals: [],
    totalScore: 0,
    verdict: "clean",
    fileResults: new Map(),
    detectorTimings: new Map(),
    ...overrides,
  };
}

describe("formatMarkdown", () => {
  it("returns [PASS] label for clean verdict", () => {
    const result = formatMarkdown(makeScanResult({ verdict: "clean", totalScore: 2 }));

    expect(result.verdictLine).toContain("[PASS]");
    expect(result.verdictLine).toContain("clean");
    expect(result.verdictLine).toContain("score: 2");
  });

  it("returns [WARN] label for suspicious verdict", () => {
    const result = formatMarkdown(makeScanResult({ verdict: "suspicious", totalScore: 8 }));

    expect(result.verdictLine).toContain("[WARN]");
    expect(result.verdictLine).toContain("suspicious");
    expect(result.verdictLine).toContain("score: 8");
  });

  it("returns [FAIL] label for likely-slop verdict", () => {
    const result = formatMarkdown(makeScanResult({ verdict: "likely-slop", totalScore: 15 }));

    expect(result.verdictLine).toContain("[FAIL]");
    expect(result.verdictLine).toContain("likely-slop");
    expect(result.verdictLine).toContain("score: 15");
  });

  it("includes signal table with detector IDs and messages", () => {
    const signals: Signal[] = [
      makeSignal({ detectorId: "lexical", message: "buzzword overload", severity: "warning" }),
      makeSignal({
        detectorId: "semantic",
        category: "semantic",
        message: "high filler ratio",
        severity: "error",
      }),
    ];
    const result = formatMarkdown(makeScanResult({ signals, totalScore: 6 }));

    expect(result.signalTable).toContain("lexical");
    expect(result.signalTable).toContain("buzzword overload");
    expect(result.signalTable).toContain("semantic");
    expect(result.signalTable).toContain("high filler ratio");
    expect(result.signalTable).toContain("| Detector | Location | Finding |");
  });

  it("returns 'No signals detected.' when signals array is empty", () => {
    const result = formatMarkdown(makeScanResult({ signals: [] }));

    expect(result.signalTable).toBe("No signals detected.");
  });

  it("renders file location with line number in signal table", () => {
    const signals = [makeSignal({ file: "src/index.ts", line: 42, message: "dead code" })];
    const result = formatMarkdown(makeScanResult({ signals }));

    expect(result.signalTable).toContain("src/index.ts:42");
  });

  it("renders dash for location when signal has no file", () => {
    const signals = [makeSignal({ file: undefined, line: undefined })];
    const result = formatMarkdown(makeScanResult({ signals }));

    // The reporter uses an em dash for missing locations
    expect(result.signalTable).toContain("\u2014");
  });

  it("renders file without line number when line is absent", () => {
    const signals = [makeSignal({ file: "README.md", line: undefined })];
    const result = formatMarkdown(makeScanResult({ signals }));

    expect(result.signalTable).toContain("README.md");
    expect(result.signalTable).not.toContain("README.md:");
  });

  it("maps severity to correct icon in signal rows", () => {
    const signals = [
      makeSignal({ severity: "error", message: "error-msg" }),
      makeSignal({ severity: "warning", message: "warn-msg", detectorId: "warn-det" }),
      makeSignal({ severity: "info", message: "info-msg", detectorId: "info-det" }),
    ];
    const result = formatMarkdown(makeScanResult({ signals }));

    expect(result.signalTable).toContain("| X |");
    expect(result.signalTable).toContain("| ! |");
    expect(result.signalTable).toContain("| i |");
  });

  it("includes suggestions section when signals have suggestions", () => {
    const signals = [makeSignal({ file: "src/app.ts", suggestion: "Remove filler phrases" })];
    const result = formatMarkdown(makeScanResult({ signals }));

    expect(result.suggestions).toContain("### What to fix");
    expect(result.suggestions).toContain("Remove filler phrases");
    expect(result.suggestions).toContain("src/app.ts");
  });

  it("returns empty suggestions string when no signals have suggestions", () => {
    const signals = [makeSignal({ suggestion: undefined })];
    const result = formatMarkdown(makeScanResult({ signals }));

    expect(result.suggestions).toBe("");
  });

  it("deduplicates identical suggestions", () => {
    const signals = [
      makeSignal({ file: "src/a.ts", suggestion: "Remove filler phrases" }),
      makeSignal({ file: "src/a.ts", suggestion: "Remove filler phrases" }),
      makeSignal({ file: "src/b.ts", suggestion: "Fix hedging" }),
    ];
    const result = formatMarkdown(makeScanResult({ signals }));

    const occurrences = result.suggestions.split("Remove filler phrases").length - 1;
    expect(occurrences).toBe(1);
    expect(result.suggestions).toContain("Fix hedging");
  });

  it("includes all sections in summary output", () => {
    const signals = [makeSignal({ suggestion: "Fix this" })];
    const result = formatMarkdown(
      makeScanResult({ signals, verdict: "suspicious", totalScore: 7 }),
    );

    expect(result.summary).toContain("### SlopGuardian Report");
    expect(result.summary).toContain("[WARN]");
    expect(result.summary).toContain("| Detector |");
    expect(result.summary).toContain("### What to fix");
  });
});

describe("formatJson", () => {
  it("returns correct verdict and score", () => {
    const result = formatJson(makeScanResult({ verdict: "suspicious", totalScore: 9 }));

    expect(result.verdict).toBe("suspicious");
    expect(result.score).toBe(9);
  });

  it("returns version 1", () => {
    const result = formatJson(makeScanResult());

    expect(result.version).toBe(1);
  });

  it("returns correct signalCount matching signals array length", () => {
    const signals = [makeSignal(), makeSignal({ detectorId: "semantic" })];
    const result = formatJson(makeScanResult({ signals }));

    expect(result.signalCount).toBe(2);
    expect(result.signals).toHaveLength(2);
  });

  it("returns zero signalCount for empty signals", () => {
    const result = formatJson(makeScanResult({ signals: [] }));

    expect(result.signalCount).toBe(0);
    expect(result.signals).toHaveLength(0);
  });

  it("preserves full signal objects in output", () => {
    const signal = makeSignal({
      detectorId: "code-smell",
      category: "code-smell",
      severity: "error",
      score: 5,
      file: "src/main.ts",
      line: 10,
      column: 4,
      message: "unused import",
      suggestion: "Remove unused import",
      patternId: "unused-import-01",
    });
    const result = formatJson(makeScanResult({ signals: [signal] }));

    expect(result.signals[0]).toStrictEqual(signal);
  });
});

describe("formatSarif", () => {
  it("returns valid SARIF structure with $schema and version 2.1.0", () => {
    const result = formatSarif(makeScanResult());

    expect(result.$schema).toBe("https://json.schemastore.org/sarif-2.1.0.json");
    expect(result.version).toBe("2.1.0");
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].tool.driver.name).toBe("SlopGuardian");
  });

  it("uses provided version string for tool driver version", () => {
    const result = formatSarif(makeScanResult(), "1.2.3");

    expect(result.runs[0].tool.driver.version).toBe("1.2.3");
  });

  it("defaults tool driver version to 0.1.0 when not provided", () => {
    const result = formatSarif(makeScanResult());

    expect(result.runs[0].tool.driver.version).toBe("0.1.0");
  });

  it("maps error severity signals to SARIF error level", () => {
    const signals = [makeSignal({ severity: "error", detectorId: "lexical" })];
    const result = formatSarif(makeScanResult({ signals }));

    expect(result.runs[0].results[0].level).toBe("error");
    expect(result.runs[0].tool.driver.rules[0].defaultConfiguration.level).toBe("error");
  });

  it("maps warning severity signals to SARIF warning level", () => {
    const signals = [makeSignal({ severity: "warning", detectorId: "lexical" })];
    const result = formatSarif(makeScanResult({ signals }));

    expect(result.runs[0].results[0].level).toBe("warning");
    expect(result.runs[0].tool.driver.rules[0].defaultConfiguration.level).toBe("warning");
  });

  it("maps info severity signals to SARIF note level", () => {
    const signals = [makeSignal({ severity: "info", detectorId: "semantic" })];
    const result = formatSarif(makeScanResult({ signals }));

    expect(result.runs[0].results[0].level).toBe("note");
    expect(result.runs[0].tool.driver.rules[0].defaultConfiguration.level).toBe("note");
  });

  it("includes file locations with line and column when present", () => {
    const signals = [makeSignal({ file: "src/utils.ts", line: 25, column: 8 })];
    const result = formatSarif(makeScanResult({ signals }));

    const location = result.runs[0].results[0].locations[0];
    expect(location.physicalLocation.artifactLocation.uri).toBe("src/utils.ts");
    expect(location.physicalLocation.region?.startLine).toBe(25);
    expect(location.physicalLocation.region?.startColumn).toBe(8);
  });

  it("includes file location without region when line is absent", () => {
    const signals = [makeSignal({ file: "src/app.ts", line: undefined })];
    const result = formatSarif(makeScanResult({ signals }));

    const location = result.runs[0].results[0].locations[0];
    expect(location.physicalLocation.artifactLocation.uri).toBe("src/app.ts");
    expect(location.physicalLocation.region).toBeUndefined();
  });

  it("returns empty locations array when signal has no file", () => {
    const signals = [makeSignal({ file: undefined })];
    const result = formatSarif(makeScanResult({ signals }));

    expect(result.runs[0].results[0].locations).toHaveLength(0);
  });

  it("deduplicates rules by detectorId", () => {
    const signals = [
      makeSignal({ detectorId: "lexical", message: "first" }),
      makeSignal({ detectorId: "lexical", message: "second" }),
      makeSignal({ detectorId: "semantic", category: "semantic", message: "third" }),
    ];
    const result = formatSarif(makeScanResult({ signals }));

    expect(result.runs[0].tool.driver.rules).toHaveLength(2);
    expect(result.runs[0].results).toHaveLength(3);
  });

  it("returns empty results and rules for zero signals", () => {
    const result = formatSarif(makeScanResult({ signals: [] }));

    expect(result.runs[0].results).toHaveLength(0);
    expect(result.runs[0].tool.driver.rules).toHaveLength(0);
  });
});

describe("formatReport", () => {
  it("returns markdown summary string for 'markdown' format", () => {
    const scanResult = makeScanResult({ verdict: "clean", totalScore: 0 });
    const output = formatReport({ format: "markdown", scanResult });

    expect(output).toContain("### SlopGuardian Report");
    expect(output).toContain("[PASS]");
  });

  it("returns valid JSON string for 'json' format", () => {
    const scanResult = makeScanResult({ verdict: "suspicious", totalScore: 7 });
    const output = formatReport({ format: "json", scanResult });

    const parsed = JSON.parse(output);
    expect(parsed.version).toBe(1);
    expect(parsed.verdict).toBe("suspicious");
    expect(parsed.score).toBe(7);
  });

  it("returns valid SARIF JSON string for 'sarif' format", () => {
    const signals = [makeSignal({ file: "test.ts", line: 1 })];
    const scanResult = makeScanResult({ signals });
    const output = formatReport({ format: "sarif", scanResult });

    const parsed = JSON.parse(output);
    expect(parsed.$schema).toBe("https://json.schemastore.org/sarif-2.1.0.json");
    expect(parsed.version).toBe("2.1.0");
    expect(parsed.runs[0].results).toHaveLength(1);
  });

  it("passes version to SARIF formatter", () => {
    const scanResult = makeScanResult();
    const output = formatReport({ format: "sarif", scanResult, version: "2.0.0" });

    const parsed = JSON.parse(output);
    expect(parsed.runs[0].tool.driver.version).toBe("2.0.0");
  });

  it("returns pretty-printed JSON for json format", () => {
    const scanResult = makeScanResult();
    const output = formatReport({ format: "json", scanResult });

    // JSON.stringify with indent 2 produces multi-line output
    expect(output).toContain("\n");
    expect(output.split("\n").length).toBeGreaterThan(1);
  });
});
