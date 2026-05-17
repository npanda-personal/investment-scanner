# Sprint 1B Preparation Plan

Date: 2026-05-17

Status: Preparation only. Sprint 1B implementation is not approved.

## 1. Purpose

Record the Product Owner, Architect, and QA decisions needed to approve or reject the first Market Data / Data Quality implementation requirement.

This plan does not approve code changes, tests, provider calls, services, staging, commits, or pushes.

## 2. Product Owner Decisions Recorded

- Root `AGENTS.md` is the only authoritative instruction file.
- Deleted `docs/AGENTS.md` remains neutralized.
- `docs/codex-agent-team-plan/` remains historical evidence only.
- Initial implementation scope defaults to `IN/STOCK`.
- Angel One remains excluded from Sprint 1B implementation.
- No live provider calls are approved.
- No provider-heavy tests are approved.
- Provider-heavy startup behavior is excluded by default.
- UI scope should remain minimal unless QA and UX criteria are clear.

## 3. Product Owner Decisions Still Missing

- Approve or reject Sprint 1B implementation.
- Confirm the exact first implementation requirement.
- Accept, revise, or reject the threshold policy in `06-contracts/market-data-dq-readiness-contract.md`.
- Decide whether UI files are in scope.
- Decide whether a later mocked-only Angel One validation step should be approved.
- Decide whether a later read-only Angel One live market-data exception should ever be considered.

## 4. Architect Decisions Recorded

- Angel One is excluded from Sprint 1B implementation.
- `backend/src/server.ts` is shared/high-risk and read-only by default.
- `backend/.env.example` is shared/high-risk and read-only by default.
- Prisma schema and migrations are forbidden.
- Backend and frontend route registries are forbidden.
- Shared utilities, shared UI, and package manifests are forbidden.
- Spike rejection remains disabled by default unless separately approved.
- Retry-cooldown states must block downstream readiness and remain visible.

## 5. Architect Decisions Still Missing

- Approve exact future write scope for Market Data Foundation files.
- Approve exact future write scope for Data Quality Engine files.
- Decide whether module-local route/controller/service changes are in the first implementation.
- Decide whether repository/storage changes are acceptable.
- Decide whether background price-backfill run behavior is in scope.
- Decide whether catch-up/status/cancel behavior is in scope.
- Confirm no schema/route-registry/shared-file change is required.

## 6. QA Decisions Recorded

- Tests are not approved to run during preparation.
- Future provider tests must be mocked unless live validation is explicitly approved.
- No-live-provider, no-paid-provider, no-broker-execution, and no-secret checks are required.
- Data Quality invariant checks are required.
- Frontend build/typecheck and Playwright smoke are required only if UI scope is approved.
- Memory/resource gates are required before any future build/test/server/browser/provider work.

## 7. QA Decisions Still Missing

- Approve exact backend test command subset.
- Approve whether Data Quality tests are required or must be added.
- Approve frontend validation scope if UI is included.
- Approve evidence format for Product Owner acceptance.
- Define acceptable skipped-test reasons.

## 8. Startup And Backfill Scope

Sprint 1B excludes by default:
- Startup scheduler behavior changes.
- Automatic startup backfill.
- Provider-heavy startup workflows.
- Live provider startup calls.

Sprint 1B may include only after explicit approval:
- Module-local background price-backfill behavior.
- Status polling contract.
- Cancel behavior.
- Catch-up behavior.

## 9. UI Scope

Default UI policy:
- Keep UI read-only unless Product Owner, UX, and QA approve a minimal UI scope.

Excluded by default:
- Market Data readiness dashboard updates.
- Background-load progress controls.
- Manual sync controls.
- Business metadata blocker display changes.
- Data Quality tier visibility changes.
- User-facing readiness explanation changes.

If UI is approved later, it must have UX criteria, QA smoke coverage, and no financial-advice language.

## 10. Old-Plan Evidence

No old `docs/codex-agent-team-plan/` evidence is migrated by this preparation step.

Useful old evidence may be summarized later only if:
- It is cited as historical evidence.
- Current code or active docs validate it.
- It does not become authority.
- The Product Owner approves migration into the active folder.

## 11. Downstream Blocking

Blocked until Market Data / DQ readiness is implemented, validated, reviewed, and accepted:
- `signal-generation-engine`
- `signal-quality-lab`
- `signal-calibration-engine`
- `strategy-decision-engine`
- `backtesting-strategy-lab`
- `trade-plan-risk-engine`
- `portfolio-intelligence`
- `watchlist-management`
- `alerts-monitoring`
- `ai-investment-copilot`

## 12. Recommendation

Sprint 1B should be split into smaller implementation tasks.

Recommended first task after approval:
- Implement or harden Market Data / Data Quality readiness enforcement for `IN/STOCK` without Angel One, without startup provider-heavy behavior, and without UI changes unless separately approved.

## 13. Final Go/No-Go Decision

Selected option:

```text
Option A: Backend-only Data Quality invariant tests
```

Decision:
- Sprint 1B implementation is ready only for this very small test-only slice.
- This decision does not approve implementation execution by itself.
- The next implementation prompt must explicitly approve Option A.

Purpose:
- Lock down Data Quality invariants before changing source behavior.
- Prove `READY`, `LIMITED`, `BLOCKED`, `NOT_READY`, `UNUSABLE`, stale, missing evaluation, and downstream eligibility behavior are protected by tests.

Allowed future write file:
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

Everything else is read-only or forbidden unless a later approval changes the scope.
