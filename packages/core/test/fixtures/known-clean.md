SlopGuardian runs 31 checks on every PR. No AI required for any of them.

The lexical detector loads YAML pattern files at startup, compiles each regex once,
and runs them against the input. Pattern files live in packages/core/patterns/{lang}/
and follow a strict schema validated by Zod.

Scoring works by weighted sum. Each detector produces signals with individual scores.
The scorer multiplies by detector weight, caps at pattern.max, and sums everything.
Default thresholds: 0-5 clean, 6-11 suspicious, 12+ likely-slop.

To add a new pattern:
1. Create a YAML file in packages/core/patterns/en/
2. Add 3+ should-match and 3+ should-not-match test cases
3. Run `pnpm test` to validate against the corpus
4. Submit a PR — the self-check workflow runs on it
