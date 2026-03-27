# Writing a Custom Detector

Each detector implements the `Detector` interface from `packages/core/src/types/`.

```ts
interface Detector {
  name: string;
  detect(input: DetectorInput): DetectorResult;
}
```

## Steps

1. Create a file in `packages/core/src/detectors/` named after your detector.
2. Export a function that accepts `DetectorInput` (the parsed diff, PR metadata, or issue body) and returns a `DetectorResult` containing zero or more `Signal` objects.
3. Each `Signal` carries a `score` (integer), a short `reason`, and the `location` where the pattern matched.
4. Register the detector in the pipeline array inside `packages/core/src/engine/pipeline.ts`.

## Scoring contract

- Return score 0 when nothing triggers.
- Keep individual signal scores between 1 and 5.
- The engine sums signals across all detectors; your detector does not decide the final verdict.

## Testing

Add a Vitest file next to your detector. Cover at least:

- One input that should produce zero signals.
- One input that should produce at least one signal with the expected score.
- One borderline input to verify the threshold behaves correctly.

Run `pnpm --filter @slopguardian/core test` to execute the suite.
