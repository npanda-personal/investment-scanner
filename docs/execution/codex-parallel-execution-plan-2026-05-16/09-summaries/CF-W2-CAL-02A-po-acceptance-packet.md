# CF-W2-CAL-02A PO Acceptance Packet

Date: 2026-05-25

Owner: Team 00 - Master Orchestrator / Integration

## Work Item

`CF-W2-CAL-02A` - Signal Calibration scoped evidence-basis projection.

## Verdict

Accepted under standing Product Owner delegation.

## Acceptance Basis

- Team 03 prepared the architecture contract and work packet.
- Team 04 prepared and later accepted QA verification.
- Team 06 implemented the bounded Signal Calibration slice.
- Team 10 rejected two issues, Team 06 remediated them, Team 04 re-verified, and Team 10 accepted.
- Team 03 Architect Signoff accepted the final packet.

## Behavior Accepted

- Signal Calibration `/top` now exposes additive scoped page-summary evidence for selected `region`, `assetType`, and `horizon`.
- Calibration row `generatedAt` remains distinct from evidence-through timing.
- Evidence basis distinguishes measured, horizon-limited, and missing Signal Quality evidence.
- Missing Signal Quality evidence and failed `/top` fetches fail closed instead of leaving stale trusted summary state.
- Compare and list/top evidence-basis behavior uses the same visible summary-query shape for the same scope and horizon.

## Validation Evidence

- Backend focused test passed: `signal-calibration-engine.service.test.ts`, `27` tests.
- Backend build passed.
- Frontend build passed.
- Focused Signal Calibration UI spec passed on isolated `127.0.0.1:5174`, `2` tests.
- Phrase scan passed with only the expected safe guardrail string.

## Known Limitations

- Shared default Playwright base URL `127.0.0.1:5173` remains noisy in this environment; accepted UI evidence is from isolated `127.0.0.1:5174`.
- Existing frontend build large-chunk warning remains pre-existing and unrelated.
- This slice does not create durable evidence storage or edit Signal Quality source.

## Commit Scope

Commit only the accepted Team 06 worktree changes for `CF-W2-CAL-02A` plus associated QA/review/signoff/acceptance docs.

Do not push from this acceptance packet.
