---
name: action-dev
description: Guide for working on the GitHub Action in packages/action/
trigger: when editing action source, tests, or action.yml
---

# Action Development

## Architecture
- Entry: src/main.ts — orchestrates the full check flow
- Inputs validated via Zod in src/inputs.ts
- GitHub API via src/github.ts (Octokit wrapper)
- One comment per PR/issue, found by HTML marker, upserted on re-trigger

## Key flows
- PR: parse diff → run core scanner → honeypot check → contributor eval → score → comment/label/close
- Issue: extract stack traces → verify files/functions/lines → score → comment

## Rules
- Action-specific detectors (honeypot, hallucination, contributor) live in packages/action, not core
- Core detectors live in packages/core — action just calls Scanner
- Every action input has Zod validation
- Test with fixture diffs, not live GitHub API calls
