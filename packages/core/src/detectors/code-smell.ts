import { err, ok, type Result } from "neverthrow";
import type { Signal } from "../types/detection.js";
import type { Detector, DetectorError, DetectorInput } from "./base.js";

const GENERIC_NAMES = new Set([
  "data",
  "result",
  "temp",
  "value",
  "item",
  "element",
  "obj",
  "val",
  "res",
  "ret",
  "tmp",
  "info",
]);

const UNUSED_IMPORT_PATTERN = /^import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from\s+/;

export class CodeSmellDetector implements Detector {
  readonly id = "code-smell";
  readonly category = "code-smell" as const;
  private maxCommentRatio: number;
  private flagGenericNames: boolean;

  constructor(maxCommentRatio = 0.4, flagGenericNames = true) {
    this.maxCommentRatio = maxCommentRatio;
    this.flagGenericNames = flagGenericNames;
  }

  async analyze(input: DetectorInput): Promise<Result<Signal[], DetectorError>> {
    try {
      const isCodeFile = this.isCode(input.filePath);
      if (!isCodeFile) return ok([]);

      const signals: Signal[] = [];
      const lines = input.content.split("\n");

      signals.push(...this.checkCommentRatio(lines, input.filePath));
      signals.push(...this.checkRestatingComments(lines, input.filePath));
      if (this.flagGenericNames) {
        signals.push(...this.checkGenericNames(lines, input.filePath));
      }
      signals.push(...this.checkUnusedImports(lines, input.content, input.filePath));

      return ok(signals);
    } catch (cause) {
      return err({ detectorId: this.id, message: "Code smell analysis failed", cause });
    }
  }

  private isCode(filePath: string): boolean {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    return ["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "c", "cpp"].includes(ext);
  }

  private checkCommentRatio(lines: string[], filePath: string): Signal[] {
    let commentLines = 0;
    let codeLines = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "") continue;
      if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
        commentLines++;
      } else {
        codeLines++;
      }
    }

    const total = commentLines + codeLines;
    if (total < 10) return [];

    const ratio = commentLines / total;
    if (ratio <= this.maxCommentRatio) return [];

    return [
      {
        detectorId: this.id,
        category: this.category,
        severity: "warning",
        score: 3,
        file: filePath,
        line: 1,
        message: `Comment-to-code ratio: ${(ratio * 100).toFixed(0)}% (${commentLines} comment lines / ${total} total)`,
        suggestion: "High comment ratio often means comments restate code. Delete obvious ones.",
      },
    ];
  }

  private checkRestatingComments(lines: string[], filePath: string): Signal[] {
    const signals: Signal[] = [];

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]?.trim() ?? "";
      const nextLine = lines[i + 1]?.trim() ?? "";

      if (!line.startsWith("//")) continue;
      if (nextLine === "") continue;

      const commentText = line.replace(/^\/\/\s*/, "").toLowerCase();
      const codeSimplified = nextLine
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[^a-zA-Z\s]/g, " ")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      if (commentText.length < 5) continue;

      const commentWords = new Set(commentText.split(/\s+/));
      const codeWords = new Set(codeSimplified.split(/\s+/));
      let overlap = 0;
      for (const word of commentWords) {
        if (codeWords.has(word) && word.length > 2) overlap++;
      }

      const overlapRatio = commentWords.size > 0 ? overlap / commentWords.size : 0;
      if (overlapRatio > 0.6) {
        signals.push({
          detectorId: this.id,
          category: this.category,
          severity: "warning",
          score: 2,
          file: filePath,
          line: i + 1,
          message: "Comment restates the code below it",
          suggestion: "Delete this comment — the code already says what it does",
        });
      }
    }

    return signals;
  }

  private checkGenericNames(lines: string[], filePath: string): Signal[] {
    const signals: Signal[] = [];
    const varPattern = /\b(?:const|let|var)\s+(\w+)\s*[=:]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const match = varPattern.exec(line);
      if (!match?.[1]) continue;

      if (GENERIC_NAMES.has(match[1].toLowerCase())) {
        signals.push({
          detectorId: this.id,
          category: this.category,
          severity: "info",
          score: 1,
          file: filePath,
          line: i + 1,
          message: `Generic variable name '${match[1]}' — name it after what it holds`,
          suggestion: `Rename '${match[1]}' to describe its contents (e.g., 'userScore', 'configPath')`,
        });
      }
    }

    return signals;
  }

  private checkUnusedImports(lines: string[], fullContent: string, filePath: string): Signal[] {
    const signals: Signal[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const importMatch = UNUSED_IMPORT_PATTERN.exec(line);
      if (!importMatch) continue;

      const namedImports = importMatch[1];
      const defaultImport = importMatch[2];

      if (defaultImport) {
        const usageCount = this.countUsages(defaultImport, fullContent, i);
        if (usageCount === 0) {
          signals.push(this.unusedImportSignal(defaultImport, filePath, i + 1));
        }
      }

      if (namedImports) {
        const names = namedImports.split(",").map(
          (n) =>
            n
              .trim()
              .split(/\s+as\s+/)
              .pop()
              ?.trim() ?? "",
        );
        for (const name of names) {
          if (name === "" || name.startsWith("type ")) continue;
          const cleanName = name.replace(/^type\s+/, "");
          const usageCount = this.countUsages(cleanName, fullContent, i);
          if (usageCount === 0) {
            signals.push(this.unusedImportSignal(cleanName, filePath, i + 1));
          }
        }
      }
    }

    return signals;
  }

  private countUsages(name: string, content: string, importLineIndex: number): number {
    const lines = content.split("\n");
    let count = 0;
    const wordBoundary = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);

    for (let i = 0; i < lines.length; i++) {
      if (i === importLineIndex) continue;
      if (wordBoundary.test(lines[i] ?? "")) count++;
    }

    return count;
  }

  private unusedImportSignal(name: string, filePath: string, line: number): Signal {
    return {
      detectorId: this.id,
      category: this.category,
      severity: "warning",
      score: 2,
      file: filePath,
      line,
      message: `Import '${name}' is never used in this file`,
      suggestion: "Remove unused imports",
    };
  }
}
