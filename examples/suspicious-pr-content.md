# Pattern Scoring in SlopGuardian

## How the scoring pipeline works

Each detector in the pipeline produces signals with numeric scores. The engine
collects all signals, applies per-detector weights, and sums them into a final
score that maps to one of three verdicts: **clean** (0-5), **suspicious** (6-11),
or **likely-slop** (12+).

It's important to note that the scoring thresholds are fully configurable in
`.slopguardian.yml`. Teams can raise or lower them depending on how strict they
want enforcement to be.

## Detector weight table

| Detector | Default weight | Notes |
|---|---|---|
| LexicalDetector | 1.0 | Matches phrases from YAML pattern files |
| StructuralDetector | 1.0 | Catches boilerplate duplication |
| SemanticDetector | 1.2 | Filler-to-content ratio, hedging density |
| CodeSmellDetector | 1.0 | Comment ratio, dead code, unused imports |
| ConsistencyDetector | 0.8 | Cross-file naming conflicts |
| AIDetector | 1.5 | Optional LLM pass via OpenRouter |

## Why weighted scoring matters

This elegant approach lets teams tune detection to their codebase without
rewriting rules. A project that uses lots of inline comments can lower the
CodeSmellDetector weight so that high comment-to-code ratio does not trigger
false positives.

Moving forward, we plan to add per-language weight profiles so that a Python
project and a Rust project can ship with sensible defaults out of the box.

## Configuring thresholds

Override the defaults by adding a `scoring` block to your config:

```yaml
scoring:
  weights:
    lexical: 1.0
    structural: 1.0
    semantic: 1.2
    code-smell: 1.0
    consistency: 0.8
    ai: 1.5
  thresholds:
    suspicious: 6
    likely-slop: 12
```

This might potentially vary depending on the size of the team and how many
external contributors submit PRs, so there is no single correct threshold for
every project.

## Verdict actions

When a verdict is reached, the action posts a comment on the PR. The comment
is educational and non-accusatory — it lists the specific signals that fired,
the score each contributed, and concrete steps the author can take to address
them. No PR is auto-closed unless the repo owner explicitly enables that
behaviour and sets a grace period.
