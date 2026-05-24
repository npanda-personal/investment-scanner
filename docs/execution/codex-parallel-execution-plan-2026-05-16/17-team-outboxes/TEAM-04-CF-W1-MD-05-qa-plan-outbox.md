# Team 04 Outbox - CF-W1-MD-05 QA Plan

Date: 2026-05-24

Team: Team 04 - QA Factory

## Work Item

`CF-W1-MD-05 - catalog sync latest-session freshness and skip-reason explainability`

## Mode

QA planning only. No application code, tests, builds, commits, or pushes performed.

## Verdict

Ready for Team 00 evaluation.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-05-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-MD-05-qa-plan-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-05-catalog-sync-latest-session-freshness-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-05-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-05-catalog-sync-freshness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-05-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-MD-05-architecture-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-04-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/14-team-charters/TEAM-04-qa-factory.md`

## QA Plan Summary

The plan requires proof for:

- stale latest-session mismatch with no terminal "no new data";
- region-current but stale-instrument catch-up state with visible stale count;
- fully current/final-confirmed state;
- pre-fetch skipped, no-op, failed, and stale-catch-up distinctions;
- catalog row freshness wording that separates stored row date from accepted latest completed session;
- language/claim review to keep the slice research-support oriented.

## Required Commands After Implementation

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1
```

```powershell
rg -n "buy now|sell now|must buy|must sell|guaranteed|profit target|price target|financial advice|automated trade instruction|no new data" backend/src/modules/market-data-foundation/market-data-foundation.service.ts backend/src/modules/market-data-foundation/market-data-foundation.types.ts frontend/src/features/market-data-foundation/types.ts frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx frontend/tests/ui/market-data-foundation.spec.ts
```

## Acceptance / Rejection Boundaries

Accept only if the implementation:

- keeps latest completed versus latest stored session basis visible;
- proves catch-up-pending and final-confirmed are distinct;
- keeps skipped, no-op, failed, and stale-catch-up counts distinct;
- shows row freshness contrast on the catalog grid;
- avoids prohibited advice/guarantee language;
- stays inside the reserved implementation files.

Reject if:

- stale latest-session mismatch still ends in terminal "no new data";
- row freshness still implies universal currentness from region-level status alone;
- explainability collapses to a coarse skipped bucket;
- forbidden files or widened scope appear.

## Risks

- Broad legacy `"no new data"` copy may survive in an untested branch.
- UI mocks must include mixed current/stale rows or row-level wording regressions can hide.
- Unsupported-provider treatment remains explanatory only; numeric excluded counts would require reopening the slice.

## Tests Run

None. Planning pass only.

## Teams Ready To Pick Up New Tasks

- Team 00 Orchestrator Integration: ready to evaluate `CF-W1-MD-05` for Ready promotion with QA plan attached
- Lane 1 implementation team: ready to implement inside the reserved writer set
- Team 10 Review / Release: no action yet; wait for implementation and QA evidence

## Next Gate

Team 00 evaluation, then bounded implementation handoff.
