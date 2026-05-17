# CF-W2 Dirty Change Decision Packet

Date: 2026-05-17

Status: Product Owner decision packet. No staging, commit, revert, or acceptance recorded.

## Decision Needed

The human Product Owner must decide how to handle the dirty Data Quality and Signal Generation source/test changes created during Continuous Factory Wave 2 before readiness was fully proven.

The decision must cover:
- Whether to preserve, split, revise, or later revert the dirty changes.
- Whether Signal Generation's remaining gaps are acceptable as known limitations for a bounded run-path slice.
- Whether Data Quality fail-closed defaults can move into QA/review/signoff evidence.

## Options

### Option A: accept all dirty changes into QA/review/signoff flow

Accept both Data Quality and Signal Generation changes as one combined evidence flow.

Pros:
- Fastest path to a single fail-closed behavior checkpoint.
- Focused tests currently pass.

Cons:
- Couples clean DQ default behavior to unresolved Signal Generation gaps.
- Risks overclaiming Signal Generation completion.

### Option B: split DQ and SGE into separate tracks

Create two tracks:
- `CF-W2-DQ-01 Data Quality fail-closed defaults`
- `CF-W2-SIG-01 Signal Generation DQ fail-closed run-path behavior`

Pros:
- Preserves the small DQ slice without forcing premature Signal Generation acceptance.
- Keeps Signal Generation limitations explicit.
- Matches the actual diff boundaries.

Cons:
- Requires separate QA/review/signoff/PO evidence.
- Leaves Signal Generation dirty changes unresolved until the second decision.

### Option C: accept only Data Quality track for evidence flow

Proceed with DQ evidence flow and decide later whether Signal Generation changes should be revised or reverted.

Pros:
- Safest immediate acceptance path.
- Minimizes behavior blast radius.

Cons:
- Leaves Signal Generation dirty source in the worktree.
- Requires later cleanup or decision before any commit can be safely made.

### Option D: reject current dirty changes and prepare revert/rework plan

Do not accept either dirty source change. Prepare a scoped revert/rework plan, but do not revert until approved.

Pros:
- Restores strict factory discipline.
- Avoids carrying partially reviewed behavior.

Cons:
- Discards passing focused work that aligns with Product Owner policy direction.
- Delays fail-closed hardening.

### Option E: request deeper code review before deciding

Run no evidence flow yet. Create a deeper review packet focused on behavior compatibility and downstream read-path risk.

Pros:
- Reduces risk of accepting incomplete behavior.
- Useful if Product Owner is unsure about explicit non-filtered runs.

Cons:
- Adds one more gate before cleanup.
- Does not resolve dirty worktree state by itself.

## Codex Recommendation

Recommendation:

```text
Option B: split DQ and SGE into separate tracks.
```

Rationale:
- The DQ change is small, module-local, aligned with the active readiness contract, and focused tests pass.
- The Signal Generation change is directionally aligned with PO policy but only partially resolves trusted signal-generation risk.
- Splitting prevents a partial Signal Generation implementation from blocking the safer DQ track, while avoiding overclaiming completion.

## Evidence

Current dirty source diffs:
- `DataQualityEngineService.filterEligibleInstruments()` now defaults missing evaluations to `SKIP`.
- `SignalGenerationEngineService.run()` now defaults to applying DQ filtering unless explicitly false.
- Signal Generation now passes default `missingQualityBehavior: 'SKIP'`.
- Signal Generation now fail-closes when the DQ filter throws.
- `parseRunRequest()` now defaults `useDataQualityFilter` to true unless explicitly false.

Current dirty tests:
- DQ service test added for missing-evaluation default fail-closed behavior.
- Signal Generation service test updated to treat missing evaluation as excluded.
- Signal Generation service test added for DQ filter unavailable fail-closed behavior.
- Signal Generation validation test updated for default filter true and explicit false preservation.

Focused test results:

```text
cd backend
npm.cmd test -- data-quality-engine.service.test.ts --runInBand

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand

Test Suites: 3 passed, 3 total
Tests:       29 passed, 29 total
```

Active docs:
- `CF-W1-SIG-01` contract, architecture review, QA plan, and work packet still describe the Signal Generation implementation as blocked/draft.
- The ready queue still says no application-code implementation item is ready from Wave 1.
- The risk register already tracks downstream optional-filter risk and implementation factory false-ready risk.

Unresolved Signal Generation risks:
- Explicit `useDataQualityFilter: false` still exists.
- No persisted trusted/untrusted classification exists.
- `topSignals()` and `screener()` read paths are not filtered by DQ trust.
- `latestForInstrument()` can auto-generate without run-level DQ gating.
- Trigger object contract remains incomplete.

## Risks If Approved

- DQ default changes can alter callers that expected missing evaluations to warn and process.
- Signal Generation may still expose untrusted persisted signals through read paths.
- Explicit non-filtered signal generation may still create outputs without an untrusted classification.
- Downstream modules may overread the change as full signal trust readiness unless docs and gates remain strict.

## Risks If Rejected

- The repository remains dirty until a revert/rework plan is approved.
- Useful fail-closed behavior will be delayed.
- Future work may repeat the same implementation unless the readiness lock is enforced.

## Required Product Owner Approval

Exact approval needed:

```text
I approve Option B: split the dirty Continuous Factory Wave 2 changes into separate DQ and Signal Generation tracks.

Proceed with evidence flow for CF-W2-DQ-01 first.
Keep CF-W2-SIG-01 dirty changes pending a separate Product Owner and Architect decision.
Do not stage, commit, revert, or continue Signal Generation implementation yet.
```

## Required Architect Approval

Exact approval needed:

```text
Architect approval is needed to confirm that CF-W2-DQ-01 is module-local and acceptable as a fail-closed default behavior change, and to decide whether CF-W2-SIG-01 can be accepted as a bounded run-path change despite unresolved read-path and trusted/untrusted classification gaps.
```

## Required QA Approval

Exact approval needed:

```text
QA approval is needed to confirm the focused DQ and Signal Generation test commands are sufficient for their separate tracks, and to state whether additional existing invariant tests must run before Product Owner acceptance or commit.
```
