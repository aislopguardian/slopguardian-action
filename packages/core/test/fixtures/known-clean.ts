import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { type PatternFile, PatternFileSchema } from "../types/pattern.js";

interface LoadResult {
  patterns: PatternFile[];
  errorCount: number;
}

function loadPatternsFromDirectory(patternsDir: string): LoadResult {
  const patterns: PatternFile[] = [];
  let errorCount = 0;

  const yamlFiles = readdirSync(patternsDir).filter((f) => f.endsWith(".yaml"));

  for (const fileName of yamlFiles) {
    const filePath = join(patternsDir, fileName);
    const rawContent = readFileSync(filePath, "utf-8");
    const parsed = yaml.load(rawContent);
    const validated = PatternFileSchema.safeParse(parsed);

    if (validated.success) {
      patterns.push(validated.data);
    } else {
      errorCount++;
    }
  }

  return { patterns, errorCount };
}

// fs.watch fires twice per save on Windows — debounce 100ms
const DEBOUNCE_MS = 100;

function calculateWeightedSlopScore(
  detectorSignals: Map<string, number>,
  weights: Map<string, number>,
): number {
  let totalScore = 0;

  for (const [detectorId, rawScore] of detectorSignals) {
    const weight = weights.get(detectorId) ?? 1.0;
    totalScore += rawScore * weight;
  }

  return Math.round(totalScore * 100) / 100;
}
