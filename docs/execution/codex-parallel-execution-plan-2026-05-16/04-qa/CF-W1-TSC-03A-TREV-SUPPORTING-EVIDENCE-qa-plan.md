# CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE QA Plan

Date: 2026-05-24

Owner: Team 04 QA Factory

Status: QA plan prepared but `blocked by active writer sequencing`.

Parent: `CF-W1-TSC-03 - Today Review supporting trust evidence`

Architecture packet: `03-architecture/CF-W1-TSC-03-architecture-review.md`

Contract packet: `06-contracts/CF-W1-TSC-03-supporting-trust-evidence-contract.md`

Work packet: `08-work-packets/CF-W1-TSC-03-work-packet.md`

## QA Verdict

Do not promote this child to Ready yet.

The QA plan is prepared for the bounded child `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`, but executable QA and Ready evaluation remain blocked until:

- Team 07 clears the active Today Review writer set from `CF-W1-TSC-02A-TREV-HEALTH`;
- Team 00 records the exact post-`TSC-02A` implementation base; and
- Team 07 provides an implementation handoff limited to the reserved Today Review files.

This planning pass does not approve implementation, executable validation, builds, servers, Playwright, commits, pushes, or Ready movement.

## Scope

Validation plan for additive Today Review supporting-trust evidence in list and detail surfaces.

Planned in-scope implementation surfaces after Team 00 sequencing clears:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Out of scope for this child:

- plain `dev` as the implementation base
- any base earlier than accepted `CF-W1-TSC-02A-TREV-HEALTH`
- Prisma schema, migrations, generated files, or persisted row shape changes
- Today Review repository/controller/router/validation/index edits
- backend or frontend route registry edits
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- shared backend utilities, shared frontend components, package manifests, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential scope
- upstream source/test edits in `data-quality-engine`, `signal-calibration-engine`, `backtesting-strategy-lab`, `signal-generation-engine`, `strategy-decision-engine`, or `trade-plan-risk-engine`
- new scoring, ranking, health-state rewrites, or Trade Plan-first workflow rewrites outside the reserved Today Review writer set

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `AGENTS.md`
- `10-requirements/CF-W1-TSC-03-today-review-supporting-trust-evidence-requirement.md`
- `03-architecture/CF-W1-TSC-03-architecture-review.md`
- `06-contracts/CF-W1-TSC-03-supporting-trust-evidence-contract.md`
- `08-work-packets/CF-W1-TSC-03-work-packet.md`
- `04-qa/CF-W1-TSC-02A-TREV-HEALTH-qa-plan.md`

Current source alignment checked in the repo:

- Today Review backend/frontend files and focused tests already exist at the exact reserved paths Team 03 named, so the child can stay inside one Today Review writer set after sequencing clears.
- Current `today-trade-review` types and service expose `dataQualitySnapshot`, `strategyProofSnapshot`, `tradePlanSnapshot`, `sourceSignalSnapshot`, and explainability structures, but there is no stable DQ/calibration/backtesting supporting-trust packet yet.
- Current UI/spec surfaces still contain Trade Plan-first wording and target/reward presentation, which confirms Team 03's requirement that this child must stack on accepted `TSC-02A` output rather than plain `dev`.
- Existing focused service and Playwright specs are the correct bounded verification surfaces for list/detail consistency, missing-field fallback, and language-safety regression checks after implementation.

## Required QA Assertions

- Implementation is stacked on the accepted outcome of `CF-W1-TSC-02A-TREV-HEALTH`. Any attempt to implement or validate from plain `dev` is a reject.
- Supporting-trust evidence is additive only and remains separate from accepted `TSC-02A` health semantics.
- List and detail tell the same supporting-trust story for the same candidate:
  - same DQ status posture
  - same calibration posture
  - same backtesting proof-currentness posture
  - same unavailable or missing posture
- Data Quality remains the hard gate:
  - blocked, missing, unsupported, or otherwise hard-blocked DQ must not silently upgrade a candidate
  - missing DQ residual detail must not be treated as passing evidence
  - DQ blocked must remain visibly blocked even when calibration or backtesting evidence exists
- `CF-W1-DQ-03` fields are reused only when present on the chosen base.
  - if present, residual category and residual summary render from module-owned fields
  - if absent, DQ status remains visible and residual summary renders explicit unavailable or missing state
  - Today Review must not recreate DQ residual-summary logic
- Calibration evidence remains module-owned only:
  - `status`, `downstreamInfluence`, `reasons`, and `blockers` are reused when available
  - `trustState` and `dqGateState` are shown only when the chosen base includes `CF-W1-CAL-01A`
  - if richer `CAL-01A` fields are absent, the UI shows unavailable or missing state instead of synthesizing them
- Backtesting proof-currentness remains module-owned only:
  - `CURRENT_PROOF`, `STALE_PROOF`, `REPAIRED_HISTORICAL`, and `LIMITED_HISTORICAL_PROOF` appear only when the chosen base includes accepted `CF-W1-BT-04`
  - if `BT-04` fields are absent, backtesting support renders explicit unavailable or missing state
  - Today Review must not derive fresh current/stale/historical labels from older backtesting fields
- Mixed-source fallback is conservative:
  - DQ may be available while calibration or backtesting are unavailable
  - calibration may be present while richer `CAL-01A` fields are absent
  - backtesting may be unavailable without affecting DQ hard-block semantics
  - no missing module-owned slice silently promotes the candidate
- Legacy compatibility is preserved:
  - existing Today Review rows remain readable
  - older snapshots that lack new support fields do not crash list or detail views
  - older snapshots render explicit unavailable or missing states instead of recreated upstream logic
- Product language stays research-supportive:
  - no target price, profit target, target/reward, reward/risk, `R:R`, Trade Plan-first, buy now, sell now, guaranteed, must buy, must sell, financial advice, or action-instruction wording on touched surfaces
  - supporting evidence must remain evidence framing, not ranking or advice framing

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Full supporting evidence on a richer base | Candidate row and detail both show DQ, calibration, and backtesting support with module-owned statuses, dates, and concise summaries; no aggregate score is introduced. |
| DQ hard-block with other evidence present | Candidate remains visibly blocked by DQ; calibration or backtesting evidence does not soften or silently upgrade the DQ story. |
| `DQ-03` absent from chosen base | DQ status still renders, but residual category/summary show explicit unavailable or missing state; Today Review does not recreate residual-summary logic. |
| Calibration `USABLE` | Candidate row/detail show module-owned usable readiness and downstream influence without converting it into a new trust score. |
| Calibration `LIMITED` | Candidate row/detail preserve limited posture and reasons; no silent promotion into stronger trust wording. |
| Calibration `UNAVAILABLE` or missing | Candidate row/detail show explicit unavailable or missing state, with no invented trust-state fallback. |
| `CAL-01A` richer fields absent | `trustState` and `dqGateState` display as unavailable or missing while base calibration readiness fields remain visible if present. |
| Backtesting `CURRENT_PROOF` on `BT-04` base | Candidate row/detail show the same current-proof label and concise explanation for the same candidate. |
| Backtesting `STALE_PROOF`, `REPAIRED_HISTORICAL`, or `LIMITED_HISTORICAL_PROOF` on `BT-04` base | Candidate row/detail preserve the exact module-owned label without implying fresher or stronger proof than the module provides. |
| `BT-04` absent from chosen base | Backtesting support renders explicit unavailable or missing state in both list and detail; no derived proof-currentness label appears. |
| Mixed-source older snapshot | Older rows missing some or all new support fields still render conservatively with explicit missing or unavailable states and no crash. |
| List/detail normalization | The same candidate shows the same support evidence posture, same summary, and same missing-evidence posture on both surfaces. |
| Language safety | Touched UI/doc/test output does not reintroduce target/R:R/advice-like language or Trade Plan-first framing. |
| Scope drift attempt | Any widening outside the reserved Today Review files or any upstream logic recreation is a QA reject. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Required implementation-base confirmation before executable QA:

```powershell
git rev-parse HEAD
git diff --name-only
```

Run a memory check before any process-heavy validation when practical:

```powershell
Get-Counter '\Memory\% Committed Bytes In Use'
```

Expected QA interpretation:

- do not start heavy validation if memory is at or above `95%`
- wait until memory drops below `90%` before builds or Playwright
- if memory cannot be measured reliably, treat build or Playwright startup as blocked unless Team 00 explicitly clears it
- run only one Playwright invocation at a time

Focused backend validation after Team 00 promotion, post-`TSC-02A` base confirmation, and Team 07 implementation handoff:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
```

Required backend build after accepted implementation and resource check:

```powershell
cd backend
npm.cmd run build
```

Required frontend build after accepted implementation and resource check because the child includes feature-local UI files:

```powershell
cd frontend
npm.cmd run build
```

Required feature-local UI smoke after accepted UI implementation, startup plan, memory/resource gate, and one-Playwright-worker sequencing:

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

Required language scan after implementation:

```powershell
rg -n "R:R|reward/risk|profit target|price target|target price|target / reward|buy now|sell now|must buy|must sell|guaranteed|financial advice|Trade Plan|trade-plan" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

Recommended support-field scan after implementation:

```powershell
rg -n "supportingEvidence|dataQuality|calibration|backtesting|CURRENT_PROOF|STALE_PROOF|REPAIRED_HISTORICAL|LIMITED_HISTORICAL_PROOF|UNAVAILABLE|MISSING|UNSUPPORTED" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

## UI Smoke Skipped-Check Policy

If the feature-local UI smoke is blocked during executable QA, record all four items exactly:

- `exact blocker`: for example active overlapping Playwright run, memory at or above the AGENTS threshold, missing startup plan, incorrect implementation base, active writer sequencing not actually cleared, or missing/incorrect reserved-file handoff
- `skipped command`: `cd frontend` then `npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1`
- `risk`: user-visible list/detail supporting-evidence consistency, explicit unavailable-state behavior, and language-safety evidence remain incomplete
- `next owner`: `Team 07` if implementation/spec gaps caused the block, `Team 00` if sequencing/startup/resource gating caused the block, then return to `Team 04` for rerun

UI smoke is required for this child because list/detail rendering and unavailable-state messaging are in scope. Do not replace it with a heading-only check or backend-only pass.

## Acceptance Criteria

Accept executable QA only if all of the following are true:

- Team 00 records the exact post-`TSC-02A` base under review
- the active Today Review writer set from `TSC-02A` is actually cleared before implementation begins
- changed files match the exact reserved Today Review file set
- focused backend test passes
- backend build passes
- frontend build passes
- Today Review UI smoke passes, or a blocked smoke is recorded with the exact skipped-check policy and Team 00 explicitly accepts the residual risk
- DQ hard-block behavior is proven fail-closed
- absent `DQ-03`, `CAL-01A`, or `BT-04` fields render explicit unavailable or missing states instead of recreated logic
- older snapshots missing new support fields remain readable
- list/detail consistency is proven for the same candidate
- no target/R:R/Trade Plan-first/advice leakage appears on touched surfaces

## Rejection Criteria

Reject the packet immediately and return it to Team 00 / Architect if implementation:

- is promoted to Ready or implemented before the active `TSC-02A` Today Review writer set is cleared
- runs from plain `dev` or from a base that Team 00 did not record explicitly
- edits any file outside the eight reserved Today Review files
- requires repository/controller/router/validation/index, route, schema, generated-file, package, shared utility, shared UI, or upstream module edits
- recreates DQ residual logic, richer calibration trust semantics, or backtesting current-proof logic inside Today Review
- allows blocked or missing DQ to read as supportive trust evidence
- silently upgrades missing calibration or backtesting evidence into a stronger support story
- breaks older Today Review rows or missing-field snapshots
- introduces target/R:R/Trade Plan-first/advice wording on touched surfaces

These are first-child rejection conditions, not soft warnings.

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- truthful implementation requires scope outside the reserved Today Review files
- Team 00 cannot identify the exact post-`TSC-02A` base
- active writer sequencing is still unresolved when implementation wants to start
- upstream module evidence is insufficient and the implementation attempts to compensate with invented heuristics
- UI smoke cannot be executed because startup or environment sequencing was not planned

## Evidence Required Later

- exact Team 07 branch/worktree under review and the recorded post-`TSC-02A` base
- changed-file list proving scope stayed within the reserved Today Review file set
- scenario evidence for full-evidence, DQ hard-block, `DQ-03` absent, calibration usable/limited/unavailable, `CAL-01A` richer-fields absent, `BT-04` absent, and mixed-source older-snapshot paths
- explicit scenario evidence for no silent upgrade when DQ, calibration, or backtesting support is missing
- explicit scenario evidence for older snapshot compatibility
- same-candidate list/detail consistency evidence
- memory check result or reason it could not be measured before heavy validation
- focused backend test output
- backend build output
- frontend build output
- feature-local UI smoke output, or the exact skipped-check record if blocked
- language-scan result or equivalent explicit assertion evidence
- explicit note that no forbidden scope and no recreated upstream trust logic occurred

No executable QA was run in this planning pass.
