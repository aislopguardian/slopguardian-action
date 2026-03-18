# Adding a Custom Detector

Each detector implements the `Detector` interface from `packages/core/src/types/`.
The engine calls `detect(input: DetectorInput)` and expects back an array of `Signal` objects.

## Steps

1. Create a new file in `packages/core/src/detectors/` (e.g., `my-check.ts`).
2. Export a function matching this signature:

```ts
export function detect(input: DetectorInput): Signal[] {
  // Return one Signal per finding. Empty array means nothing flagged.
}
```

3. Register the detector in `packages/core/src/engine/pipeline.ts` by adding it to the `detectors` array.
4. Write tests in `packages/core/src/__tests__/detectors/my-check.test.ts`. Cover at least:
   - One input that should produce signals (known bad pattern).
   - One input that should return an empty array (known clean text).
5. Run `pnpm test --filter=core` and confirm both cases pass.

## Signal fields

| Field     | Type     | Purpose                              |
|-----------|----------|--------------------------------------|
| `id`      | `string` | Unique key, e.g. `my-check:finding`  |
| `score`   | `number` | Weight towards the total (1-5 range) |
| `message` | `string` | Human-readable explanation           |
| `line`    | `number` | Optional source line reference       |

Keep the `message` specific: state what was found and where, not a generic label.
