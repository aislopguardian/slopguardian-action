# Writing a Custom Detector

A detector is any object satisfying the `Detector` interface in `packages/core/src/detectors/base.ts`:

```ts
interface Detector {
  id: string;
  category: DetectorCategory;
  analyze(input: DetectorInput): Promise<Result<Signal[], DetectorError>>;
}
```

`DetectorInput` carries the file content, path, optional diff, and an arbitrary context map.
`analyze()` returns a `neverthrow` `Result` — either an array of `Signal` objects or a `DetectorError`.

## Signal shape

Each signal needs a `detectorId`, `category`, `severity` (error | warning | info), numeric `score`, and a `message`. Optional fields: `file`, `line`, `column`, `suggestion`, `patternId`.

The scoring engine sums signal scores across all detectors to produce the final verdict.

## Registering your detector

`Scanner.initializeDetectors()` in `packages/core/src/engine/scanner.ts` instantiates each built-in detector behind a config flag. To add yours:

1. Create `packages/core/src/detectors/my-detector.ts` implementing `Detector`.
2. Add an `enabled` toggle under `detectors` in the config schema (`packages/core/src/config/schema.ts`).
3. Push an instance into `this.detectors` inside `initializeDetectors()` when the flag is on.

The pipeline calls every registered detector in sequence and merges their signals.

## Testing

Write at least two Vitest cases: one input that should produce signals and one that should return an empty array. Check both the `score` values and the `message` text so regressions are caught early.
