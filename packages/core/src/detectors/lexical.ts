import { err, ok, type Result } from "neverthrow";
import type { Signal } from "../types/detection.js";
import type { PatternFile } from "../types/pattern.js";
import type { Detector, DetectorError, DetectorInput } from "./base.js";

interface CompiledPattern {
  regex: RegExp;
  score: number;
  max: number;
  description: string;
  patternId: string;
  context: string;
}

export class LexicalDetector implements Detector {
  readonly id = "lexical";
  readonly category = "lexical" as const;
  private compiledPatterns: CompiledPattern[] = [];

  loadPatterns(patternFiles: PatternFile[]): void {
    this.compiledPatterns = [];
    for (const file of patternFiles) {
      for (const entry of file.patterns) {
        try {
          this.compiledPatterns.push({
            regex: new RegExp(entry.pattern, entry.flags),
            score: entry.score,
            max: entry.max ?? entry.score * 3,
            description: entry.description,
            patternId: file.id,
            context: entry.context,
          });
        } catch {
          // Malformed regex in YAML — skip, logged at load time
        }
      }
    }
  }

  async analyze(input: DetectorInput): Promise<Result<Signal[], DetectorError>> {
    try {
      const signals: Signal[] = [];
      const lines = input.content.split("\n");

      for (const compiled of this.compiledPatterns) {
        if (!this.contextApplies(compiled.context, input.filePath)) {
          continue;
        }
        const matchSignals = this.findMatches(compiled, lines, input.filePath);
        signals.push(...matchSignals);
      }

      return ok(signals);
    } catch (cause) {
      return err({ detectorId: this.id, message: "Pattern matching failed", cause });
    }
  }

  private contextApplies(context: string, filePath: string): boolean {
    if (context === "any") return true;
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const codeExtensions = ["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "c", "cpp"];
    const proseExtensions = ["md", "txt", "rst", "adoc"];

    if (context === "code") return codeExtensions.includes(ext);
    if (context === "prose") return proseExtensions.includes(ext) || !codeExtensions.includes(ext);
    if (context === "comment") return codeExtensions.includes(ext);
    return true;
  }

  private findMatches(compiled: CompiledPattern, lines: string[], filePath: string): Signal[] {
    const signals: Signal[] = [];
    let accumulatedScore = 0;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex] ?? "";
      // Reset lastIndex for global regexes
      compiled.regex.lastIndex = 0;

      if (compiled.regex.test(line)) {
        accumulatedScore += compiled.score;
        if (accumulatedScore > compiled.max) break;

        signals.push({
          detectorId: this.id,
          category: this.category,
          severity: compiled.score >= 4 ? "error" : compiled.score >= 2 ? "warning" : "info",
          score: compiled.score,
          file: filePath,
          line: lineIndex + 1,
          message: compiled.description,
          suggestion: "Remove or rephrase this pattern",
          patternId: compiled.patternId,
        });
      }
    }

    return signals;
  }
}
