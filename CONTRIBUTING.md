# Contributing to SlopGuardian

We accept PRs for new detection patterns, bug fixes, and detector improvements.

## Setup

```bash
git clone https://github.com/aislopguardian/slopguardian-action.git
cd slopguardian-action
pnpm install
pnpm build
pnpm test
```

Requires Node 20+ and pnpm 9+.

## Before Submitting

Run the full quality check:

```bash
pnpm quality    # lint + typecheck + test
```

All three must pass. The CI runs the same checks.

## Adding Detection Patterns

The fastest way to contribute. Pattern files are YAML in `packages/core/patterns/{lang}/`.

### 1. Create the file

```yaml
# packages/core/patterns/en/my-pattern.yaml
id: my-pattern
name: My Pattern
category: lexical
severity: warning
language: en
score-base: 2
patterns:
  - pattern: "\\bregex here\\b"
    flags: "i"
    context: prose       # prose | code | comment | any
    score: 2
    description: "what this catches and why it matters"
tests:
  should-match:
    - "text that triggers the pattern"
    - "another triggering example"
    - "third example"
  should-not-match:
    - "legitimate text that looks similar"
    - "another false-positive guard"
    - "third safe example"
```

### 2. Rules for patterns

- Minimum 3 `should-match` and 3 `should-not-match` test cases
- False positive rate under 5% — when in doubt, add more `should-not-match` cases
- Descriptions say what the pattern catches, not "detects bad patterns"
- `context` matters: prose patterns should not fire on code
- `score-base` 1-3 for style issues, 4-5 for strong signals

### 3. Test it

```bash
pnpm --filter @slopguardian/core test
```

The pattern validation test (`test/patterns/pattern-validation.test.ts`) automatically checks every YAML file's inline test cases.

## Writing Detectors

Detectors implement the `Detector` interface in `packages/core/src/detectors/base.ts`:

```typescript
interface Detector {
  id: string;
  category: DetectorCategory;
  analyze(input: DetectorInput): Promise<Result<Signal[], DetectorError>>;
}
```

Each detector:
- Returns `Result<Signal[], DetectorError>` (neverthrow, no throw)
- Produces `Signal` objects with score, severity, file, line, message
- Lives in its own file under `packages/core/src/detectors/`
- Gets registered in `Scanner.initializeDetectors()`

### Testing detectors

Every detector needs:
- Tests with known-slop input (must produce signals)
- Tests with known-clean input (must produce zero signals)
- Edge cases: empty input, single-line input, binary-looking content

## Code Style

| Rule | Detail |
|---|---|
| TypeScript | `strict: true`, zero `any`, use `unknown` + type guards |
| Errors | `neverthrow` Result types for fallible ops, no throw for business logic |
| Functions | Max 50 lines. Split if exceeded. |
| Files | Max 300 lines. Split if exceeded. |
| Comments | Only WHY, never WHAT. Delete comments a junior could derive from reading the next line. |
| Names | Domain-specific. `calculateWeightedSlopScore` not `calcScore`. |
| Imports | No barrel exports. Import from specific modules. |
| Logging | No `console.log`. Use `@actions/core` in the action package. |

## Commits

```
type(scope): description

# types: feat | fix | docs | test | refactor | chore | perf | ci
# scopes: core | action | site | deps
```

Imperative mood. Say what changed and where. Reference issue numbers for features and fixes.

```
fix(core): skip version field in package.json dependency scan (#47)
```

Not:

```
fix: improve code quality and fix various issues
```

## PR Guidelines

- Title matches commit convention
- Body: what changed, why, how to test
- One focused change per PR — split large changes into multiple PRs
- New patterns: include the YAML file and verify tests pass
- New detectors: include unit tests with slop and clean fixtures

## Monorepo Structure

```
packages/
  core/       detection engine — detectors, patterns, scoring, reporter
  action/     GitHub Action — wraps core, adds honeypot/hallucination/contributor checks
```

Core imports nothing from action. Action imports from core.

## Questions?

Open an issue. We respond to bug reports and feature requests.
