# MD-A4 GitHub Check-In - Provider Validation Drain And Retry Classification

Date: 2026-05-13  
Mode: `GitHub Check-In`  
Owner: Senior Fullstack Lead / Orchestrator  
Work item: MD-A4 - Provider Validation Drain And Retry Classification

## Check-In Result

Status: `PUSHED`

- Branch: `dev`
- Remote: `origin`
- Implementation commit: `89ebe8e05754c8b613b99ccc9913c266fa6f4ed9`
- Short SHA: `89ebe8e`
- Push target: `origin/dev`
- Push result: `97b6653..89ebe8e  dev -> dev`
- CI status/link: not available in local terminal output

## Scoped Files Committed

Backend:

- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/tests/modules/market-data-foundation/market-data.provider.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`

Frontend:

- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Plan and evidence docs:

- `docs/codex-agent-team-plan/active-work-board.md`
- `docs/codex-agent-team-plan/work-packets/2026-05-13-market-data-availability-work-packets.md`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-md-a4-provider-validation-drain-contract.md`
- `docs/codex-agent-team-plan/architecture-signoff/2026-05-13-md-a4-architect-signoff.md`
- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-md-a4-developer-handoff.md`
- `docs/codex-agent-team-plan/lead-validation/2026-05-13-md-a4-lead-validation.md`
- `docs/codex-agent-team-plan/po-acceptance/2026-05-13-md-a4-po-acceptance.md`
- `docs/codex-agent-team-plan/po-briefs/2026-05-13-md-a4-provider-validation-drain-product-brief.md`
- `docs/codex-agent-team-plan/qa-evidence/2026-05-13-md-a4-provider-validation-drain-qa-evidence.md`
- `docs/codex-agent-team-plan/qa-plans/2026-05-13-md-a4-provider-validation-drain-qa-plan.md`

## Validation Evidence

- `backend`: `npm.cmd test -- --runTestsByPath tests/modules/market-data-foundation/market-data.service.test.ts tests/modules/market-data-foundation/market-data.repository.test.ts tests/modules/market-data-foundation/market-data.provider.test.ts --runInBand` passed, 3 suites / 138 tests.
- `backend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --output=test-results-md-a4-final` passed, 8/8 tests after sandbox-only `EPERM` process-spawn failure was rerun with approved escalation.
- `git diff --check` passed with line-ending warnings only.

## Release Notes

MD-A4 hardens provider validation before full data-population work:

- `UNKNOWN_FIRST` and `RETRY_FAILED` provider validation queues are distinct and bounded.
- Mutating queue reads use offset-zero behavior so rows are not skipped as predicates shrink.
- Retryable provider failures now write durable `PROVIDER_VALIDATION` repair attempts/states with retry cooldown evidence.
- Manual symbol/provider identity failures remain visible and are not silently retried.
- Yahoo no-candle results for `IN / STOCK` become `FREE_FALLBACK_REQUIRED`, not final clean unsupported.
- Required-history diagnostics expose the 15-year/listing-date target, latest completed EOD, stored history bounds, stored bars, and coverage status.
- The Market Data repair panel shows provider classification counts, retry/manual queues, timing, validation window, fallback requirement, paid-provider prohibition, and sample evidence.

## Rollback Notes

Rollback command if MD-A4 causes a release-blocking regression:

```powershell
git revert 89ebe8e05754c8b613b99ccc9913c266fa6f4ed9
git push origin dev
```

Rollback impact:

- Provider validation would revert to less precise unknown/retry/unsupported handling.
- `FREE_FALLBACK_REQUIRED` and required-history coverage diagnostics would be removed.
- Retry/manual repair-state visibility would be reduced.
- The UI would lose the new provider validation diagnostics and 15-year/listing-date target display.

## Unsafe/Unaccepted File Exclusion

Scoped-staging confirmation: only MD-A4 production files, tests, and MD-A4 plan/evidence docs were staged for the implementation commit.

Unsafe/unaccepted-file exclusion confirmation:

- No `.env` files were staged.
- No secrets, database dumps, generated Playwright output, or unrelated runtime artifacts were staged.
- Parked MD-A5 planning docs were intentionally excluded from the MD-A4 implementation commit and are handled separately as planning artifacts.
