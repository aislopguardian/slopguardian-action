import type { Result } from "neverthrow";
import type { DetectorCategory, Signal } from "../types/detection.js";

export interface DetectorInput {
  content: string;
  filePath: string;
  language?: string;
  diff?: string;
  context?: Record<string, unknown>;
}

export interface DetectorError {
  detectorId: string;
  message: string;
  cause?: unknown;
}

export interface Detector {
  id: string;
  category: DetectorCategory;
  analyze(input: DetectorInput): Promise<Result<Signal[], DetectorError>>;
}
