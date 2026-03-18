import { performance } from "node:perf_hooks";
import { type Result, ok } from "neverthrow";
import type { Detector, DetectorError, DetectorInput } from "../detectors/base.js";
import type { Signal } from "../types/detection.js";

export interface PipelineResult {
  signals: Signal[];
  timings: Map<string, number>;
  errors: DetectorError[];
}

export async function runDetectorPipeline(
  detectors: Detector[],
  input: DetectorInput,
): Promise<Result<PipelineResult, DetectorError>> {
  const allSignals: Signal[] = [];
  const timings = new Map<string, number>();
  const errors: DetectorError[] = [];

  for (const detector of detectors) {
    const startMs = performance.now();
    const detectorResult = await detector.analyze(input);
    const elapsedMs = performance.now() - startMs;
    timings.set(detector.id, elapsedMs);

    if (detectorResult.isOk()) {
      allSignals.push(...detectorResult.value);
    } else {
      errors.push(detectorResult.error);
    }
  }

  return ok({ signals: allSignals, timings, errors });
}
