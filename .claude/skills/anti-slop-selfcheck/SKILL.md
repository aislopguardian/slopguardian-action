---
name: anti-slop-selfcheck
description: ALWAYS-ON quality guardian. Fires on every response that produces code, comments, docs, or any text for the SlopGuardian repo.
trigger: always
---

# Anti-Slop Self-Check

Before writing ANY output for this repo, mentally scan for:

## Banned
- "It's important to note" / "It's worth mentioning" / "Please note that"
- "Robust and scalable" / "Comprehensive solution" / "Seamless integration"
- "Cutting-edge" / "State-of-the-art" / "Leveraging the power of"
- "In today's rapidly evolving" / "Empower developers" / "Streamline"
- "Deep dive" / "Delve into" / "Unpack" (metaphorical)
- Comments restating code
- Generic variable names (data, result, temp, value)
- JSDoc restating function names

## Instead
- Direct, specific language
- Concrete numbers and file names
- "Uses" not "leverages". "Lets you" not "empowers".
- Delete the sentence if it adds no information
- Write like a tired senior engineer, not a marketing page
