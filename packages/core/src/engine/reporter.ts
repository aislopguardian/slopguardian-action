import type { ScanResult } from "../types/detection.js";
import type { FormatOptions, JsonReport, MarkdownReport, SarifReport } from "../types/report.js";

const SEVERITY_ICONS: Record<string, string> = {
  error: "X",
  warning: "!",
  info: "i",
};

export function formatMarkdown(scanResult: ScanResult): MarkdownReport {
  const verdictLabel =
    scanResult.verdict === "clean"
      ? "[PASS]"
      : scanResult.verdict === "suspicious"
        ? "[WARN]"
        : "[FAIL]";

  const verdictLine = `${verdictLabel} **Verdict: ${scanResult.verdict}** (score: ${scanResult.totalScore})`;

  const signalRows = scanResult.signals.map((s) => {
    const icon = SEVERITY_ICONS[s.severity] ?? "?";
    const location = s.file ? `${s.file}${s.line ? `:${s.line}` : ""}` : "—";
    return `| ${icon} | ${s.detectorId} | ${location} | ${s.message} |`;
  });

  const signalTable =
    scanResult.signals.length > 0
      ? `| | Detector | Location | Finding |\n|---|---|---|---|\n${signalRows.join("\n")}`
      : "No signals detected.";

  const suggestions = scanResult.signals
    .filter((s) => s.suggestion)
    .map((s) => `- **${s.file ?? "general"}**: ${s.suggestion}`)
    .filter((s, i, arr) => arr.indexOf(s) === i);

  const suggestionsText =
    suggestions.length > 0 ? `### What to fix\n\n${suggestions.join("\n")}` : "";

  const summary = [
    "### SlopGuardian Report\n",
    verdictLine,
    `\n${signalTable}`,
    suggestionsText ? `\n${suggestionsText}` : "",
  ].join("\n");

  return { summary, signalTable, verdictLine, suggestions: suggestionsText };
}

export function formatJson(scanResult: ScanResult): JsonReport {
  return {
    version: 1,
    verdict: scanResult.verdict,
    score: scanResult.totalScore,
    signalCount: scanResult.signals.length,
    signals: scanResult.signals,
  };
}

export function formatSarif(scanResult: ScanResult, version = "0.1.0"): SarifReport {
  const rules = Array.from(
    new Map(
      scanResult.signals.map((s) => [
        s.detectorId,
        {
          id: s.detectorId,
          shortDescription: { text: `${s.category} detector` },
          defaultConfiguration: {
            level:
              s.severity === "error"
                ? ("error" as const)
                : s.severity === "warning"
                  ? ("warning" as const)
                  : ("note" as const),
          },
        },
      ]),
    ).values(),
  );

  const results = scanResult.signals.map((s) => ({
    ruleId: s.detectorId,
    level: (s.severity === "error" ? "error" : s.severity === "warning" ? "warning" : "note") as
      | "error"
      | "warning"
      | "note",
    message: { text: s.message },
    locations: s.file
      ? [
          {
            physicalLocation: {
              artifactLocation: { uri: s.file },
              ...(s.line ? { region: { startLine: s.line, startColumn: s.column } } : {}),
            },
          },
        ]
      : [],
  }));

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "SlopGuardian",
            version,
            rules,
          },
        },
        results,
      },
    ],
  };
}

export function formatReport(options: FormatOptions): string {
  switch (options.format) {
    case "markdown":
      return formatMarkdown(options.scanResult).summary;
    case "json":
      return JSON.stringify(formatJson(options.scanResult), null, 2);
    case "sarif":
      return JSON.stringify(formatSarif(options.scanResult, options.version), null, 2);
  }
}
