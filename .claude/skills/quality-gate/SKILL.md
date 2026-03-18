---
name: quality-gate
description: Pre-ship checklist. Run before any commit, PR, or merge.
trigger: before committing or creating PRs
---

# Quality Gate Checklist

Before shipping:
1. `pnpm typecheck` passes
2. `pnpm lint` passes
3. `pnpm test` passes
4. No `any` in changed files
5. No console.log in production code
6. Every new function < 50 lines
7. Every new file < 300 lines
8. Comments explain WHY, not WHAT
9. Variable names are domain-specific
10. Pattern YAML files have should-match and should-not-match tests
11. Commit message follows `type(scope): description` format
