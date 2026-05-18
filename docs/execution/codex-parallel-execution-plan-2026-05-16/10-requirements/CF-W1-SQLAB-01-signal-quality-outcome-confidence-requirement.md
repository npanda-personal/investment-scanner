# CF-W1-SQLAB-01 - Signal Quality Outcome Confidence Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Signal Quality Lab is a review surface, not a trusted signal source. Investors and traders need to know whether an outcome, confidence score, or quality summary is based on DQ-ready evidence or is still only diagnostic. Without that distinction, the lab can overstate confidence and make review workflow outputs less trustworthy.

## Evidence

- Audit `11-module-audits/audit-strategy-signal-rules.md` found `signal-quality-lab` DQ filters are optional and query-driven.
- The same audit found Signal Quality Lab and Signal Calibration outputs should remain research-only unless DQ readiness is required or visibly marked untrusted.
- `11-module-audits/TEAM-06-lane2-dq-fail-closed-audit-2026-05-17.md` notes Signal Quality Lab is part of the Lane 2 DQ fail-closed gap and should not be treated as trusted by default.
- `11-module-audits/audit-qa-test-infrastructure.md` shows the repo already has focused test coverage patterns available for module-level validation, so a bounded confidence-label slice is practical to prepare.

## Acceptance Criteria

- Signal Quality Lab distinguishes trusted, limited, diagnostic, and untrusted outcome states with stable reason strings.
- Any confidence or quality summary makes clear when it is research-only rather than readiness-backed.
- Optional DQ filters do not silently imply strong trust when readiness evidence is missing.
- Existing public response fields stay backward-compatible unless a later accepted contract explicitly adds new outcome metadata.
- Focused tests cover trusted, limited, diagnostic, untrusted, and missing-readiness scenarios.

## Non-Goals

- No Signal Generation, Strategy Decision, or calibration rule rewrite in this draft.
- No Prisma schema, route registry, shared UI, frontend, provider, paid/cloud, telemetry, or broker work.
- No duplicate DQ scoring logic in Signal Quality Lab.
- No direct financial advice wording or target-price language.

## Next Gate

Architecture contract and QA plan for a bounded Signal Quality Lab outcome-confidence slice, with later implementation reserved to the Lane 2 module only.
