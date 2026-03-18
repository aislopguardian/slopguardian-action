---
name: slop-patterns
description: Guide for writing and testing YAML detection patterns in packages/core/patterns/
trigger: when working on pattern files
---

# Writing Detection Patterns

## File structure
```yaml
id: unique-kebab-case-id
name: Human-Readable Name
category: lexical | structural
severity: error | warning | info
language: en
score-base: 1-10
patterns:
  - pattern: "regex"
    flags: "i"
    context: any | prose | code | comment
    score: 1-10
    max: optional-cap
    description: "what this catches — be specific"
tests:
  should-match:
    - "at least 3 examples"
  should-not-match:
    - "at least 3 false-positive guards"
```

## Rules
- Every pattern needs 3+ should-match AND 3+ should-not-match
- Test false positives: legitimate uses of the same words
- Descriptions say what the pattern catches, not what it "does"
- score-base 1-3 for style issues, 4-5 for strong signals, 6+ reserved for identity leaks
