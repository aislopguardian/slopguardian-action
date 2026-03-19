# Changelog

## 0.3.0 (v3)

### Added

- **4th verdict tier: `needs-review`** (score 10-14). Labels and comments the PR without auto-closing it. Fills the gap between "suspicious" and "likely-slop" where maintainer attention is needed but closure is premature.
- **11 new PR-level checks**: `metadata-only-pr`, `generic-title`, `title-length`, `title-emoji`, `empty-description`, `short-description`, `verbose-description`, `added-comment-density`, `spam-username`, `template-unchecked`, `template-all-checked`.
- **`"action"` detector category** for PR-level structural signals (distinct from core content detectors).
- **Profile presets** (`strict`, `balanced`, `relaxed`, `monitor-only`): one input sets sensible defaults, overridable per-input.
- **6 granular check toggles**: `check-metadata-paths`, `check-title-quality`, `check-description-quality`, `check-added-comments`, `check-spam-username`, `check-template-compliance`.
- **`on-needs-review` action input**: separate action set for the new tier (default: `label,comment`).
- **`review-threshold` action input**: override the needs-review score boundary.
- `pr-checks.ts` module with 6 pure check functions.
- 25 new action tests (pr-checks, comment-builder v3, needs-review tier). Total: 161 tests.
- `ROADMAP.md` with v3.1, v3.2, v4.0 plans.

### Changed

- **Scoring thresholds rebalanced**: warn=6 (unchanged), review=10 (new), fail=15 (was 12). Backward compatible: existing configs without `review` get the default.
- **Comment format v3**: compact table with Check/Where/Detail/Pts columns. Signals beyond 10 collapse into expandable section. Score breakdown groups by category. Verdict-specific footer: `needs-review` says "needs manual review", `likely-slop` says "has been closed". Dismiss instruction with docs link.
- `blocked-branch` signal uses `"action"` category instead of `"consistency"`.
- `action.yml` description updated from "55+ detection rules" to "30+ checks, 4 verdict tiers".
- README: added "What's New in v3" section, updated all signal tables, version references, example output, test count.

## 0.2.0

### Fixed

- **Scoring double-weight bug**: `detectorWeights` and `categoryWeights` both applied to the same IDs, squaring the intended weight (semantic was 0.64x instead of 0.8x). `detectorWeights` now defaults to empty so each category applies one weight.
- **Action bypassed core scoring**: `main.ts` summed raw signal scores with `reduce()`, ignoring the weighted scorer entirely. Now uses `scoreToVerdict` from core.
- **Hardcoded fallback config**: `main.ts` duplicated the 30-line `DEFAULT_CONFIG` inline. Now imports it from core.
- **Dead error path in pipeline**: `runDetectorPipeline` always returned `ok()`, making the `isErr()` check in scanner dead code. Pipeline now returns `PipelineResult` directly.
- **Patterns directory path**: Used `process.cwd()` which points to the user's workspace, not the action repo. Now uses `__dirname`-relative path.
- **`formatJson` ignored version parameter**: Accepted `_version` but hardcoded `version: 1`. Removed the dead parameter.
- **CRLF line endings**: Fixed across the repo (biome expects LF).

### Changed

- **Comment format v2**: Compact one-line header with score and verdict. Signals in collapsible `<details open>` table. "How to fix" collapsed by default. Score breakdown in footer. Marker moved to end of comment.
- **`main.ts` split into functions**: `run()` was 207 lines. Now split into `buildContributorVerdict`, `analyzePr`, `analyzeIssue`, `applyVerdict` — each under 50 lines.

### Removed

- Dead `config/schema.ts` re-export (nothing imported it).

### Added

- **Hallucination detector tests** (22 tests): `extractStackTraceRefs` and `verifyStackTraces` — file existence, function lookup, line count verification, deduplication, edge cases.
- **Reporter tests** (34 tests): markdown, JSON, SARIF output formatting, verdict labels, signal tables, suggestions dedup.
- `DEFAULT_CONFIG` exported from core's public API.

### Documentation

- README: replaced inaccurate "31 checks" with actual count.
- README: corrected signal score ranges against actual pattern files.
- README: marked unimplemented features (grace period, language mismatch, negative reactions) as "(planned)".
- README: updated example comment to match v2 format.

## 0.1.0

Initial release. Core detection engine with 9 pattern files, 4 detectors (lexical, structural, semantic, code-smell), GitHub Action with honeypot, hallucination, and contributor checks.
