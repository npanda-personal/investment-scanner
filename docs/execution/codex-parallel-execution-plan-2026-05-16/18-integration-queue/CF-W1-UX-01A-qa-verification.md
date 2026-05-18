# CF-W1-UX-01A QA Verification

Date: 2026-05-18

Owner: Team 04 QA Factory

## Work Item

- `CF-W1-UX-01A` - Stock Research Workbench trust framing from current source-supported evidence.

## Scope Result

Changed-file scope is compliant with the expected reservation set only:

- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-UX-01A-developer-handoff.md`

No forbidden-file edits detected in backend source/tests, Signal/Strategy internals, shared UI, route registries, Prisma, or package manifests.

## Contract And UX Assertions

1. Trust framing derivation: pass.
   - Derived from existing workbench response evidence (`trust`, `overview`, `chart`) and requested scope (`useMarketScope()`).
2. Overclaim prevention: pass.
   - No introduced UI trust wording that claims trusted/ready/verified scope/data-quality passed/eligibility/reliability/safe-to-trade or advice-like buy/sell/target language.
3. Status mapping and missing timestamp behavior: pass.
   - `COMPLETE` -> limited context.
   - `PARTIAL` / `DELAYED` -> limited context with warning reasons.
   - `MISSING` / `ERROR` -> blocked context with blocker reasons and downstream suppression.
   - missing timestamp -> visible limitation message.
4. Downstream suppression ownership: pass.
   - Suppression handled in `StockResearchWorkbenchPage.tsx`; no widget internals edited.

## Validation Executed

### Environment gate

- `Get-Counter '\Memory\% Committed Bytes In Use'`
- Results: ~73.98% and ~74.86% before heavy commands (below AGENTS threshold).

### Required commands

1. `cd frontend; npm.cmd run build`
   - Result: passed.

2. `cd frontend; npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1`
   - Initial run: failed with `EPERM` unlink on Playwright artifact file under sandbox.
   - Elevated rerun on default base URL (`http://127.0.0.1:5173`): executed but failed all 6 tests because `5173` was serving a different running frontend instance.
   - Rerun against Team 08 worktree server (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174`): passed, 6/6.

## Verdict

`PASS` - QA verification accepted for `CF-W1-UX-01A` implementation quality and bounded scope.

## Risks / Notes

- Replay risk in shared local environments: Playwright default base URL (`5173`) may point to another running app and produce false negatives.
- Residual parent-scope limitation remains expected: backend does not yet expose verified scope, DQ readiness, latest trusted data date, or downstream eligibility proofs.

## Next Gate Recommendation

- Team 10 code review can proceed.
- Architect/PO can evaluate after Team 10 review without reopening this child for implementation fixes.
