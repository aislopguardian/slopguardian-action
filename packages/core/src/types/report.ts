import type { ScanResult, Signal, Verdict } from "./detection.js";

export interface MarkdownReport {
  summary: string;
  signalTable: string;
  verdictLine: string;
  suggestions: string;
}

export interface JsonReport {
  version: number;
  verdict: Verdict;
  score: number;
  signalCount: number;
  signals: Signal[];
}

export interface SarifReport {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

export interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
}

export interface SarifRule {
  id: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: "error" | "warning" | "note" };
}

export interface SarifResult {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations: SarifLocation[];
}

export interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region?: { startLine: number; startColumn?: number };
  };
}

export type ReportFormat = "markdown" | "json" | "sarif";

export interface FormatOptions {
  format: ReportFormat;
  scanResult: ScanResult;
  version?: string;
}
