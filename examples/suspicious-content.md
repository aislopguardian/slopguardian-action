# Scoring System Overview

It's important to note that the scoring system assigns points per signal.
Each detector returns zero or more signals, and the engine sums them.

## Verdict thresholds

| Range | Verdict    |
|-------|------------|
| 0-5   | clean      |
| 6-11  | suspicious |
| 12+   | likely-slop|

Moving forward, contributors should keep individual signal scores between 1 and 5.
The engine handles aggregation — detectors should not attempt to produce final verdicts on their own.

## Weight configuration

Weights live in `.slopguardian.yml` under `scoring.weights`. Each key maps a detector name to a float multiplier applied after signal scores are summed for that detector.

This elegant approach lets teams tune sensitivity without editing detector code. A team that rarely sees filler phrases can lower the lexical weight; a team drowning in boilerplate can raise the structural weight.

## Adding a new threshold

To add a fourth verdict tier, edit the `Thresholds` type in `packages/core/src/scoring/thresholds.ts` and update the verdict function. The action and MCP packages read verdicts from core, so no changes are needed downstream. It's worth noting that custom thresholds should be documented in the config schema so users can discover them.
