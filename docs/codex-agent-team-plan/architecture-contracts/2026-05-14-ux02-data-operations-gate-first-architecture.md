# UX-02 Data Operations Gate-First UX Architecture Contract

Date: 2026-05-14  
Mode: Architecture Planning Mode  
Work item: UX-02 - Data operations gate-first UX  
Owner lane: Frontend Data Operations  
Status: Architecture contract complete for planning. Runtime implementation is partially blocked by P0.2B in-flight frontend scope.

## 1. Objective

Define a pragmatic, gate-first UX architecture for Market Data Foundation and Data Quality Engine so an operator can answer, in order:

1. Is downstream work allowed now?
2. What is blocking it?
3. What bounded action is safe to run next?
4. Did the latest run/evaluation materially improve readiness?

This contract is for Phase 0 trusted-data-first execution and must not introduce broker automation behavior, paid provider assumptions, or decorative UI patterns.

## 2. Dependency And Release State

1. `UX-04 visual system hardening`: **Released** (available for density/typography/shared pattern usage).
2. `P0.2A data quality tier contract`: **Released** (tier semantics and policy-blocked automation state are available).
3. `P0.2B data quality UI tier visibility`: **In implementation** (planning only for overlapping Data Quality UI files).

Architecture rule for this packet:

- Any UX-02 slice touching active P0.2B file scope is blocked until P0.2B is released and merged.

## 3. Gate-First UX Architecture

## 3.1 Operator Reading Order (both pages)

1. Gate and signoff outcome.
2. Blockers (highest severity first).
3. Next bounded action (or explicit reason actions are disabled).
4. Progress/evidence from latest run.
5. Deep diagnostics and inventory details.

## 3.2 Market Data Trust/Signoff Header Contract

The Market Data top band must be a single trust gate container, not multiple equal-weight cards.

Required content:

- downstream gate state: `ALLOWED`, `LIMITED`, or `BLOCKED`
- trust/signoff status summary from existing Market Data contracts
- required/stored date boundary context
- top blocker families (coded reasons + concise text)
- one primary next bounded action and optional secondary action

Rules:

- completed run status must not be visually treated as full trust unless signoff + gate conditions are satisfied.
- success coloring is reserved for true gate-allowed states.

## 3.3 Bounded Repair/Backfill Status Contract

Repair workbench and run evidence must present queue-first operational status:

- queue size by lane
- eligible/retry/manual-required counts
- configured batch size and bounded scope
- last run start/end timestamps and before/after deltas
- explicit "another run needed" vs "drain complete" state

Disabled action controls must always render a deterministic reason.

## 3.4 Blocker-First Diagnostics Contract

Diagnostics ordering must be deterministic:

1. hard blockers
2. limited-readiness warnings
3. informational context

Each blocker item must include:

- stable machine code (or approved equivalent key)
- human-readable reason
- affected scope/count where available
- recommended next lane/action when applicable

## 3.5 Tier Readiness Display Contract (Data Quality)

Data Quality readiness display must reflect P0.2A tier contract directly and keep automation policy-blocked:

- `dailyReview`
- `signal`
- `backtest`
- `calibration`
- `automation` (must remain blocked by policy in Phase 0)

Rules:

- score chips/percentages cannot act as universal "ready" indicators.
- tier states are the canonical per-workflow decision surface.
- when tier payloads are absent (legacy compatibility), UI must degrade safely without crashes or false-ready presentation.

## 3.6 Batch Progress Semantics Contract

Batch progress must distinguish operational buckets, not one aggregate line:

- `processed`
- `evaluated`
- `skipped`
- `failed`
- `outOfScope`
- optional `pending` when total is known

Also required:

- determinate vs indeterminate handling
- visually distinct terminal states: completed, partial completion, error
- timestamps for last update and completion where available

## 3.7 User-Safe Action Availability Contract

Action availability must fail closed:

- no "run" or "promote" action enabled when gate prerequisites are unmet
- disabled buttons/chips must include clear reason text
- no UI copy may imply broker execution, autonomous trading, or policy-approved automation
- no new paid tools/providers/dependencies introduced by UX-02

## 4. Implementation Slices And Reserved Write Scopes

## Slice UX-02.S1 - Market Data Gate Header And Repair Evidence

Status: **Ready after UX-02 implementation authorization**  
Purpose: establish gate-first structure and bounded run evidence on Market Data page only.

Reserved write scope:

- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/tests/ui/market-data-foundation.spec.ts`
- `frontend/tests/ui/market-data-foundation-instrument.spec.ts`

Conflict boundary:

- no edits to Data Quality UI files in this slice.

## Slice UX-02.S2 - Shared Batch/Blocker Presentation Hardening

Status: **Ready after UX-02 implementation authorization**  
Purpose: upgrade shared progress/blocker semantics used by Market Data (and later DQ) without altering backend contracts.

Reserved write scope:

- `frontend/src/shared/components/BatchProgressBar.tsx`
- `frontend/src/shared/components/StatusBadge.tsx` (only if needed for state semantics)
- `frontend/src/shared/components/DataTable.tsx` (only additive diagnostics ordering affordances)
- `frontend/tests/ui/market-data-foundation.spec.ts`

Conflict boundary:

- avoid Data Quality feature-folder edits until P0.2B release.

## Slice UX-02.S3 - Data Quality Tier Gate Surface

Status: **Blocked until P0.2B release**  
Blocker: active overlap with P0.2B implementation files.

Overlapping blocked scope:

- `frontend/src/features/data-quality-engine/types.ts`
- `frontend/src/features/data-quality-engine/api/dataQualityEngineService.ts`
- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/tests/ui/data-quality-engine.spec.ts`

Planning note:

- design contract is approved, but implementation in this scope must wait for P0.2B merge/release to avoid file-level conflict and duplicated QA churn.

## Slice UX-02.S4 - Cross-Module Consistency And Final QA

Status: **Blocked on UX-02.S3 completion**  
Purpose: align Market Data + Data Quality final gate language, action-state semantics, and evidence capture.

Reserved write scope (post-unblock, minimal):

- Market Data + Data Quality files from S1/S3 only
- shared component deltas from S2 if required
- no backend/prisma/module logic files

## 5. Acceptance Criteria (Architecture Contract)

UX-02 is accepted when all are true:

1. Market Data top band presents one explicit downstream gate with trust/signoff context and next bounded action.
2. Repair lanes and run evidence clearly show queue sizes, bounded batch semantics, deltas, and "another run needed" state.
3. Blockers are presented before ready/neutral states and use deterministic severity ordering.
4. Data Quality displays all five use-case tiers when present and preserves safe fallback when absent.
5. Automation is visibly blocked by policy and never shown as execution-ready.
6. Batch progress distinguishes processed/evaluated/skipped/failed/out-of-scope (plus pending when applicable).
7. Disabled actions always carry explicit reason text; no silent disabled controls.
8. No paid providers/tools, broker automation cues, or gate-relaxing logic are introduced.
9. UX stays compact and operational (aligned to UX-04 density/visual rules), not decorative.

## 6. Forbidden Shortcuts

1. Do not collapse trust/signoff/readiness into a single optimistic "healthy" badge.
2. Do not infer backtest/calibration/signal readiness from generic score fields alone.
3. Do not style partial/manual-required/error run outcomes as success-adjacent.
4. Do not trigger unbounded repair/backfill/evaluate jobs from UI convenience actions.
5. Do not bypass disabled-state reason messaging.
6. Do not add paid vendor dependencies, paid observability tools, or broker execution claims.
7. Do not edit active P0.2B Data Quality UI files before P0.2B release.

## 7. QA Evidence Requirements

Required evidence artifacts for UX-02 implementation signoff:

1. Focused UI test pass evidence for touched modules only:
   - Market Data specs for S1/S2
   - Data Quality spec only after S3 unblocks
2. Runtime screenshots/video captures showing:
   - gate header blocked vs allowed examples
   - repair run partial/manual-required vs fully complete outcomes
   - blocker-first ordering with machine-readable codes visible
   - batch progress bucket counts in in-flight and terminal states
3. Scoped API smoke payload snapshots proving tier presence and legacy absence handling (post-S3).
4. Negative-case proof that automation remains policy-blocked in UI copy/state.
5. Explicit note that no broad/unbounded batch jobs were executed during QA.

Evidence storage target:

- `docs/codex-agent-team-plan/qa-evidence/` with a dated UX-02 evidence artifact.

## 8. Rollback Notes

If UX-02 implementation introduces operator confusion or false-ready cues:

1. Roll back by slice (`S4` -> `S3` -> `S2` -> `S1`) instead of one large revert.
2. Preserve backend P0.2A tier contract and Market Data trust APIs (frontend rollback only unless a separate incident is declared).
3. Restore previously stable Market Data/Data Quality page render paths first, then reintroduce gate-first pieces behind bounded feature flags if needed.
4. Re-run focused UI smoke after rollback to verify no regression in legacy compatibility paths.

## 9. Architecture Risks And Mitigations

1. **Risk:** Gate compression hides meaningful trust nuances.  
   **Mitigation:** Keep trust/signoff/readiness distinct in data model; unify only reading order and action framing.

2. **Risk:** Shared progress refactor causes cross-page regressions.  
   **Mitigation:** keep `BatchProgressBar` changes additive and validate only scoped consumers before wider adoption.

3. **Risk:** P0.2B overlap causes merge churn and contradictory UX behavior.  
   **Mitigation:** enforce S3 blocked status until P0.2B release; no preemptive edits in blocked files.

4. **Risk:** Users misread score improvements as workflow authorization.  
   **Mitigation:** treat tier states as canonical go/no-go and demote score chips to supporting context.

5. **Risk:** Action controls accidentally imply autonomous execution.  
   **Mitigation:** explicit policy-blocked automation state and copy review checklist in QA evidence gate.

## 10. Readiness Verdict

UX-02 architecture planning is complete and bounded.

- S1/S2 are ready for implementation authorization once a single owner is assigned.
- S3/S4 remain blocked until P0.2B Data Quality UI tier visibility is released and merged.
