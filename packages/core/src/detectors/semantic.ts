import { err, ok, type Result } from "neverthrow";
import type { Signal } from "../types/detection.js";
import type { Detector, DetectorError, DetectorInput } from "./base.js";

const FILLER_WORDS = new Set([
  "just",
  "really",
  "very",
  "quite",
  "rather",
  "fairly",
  "basically",
  "essentially",
  "fundamentally",
  "simply",
  "actually",
  "literally",
  "virtually",
  "practically",
]);

const HEDGING_PHRASES = [
  /\bmight\b/i,
  /\bcould potentially\b/i,
  /\bperhaps\b/i,
  /\bgenerally speaking\b/i,
  /\bin most cases\b/i,
  /\btypically\b/i,
  /\bto some extent\b/i,
  /\bit'?s possible that\b/i,
  /\btend(s)? to\b/i,
  /\bmore or less\b/i,
];

export class SemanticDetector implements Detector {
  readonly id = "semantic";
  readonly category = "semantic" as const;
  private maxFillerRatio: number;
  private maxHedgingDensity: number;

  constructor(maxFillerRatio = 0.3, maxHedgingDensity = 0.2) {
    this.maxFillerRatio = maxFillerRatio;
    this.maxHedgingDensity = maxHedgingDensity;
  }

  async analyze(input: DetectorInput): Promise<Result<Signal[], DetectorError>> {
    try {
      const signals: Signal[] = [];
      const paragraphs = this.splitParagraphs(input.content);

      for (const para of paragraphs) {
        const fillerSignals = this.checkFillerRatio(para, input.filePath);
        const hedgingSignals = this.checkHedgingDensity(para, input.filePath);
        signals.push(...fillerSignals, ...hedgingSignals);
      }

      return ok(signals);
    } catch (cause) {
      return err({ detectorId: this.id, message: "Semantic analysis failed", cause });
    }
  }

  private splitParagraphs(content: string): Array<{ text: string; startLine: number }> {
    const lines = content.split("\n");
    const paragraphs: Array<{ text: string; startLine: number }> = [];
    let current = "";
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (line.trim() === "") {
        if (current.trim().length > 0) {
          paragraphs.push({ text: current.trim(), startLine: startLine + 1 });
        }
        current = "";
        startLine = i + 1;
      } else {
        if (current === "") startLine = i;
        current += `${line} `;
      }
    }

    if (current.trim().length > 0) {
      paragraphs.push({ text: current.trim(), startLine: startLine + 1 });
    }

    return paragraphs;
  }

  private checkFillerRatio(para: { text: string; startLine: number }, filePath: string): Signal[] {
    const words = para.text.toLowerCase().split(/\s+/);
    if (words.length < 10) return [];

    let fillerCount = 0;
    for (const word of words) {
      if (FILLER_WORDS.has(word)) fillerCount++;
    }

    const ratio = fillerCount / words.length;
    if (ratio <= this.maxFillerRatio) return [];

    return [
      {
        detectorId: this.id,
        category: this.category,
        severity: "warning",
        score: Math.min(Math.round(ratio * 10), 5),
        file: filePath,
        line: para.startLine,
        message: `High filler word density: ${(ratio * 100).toFixed(0)}% (${fillerCount}/${words.length} words)`,
        suggestion: "Remove filler words — they dilute the actual content",
      },
    ];
  }

  private checkHedgingDensity(
    para: { text: string; startLine: number },
    filePath: string,
  ): Signal[] {
    const words = para.text.split(/\s+/);
    if (words.length < 10) return [];

    let hedgeCount = 0;
    for (const phrase of HEDGING_PHRASES) {
      const matches = para.text.match(new RegExp(phrase.source, "gi"));
      if (matches) hedgeCount += matches.length;
    }

    const density = hedgeCount / words.length;
    if (density <= this.maxHedgingDensity) return [];

    return [
      {
        detectorId: this.id,
        category: this.category,
        severity: hedgeCount > 4 ? "warning" : "info",
        score: Math.min(hedgeCount, 5),
        file: filePath,
        line: para.startLine,
        message: `Hedging overload: ${hedgeCount} hedging phrases in ${words.length} words`,
        suggestion: "Pick a position. 'X does Y' beats 'X might potentially do Y in some cases'",
      },
    ];
  }
}
