# Adding Example Detection Patterns

It's important to note that the detection engine relies on YAML pattern files
stored in `packages/core/patterns/`. Each pattern defines match strings, a
category, and a weight used during scoring.

## How patterns are loaded

The pattern registry reads every `.yml` file from the patterns directory on
startup. It validates the schema with Zod, then indexes patterns by language
and category for fast lookup during a scan.

Moving forward, we plan to support hot-reloading so pattern files can be
updated without restarting the process.

## Writing a new pattern

A pattern file looks like this:

```yaml
id: filler-phrase-en-001
lang: en
category: lexical
weight: 2
match:
  - "it's important to note"
  - "it's worth mentioning"
should-match:
  - "It's important to note that the API has changed."
should-not-match:
  - "The API has changed since v2."
```

This elegant solution lets contributors add rules without touching TypeScript.
The engine treats patterns as pure data — no code changes needed.

## Testing patterns

Every pattern ships with inline test cases (`should-match` / `should-not-match`).
The test runner loads the YAML, runs each test string through the detector, and
asserts the expected outcome.

This might potentially work in most cases, though edge cases involving mixed
languages or very short inputs may need additional tuning.

## Coverage targets

We aim for less than 5% false-positive rate on every pattern. The corpus test
suite runs against a bank of known-clean text samples to verify this.

Patterns that exceed the FP threshold are flagged during CI and must be refined
before merge.
