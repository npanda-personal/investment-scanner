# CF-W3-MDPIPE-01B6 Code Review / Lead Validation

Date: 2026-05-25

Team: TEAM-10 - Review / Release

Work item: `CF-W3-MDPIPE-01B6` - Data Quality compact pipeline indicator

State/mode: code review complete after Team 04 QA ACCEPT

Owner: Team 10 - Review / Release

Lane/module: Lane 3 frontend surface, `frontend/src/features/data-quality-engine`

## Verdict

`REJECT`

## Findings

1. `P1 - Contract breach in no-run fallback`: `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx:53-57` derives `status = 'NO_RUN_EVIDENCE'` whenever `stage` is `null`. That covers the legitimate loaded no-stage case, but it also covers the initial hook load (`data === null`, `loading === true`) and any failed hook fetch. The same component then renders explicit no-run copy at `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx:94-103` and an indeterminate progress bar at `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx:114-117`. Result: the strip can claim "No run evidence is available yet for the current scope" before the snapshot has loaded, and it can keep that claim visible when pipeline status failed to load. The contract reserves `NO_RUN_EVIDENCE` for the case where a loaded snapshot has no matching `DATA_QUALITY` stage row and separately requires inline error treatment when `usePipelineStatus()` fails (`docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W3-MDPIPE-01B6-compact-progress-indicator-contract.md:87-103`).

2. `P2 - Missing regression coverage for the rejected path`: `frontend/tests/ui/data-quality-engine.spec.ts:5-113` covers running, terminal, and loaded no-stage snapshots plus the no-POST assertion, but it never asserts the initial-loading or hook-error behavior of the new strip. That gap allowed the incorrect `NO_RUN_EVIDENCE` fallback above to pass review and QA.

## Scope Evidence

Reviewed implementation files:

- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx`
- `frontend/tests/ui/data-quality-engine.spec.ts`

Reviewed evidence/contract docs:

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W3-MDPIPE-01B6-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W3-MDPIPE-01B6-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W3-MDPIPE-01B6-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W3-MDPIPE-01B6-compact-progress-indicator-contract.md`

No forbidden-file edits were made by Team 10. Team 10 did not edit application source, tests, QA evidence, route registries, shared UI, backend, Prisma/schema, or package files.

## Validation

Commands run by Team 10:

- `git status --short`
- `git diff -- frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `git diff -- frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx`
- `git diff -- frontend/tests/ui/data-quality-engine.spec.ts`
- `git diff --check -- frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx frontend/tests/ui/data-quality-engine.spec.ts`
- `rg -n "buy now|sell now|guaranteed|profit target|price target|must buy|must sell|guaranteed return|financial advice|risk/reward|R:R|target" frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx frontend/src/features/data-quality-engine/components/DataQualityPipelineStatusStrip.tsx frontend/tests/ui/data-quality-engine.spec.ts`
- `Get-Counter '\Memory\% Committed Bytes In Use'`
- `cd frontend && npm.cmd run build`
- `cd frontend && npm.cmd run test:ui -- pipeline-ops.spec.ts data-quality-engine.spec.ts --workers=1`

Results:

- Memory gate before build/test work: `51.4%` committed bytes in use.
- `npm.cmd run build` passed. The pre-existing Vite chunk-size warning remains non-blocking.
- Focused Playwright rerun passed: `4/4`.
- Initial Playwright attempt failed inside the sandbox with `EPERM` unlink on `frontend/test-results/.last-run.json`; rerun with elevated artifact access passed.
- Product-language scan matched only non-production strings such as `targetTradingDate` and event-handler names; no target/advice language drift was found in user-facing copy for this slice.
- `git diff --check` reported no whitespace errors; only CRLF normalization warnings appeared on tracked files.

## Gate Outcome

Release acceptance is blocked pending a bounded Team 08 revision in the reserved files and a Team 04 QA rerun.

Required rework:

- Distinguish loading/error state from loaded no-stage state in the compact strip so `NO_RUN_EVIDENCE` is rendered only after a successful snapshot load with no `DATA_QUALITY` stage row.
- Add focused UI coverage for the rejected path so the strip cannot regress back to the same status misclassification.

## Next Gate

Return to Team 08 for feature-local revision, then Team 04 QA rerun, then Team 10 re-review before Architect signoff or Product Owner acceptance.
