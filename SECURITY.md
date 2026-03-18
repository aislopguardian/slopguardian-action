# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| v0.x (latest) | Yes |

## Reporting a Vulnerability

Report security issues to **aislopguardian@proton.me**.

Do not open a public GitHub issue for security vulnerabilities.

Include in your report:

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Impact assessment (what an attacker could do)

## What to Expect

- Acknowledgment within 48 hours
- Status update within 7 days
- Fix timeline depends on severity — critical issues get patched within 72 hours

## Scope

SlopGuardian runs as a GitHub Action in CI. Security-relevant areas:

- **Pattern regex** — A crafted regex in a YAML pattern file could cause ReDoS (catastrophic backtracking). All contributed patterns are reviewed for this.
- **GitHub token handling** — The action receives `GITHUB_TOKEN` with write permissions. It must never log, expose, or transmit this token beyond GitHub API calls.
- **PR body parsing** — The action parses untrusted input (PR descriptions, issue bodies, diffs). Injection through these inputs must not affect action behavior beyond detection scoring.
- **Optional AI key** — When `ai-key` is provided, it's sent only to the configured provider endpoint. It must never appear in logs, comments, or action outputs.

Out of scope: the detection accuracy itself (false positives/negatives are bugs, not security issues).

## Disclosure

We follow coordinated disclosure. After a fix is released, we publish a GitHub Security Advisory with full details.
