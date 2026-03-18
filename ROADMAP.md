# Roadmap

Planned features for SlopGuardian. These are not yet implemented.

## Planned PR Signals

| Signal | Detection Method | Score |
|---|---|:---:|
| Cosmetic-only diffs | Changed lines identical after trimming whitespace | **3** |
| Massive unfocused dumps | >500 added lines across >10 files | **4** |
| Dead code injection | Functions added but never called | **3** |
| Missing motivation | PR explains what but never says why | **2** |
| Features without tests | New code files, zero test files | **2** |
| Language mismatch | >50% of added files in unexpected language | **3** |
| Community reactions | Excess thumbs-down or confused reactions | **3** |

## Planned Issue Signals

| Signal | Detection Method | Score |
|---|---|:---:|
| Missing repro steps | No "steps to reproduce" section | **3** |
| Non-existent versions | Referenced version not in releases | **4** |
| Duplicate issues | >85% similarity to an open issue | **3** |

## Planned Features

- **Grace period**: Delay auto-close by N hours to give the author time to fix. The `grace-period-hours` input is accepted but not yet enforced.
