# CF-W2 Dirty Change Reconciliation Report

Date: 2026-05-17

Status: Reconciliation evidence only. No staging, commit, revert, or QA/review/signoff approval.

## 1. Executive Summary

Continuous Factory Wave 2 stopped after source and test edits were made before readiness was proven and before QA, code review, Architect signoff, Product Owner packet, or commit.

The dirty changes are module-local and bounded to Data Quality Engine and Signal Generation Engine. No Prisma, route registry, shared utility, shared UI, package, frontend, provider, startup, `AGENTS.md`, deleted `docs/AGENTS.md`, or old-plan files are dirty.

Recommendation:
- Split the dirty work into two requirement tracks.
- Treat Data Quality fail-closed defaults as the safer bounded slice.
- Treat Signal Generation fail-closed behavior as partially acceptable only for the run path, with unresolved gaps that require Product Owner and Architect decision before it can continue.

Dirty changes are not ready to commit.

Dirty changes should not be reverted automatically. Revert or preserve decisions require Product Owner approval.

## 2. Current Git State

Branch:

```text
dev
```

Recent commits:

```text
395cb40 docs: establish continuous execution factory wave 1
f8bcef3 test: add signal generation data quality enforcement characterization
99dd324 test: add market data storage readiness characterization
2e19421 test: add market data readiness evidence coverage
0ed5853 test: add data quality readiness invariants
ed69d88 docs: record sprint 1b go no-go decision
193dde7 docs: record sprint 1b preparation decisions
ab8f936 docs: reorganize active execution plan
a8c071e Add market data planning docs
14147fe Improve market data backfill and Angel provider flow
```

Dirty file list:

```text
M backend/src/modules/data-quality-engine/data-quality-engine.service.ts
M backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts
M backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts
M backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts
M backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts
M backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts
```

Untracked files:

```text
None observed before reconciliation docs were created.
```

Staged status:

```text
No staged files. git diff --cached --name-status returned empty output.
```

Diff stat before reconciliation docs:

```text
6 files changed, 89 insertions(+), 24 deletions(-)
```

## 3. Dirty File Classification Table

| Path | Classification | Requirement mapping | Module-local | Shared/high-risk | Preserve / revise / revert recommendation | Decision owner |
| --- | --- | --- | --- | --- | --- | --- |
| `backend/src/modules/data-quality-engine/data-quality-engine.service.ts` | Data Quality fail-closed default change | `CF-W2-DQ-01` | Yes | Product behavior impact, but no shared file | Preserve pending QA/review/signoff; do not commit until accepted | Product Owner + Architect + QA |
| `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts` | Test-only support | `CF-W2-DQ-01` | Yes | No | Preserve with DQ track | QA |
| `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts` | Signal Generation DQ fail-closed change | `CF-W2-SIG-01` | Yes | Product behavior impact; downstream trust impact | Revise or explicitly accept as bounded run-path slice with limitations | Product Owner + Architect + QA |
| `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts` | Signal Generation validation change | `CF-W2-SIG-01` | Yes | Product behavior impact | Revise or explicitly accept with limitation that explicit `false` remains available | Product Owner + Architect + QA |
| `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts` | Test-only support | `CF-W2-SIG-01` | Yes | No | Preserve if Signal track proceeds; otherwise rework with source decision | QA |
| `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts` | Test-only support | `CF-W2-SIG-01` | Yes | No | Preserve if Signal track proceeds; otherwise rework with source decision | QA |

No dirty file is unrelated.

## 4. Data Quality Review

Dirty change:
- `filterEligibleInstruments()` now defaults missing Data Quality evaluations to `SKIP`.
- The older fallback, `WARN_AND_PROCESS`, is still available only when a caller explicitly requests `missingQualityBehavior: 'WARN_AND_PROCESS'`.
- A focused service test proves a missing evaluation is excluded by default and counted with a warning.

Invariant review:

| Invariant | Result |
| --- | --- |
| Missing evaluation defaults to safe blocked/not-ready behavior | Resolved by dirty change. |
| Unknown/untrusted readiness does not pass as trusted | Preserved by existing readiness/status checks, with missing now excluded by default. |
| READY/TRUSTWORTHY remains downstream-eligible | Preserved. |
| LIMITED remains warning-gated or blocked according to contract | Preserved by default allowed statuses of `READY` only unless caller opts into limited. |
| NOT_READY/BLOCKED/UNUSABLE/NOT_TRUSTWORTHY remains downstream-blocked | Preserved by existing checks and `skipUnusable` default. |
| No live provider, Angel One, startup, UI, schema, route, shared utility, or package dependency introduced | Confirmed from diff. |

Assessment:
- Acceptable as a bounded Data Quality fail-closed implementation slice after QA/review/Architect/PO evidence.
- Risk: changing the default can affect any caller that previously relied on warning-and-process behavior. This is a product behavior change and needs Product Owner and Architect acceptance before commit.

## 5. Signal Generation Review

Dirty changes:
- `run()` now treats Data Quality filtering as enabled unless `useDataQualityFilter === false`.
- Default missing quality behavior sent to DQ filter changed to `SKIP`.
- DQ filter errors now produce a fail-closed empty eligibility result instead of warning and continuing.
- `parseRunRequest()` now defaults `useDataQualityFilter` to true unless explicitly false.
- Existing service tests were updated, and a new test verifies DQ filter error fail-closed behavior.

Known unresolved gaps:

| Gap | Classification |
| --- | --- |
| `useDataQualityFilter: false` is still accepted | Partially resolved. Default changed, but explicit bypass remains. |
| No persisted trusted/untrusted classification exists | Not resolved. |
| `topSignals()` can expose existing persisted signals without DQ trust filtering | Not resolved. |
| `screener()` can expose existing persisted signals without DQ trust filtering | Not resolved. |
| `latestForInstrument()` can auto-generate through `generateForInstrument()` without run-level DQ gating | Not resolved. |
| Active execution docs still marked `CF-W1-SIG-01` blocked/draft | Not resolved by source diff; this reconciliation records the mismatch. |
| Trigger object contract remains incomplete | Not resolved. |

Assessment:
- The dirty Signal Generation changes are not acceptable as full `CF-W1-SIG-01` completion.
- They may be acceptable as a smaller bounded run-path slice if Product Owner and Architect explicitly accept the remaining gaps as known limitations.
- Without that decision, Signal Generation should remain blocked and should not be committed.

## 6. Requirement Split Recommendation

Recommended option:

```text
Option B: two separate requirements:
- CF-W2-DQ-01 Data Quality fail-closed defaults
- CF-W2-SIG-01 Signal Generation DQ fail-closed behavior
```

Why this is safest:
- Data Quality default behavior is small, module-local, tested, and aligns directly with the readiness contract.
- Signal Generation changes are module-local and directionally correct, but they do not resolve read-path exposure, explicit bypass, persisted trust classification, or trigger contract gaps.
- Splitting prevents the cleaner DQ slice from being blocked by unresolved Signal Generation product/architecture decisions.

Remaining risk:
- Signal Generation may need revision if the Product Owner or Architect rejects explicit `useDataQualityFilter: false` as a remaining trusted-run bypass.
- DQ default change may affect downstream callers that expected warning-and-process behavior.

Exact approval needed:
- Product Owner: decide whether to preserve all dirty changes, split tracks, preserve DQ only, or revert/rework.
- Architect: decide whether the DQ and Signal changes can remain module-local and whether Signal Generation limitations are acceptable.
- QA: decide whether the focused test scope is enough for evidence flow.

## 7. Test Evidence

Commands run:

```text
cd backend
npm.cmd test -- data-quality-engine.service.test.ts --runInBand
```

Result:

```text
Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

Command run:

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

Result:

```text
Test Suites: 3 passed, 3 total
Tests:       29 passed, 29 total
```

Skipped commands:
- No broader tests.
- No live providers.
- No provider-heavy tests.
- No service start.
- No frontend checks.

Risk:
- Focused tests prove only the dirty DQ and Signal Generation code paths covered above. They do not prove downstream enforcement or read-path trust filtering.

## 8. Reconciliation Recommendation

Recommendation:

```text
Split into two evidence tracks.
```

Track 1:
- `CF-W2-DQ-01 Data Quality fail-closed defaults`
- Proceed to QA/review/Architect/PO evidence if Product Owner approves.

Track 2:
- `CF-W2-SIG-01 Signal Generation DQ fail-closed run-path behavior`
- Product Owner and Architect must first decide whether the unresolved gaps are acceptable known limitations, or whether Signal Generation should be revised before QA/review/signoff.

No commit should occur until:
- The Product Owner chooses an option.
- Architect confirms the allowed source scope.
- QA approves focused validation.
- Code review and Architect signoff are recorded.
- PO acceptance packet is recorded.

## 9. Exact Next Approval Prompt

```text
I approve Continuous Factory Wave 2 dirty-change decision: split into two tracks.

Proceed with evidence flow only for CF-W2-DQ-01 Data Quality fail-closed defaults.

Do not stage.
Do not commit.
Do not revert.
Do not modify Signal Generation further.
Do not modify application source except the already dirty DQ files if a review-blocking typo is found and reported first.

Create QA evidence, code review evidence, Architect signoff, and Product Owner acceptance packet for the Data Quality track only.
Run only:
cd backend
npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand

Leave Signal Generation dirty changes pending a separate Product Owner and Architect decision.
```
