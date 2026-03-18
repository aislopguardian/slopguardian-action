# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.2.x | Yes |
| < 0.2 | No |

## Reporting a Vulnerability

Email **security@slopguardian.dev** with:

1. What you found
2. Steps to reproduce
3. Impact assessment

We respond within 48 hours. Do not open a public issue for security bugs.

## Scope

SlopGuardian runs in GitHub Actions with read-only access to PR diffs and issue bodies. It does not execute user code, store credentials, or make external network calls (unless the optional AI detector is enabled with a user-provided API key).

The action requests these permissions:
- `contents: read` — read repo files for hallucination checks
- `issues: write` — post review comments, add labels
- `pull-requests: write` — post review comments, add labels
