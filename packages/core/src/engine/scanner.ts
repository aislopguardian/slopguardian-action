import { type Result, err, ok } from "neverthrow";
import type { Detector, DetectorInput } from "../detectors/base.js";
import { CodeSmellDetector } from "../detectors/code-smell.js";
import { LexicalDetector } from "../detectors/lexical.js";
import { SemanticDetector } from "../detectors/semantic.js";
import { StructuralDetector } from "../detectors/structural.js";
import { PatternRegistry } from "../patterns/registry.js";
import { scoreSignals } from "../scoring/scorer.js";
import { DEFAULT_WEIGHTS } from "../scoring/weights.js";
import type { SlopGuardianConfig } from "../types/config.js";
import type { ScanResult, Signal } from "../types/detection.js";
import { runDetectorPipeline } from "./pipeline.js";

export interface ScannerError {
  message: string;
  cause?: unknown;
}

export interface FileInput {
  filePath: string;
  content: string;
  diff?: string;
}

export class Scanner {
  private config: SlopGuardianConfig;
  private detectors: Detector[] = [];
  private registry: PatternRegistry;

  constructor(config: SlopGuardianConfig, patternsDir?: string) {
    this.config = config;
    this.registry = new PatternRegistry();

    if (patternsDir) {
      this.registry.loadFromDirectory(patternsDir);
    }

    this.initializeDetectors();
  }

  private initializeDetectors(): void {
    if (this.config.detectors.lexical.enabled) {
      const lexical = new LexicalDetector();
      const languages = this.config.detectors.lexical.languages;
      const patterns = languages.flatMap((lang) => this.registry.getPatterns(lang));
      lexical.loadPatterns(patterns);
      this.detectors.push(lexical);
    }

    if (this.config.detectors.structural.enabled) {
      this.detectors.push(
        new StructuralDetector(this.config.detectors.structural["duplicate-threshold"]),
      );
    }

    if (this.config.detectors.semantic.enabled) {
      this.detectors.push(
        new SemanticDetector(
          this.config.detectors.semantic["max-filler-ratio"],
          this.config.detectors.semantic["max-hedging-density"],
        ),
      );
    }

    if (this.config.detectors["code-smell"].enabled) {
      this.detectors.push(
        new CodeSmellDetector(
          this.config.detectors["code-smell"]["max-comment-ratio"],
          this.config.detectors["code-smell"]["flag-generic-names"],
        ),
      );
    }
  }

  async scan(files: FileInput[]): Promise<Result<ScanResult, ScannerError>> {
    try {
      const allSignals: Signal[] = [];
      const fileResults = new Map<string, Signal[]>();
      const detectorTimings = new Map<string, number>();

      for (const file of files) {
        const input: DetectorInput = {
          content: file.content,
          filePath: file.filePath,
          diff: file.diff,
        };

        const { signals, timings } = await runDetectorPipeline(this.detectors, input);
        allSignals.push(...signals);
        fileResults.set(file.filePath, signals);

        for (const [detectorId, ms] of timings) {
          const existing = detectorTimings.get(detectorId) ?? 0;
          detectorTimings.set(detectorId, existing + ms);
        }
      }

      const thresholds = {
        warn: this.config.thresholds.warn,
        fail: this.config.thresholds.fail,
      };

      const scoringResult = scoreSignals(allSignals, DEFAULT_WEIGHTS, thresholds);

      return ok({
        signals: allSignals,
        totalScore: scoringResult.totalScore,
        verdict: scoringResult.verdict,
        fileResults,
        detectorTimings,
      });
    } catch (cause) {
      return err({
        message: `Scan failed: ${cause instanceof Error ? cause.message : String(cause)}`,
        cause,
      });
    }
  }
}
