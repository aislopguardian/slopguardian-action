import { type Result, err, ok } from "neverthrow";
import type { Signal } from "../types/detection.js";
import type { Detector, DetectorError, DetectorInput } from "./base.js";

export class StructuralDetector implements Detector {
  readonly id = "structural";
  readonly category = "structural" as const;
  private duplicateThreshold: number;

  constructor(duplicateThreshold = 0.85) {
    this.duplicateThreshold = duplicateThreshold;
  }

  async analyze(input: DetectorInput): Promise<Result<Signal[], DetectorError>> {
    try {
      const signals: Signal[] = [];
      const blocks = this.extractBlocks(input.content);

      const duplicates = this.findDuplicateBlocks(blocks);
      for (const dup of duplicates) {
        signals.push({
          detectorId: this.id,
          category: this.category,
          severity: "warning",
          score: 3,
          file: input.filePath,
          line: dup.line,
          message: `Duplicate block (${Math.round(dup.similarity * 100)}% similar to line ${dup.originalLine})`,
          suggestion: "Extract shared logic into a function or remove the duplicate",
        });
      }

      return ok(signals);
    } catch (cause) {
      return err({ detectorId: this.id, message: "Structural analysis failed", cause });
    }
  }

  private extractBlocks(content: string): Array<{ text: string; line: number }> {
    const lines = content.split("\n");
    const blocks: Array<{ text: string; line: number }> = [];
    let currentBlock = "";
    let blockStart = 0;
    const minBlockSize = 3;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();

      if (trimmed === "" || trimmed === "{" || trimmed === "}") {
        if (currentBlock.split("\n").length >= minBlockSize) {
          blocks.push({ text: currentBlock.trim(), line: blockStart + 1 });
        }
        currentBlock = "";
        blockStart = i + 1;
      } else {
        if (currentBlock === "") blockStart = i;
        currentBlock += `${line}\n`;
      }
    }

    if (currentBlock.split("\n").length >= minBlockSize) {
      blocks.push({ text: currentBlock.trim(), line: blockStart + 1 });
    }

    return blocks;
  }

  private findDuplicateBlocks(
    blocks: Array<{ text: string; line: number }>,
  ): Array<{ line: number; originalLine: number; similarity: number }> {
    const duplicates: Array<{ line: number; originalLine: number; similarity: number }> = [];
    const seen = new Set<number>();

    for (let i = 0; i < blocks.length; i++) {
      if (seen.has(i)) continue;
      const blockA = blocks[i];
      if (!blockA) continue;

      for (let j = i + 1; j < blocks.length; j++) {
        if (seen.has(j)) continue;
        const blockB = blocks[j];
        if (!blockB) continue;

        const similarity = this.calculateSimilarity(blockA.text, blockB.text);
        if (similarity >= this.duplicateThreshold) {
          seen.add(j);
          duplicates.push({
            line: blockB.line,
            originalLine: blockA.line,
            similarity,
          });
        }
      }
    }

    return duplicates;
  }

  /** Jaccard similarity over normalized trigrams */
  private calculateSimilarity(textA: string, textB: string): number {
    const normalize = (t: string) => t.replace(/\s+/g, " ").toLowerCase();
    const trigramsOf = (t: string): Set<string> => {
      const trigrams = new Set<string>();
      const normalized = normalize(t);
      for (let i = 0; i <= normalized.length - 3; i++) {
        trigrams.add(normalized.slice(i, i + 3));
      }
      return trigrams;
    };

    const setA = trigramsOf(textA);
    const setB = trigramsOf(textB);
    let intersection = 0;
    for (const trigram of setA) {
      if (setB.has(trigram)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }
}
