export type Severity = "error" | "warning" | "info";

export type DetectorCategory = "lexical" | "structural" | "semantic" | "code-smell" | "consistency" | "action";

export interface Signal {
  detectorId: string;
  category: DetectorCategory;
  severity: Severity;
  score: number;
  file?: string;
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
  patternId?: string;
}

export interface FileAnalysis {
  filePath: string;
  signals: Signal[];
  totalScore: number;
}

export interface ScanResult {
  signals: Signal[];
  totalScore: number;
  verdict: Verdict;
  fileResults: Map<string, Signal[]>;
  detectorTimings: Map<string, number>;
}

export type Verdict = "clean" | "suspicious" | "needs-review" | "likely-slop";
