# Pattern Authoring Guide

It's important to note that writing good detection patterns requires
understanding both the YAML schema and the scoring pipeline. This guide
walks through the full process.

## Prerequisites

You need a working dev environment with `pnpm install` completed. The
pattern tests run via `pnpm --filter @slopguardian/core test`.

## Step 1: Choose a category

Each pattern belongs to one of these categories:

| Category | Detects |
|---|---|
| lexical | Specific words and phrases |
| structural | Document shape, repetition, boilerplate |
| semantic | Filler ratio, hedging density |

Moving forward, we expect to add more categories as the engine evolves.

## Step 2: Define match strings

Match strings are literal substrings. The engine lowercases both the
input and the match string before comparison, so casing does not matter.

```yaml
match:
  - "it goes without saying"
  - "at the end of the day"
  - "in today's fast-paced world"
```

This elegant solution avoids regex complexity while still catching the
most common filler phrases across languages.

## Step 3: Set a weight

Weight determines how many points a single match contributes to the
total score. Most lexical patterns use weight 1 or 2. Higher weights
are reserved for strong signals like honeypot triggers.

This might potentially vary depending on the deployment context, so
we recommend starting with weight 1 and adjusting after reviewing
false-positive rates.

## Step 4: Add test cases

Every pattern must include `should-match` and `should-not-match` arrays.
The CI pipeline validates these automatically.

```yaml
should-match:
  - "It goes without saying that tests matter."
should-not-match:
  - "Write unit tests for every module."
```

## Common pitfalls

- Overly broad match strings cause false positives on technical docs
- Forgetting `should-not-match` cases leaves blind spots in validation
- Weights above 3 should be rare and well-justified
