# CF-W1-TP-01A QA Plan

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: QA planning only. Implementation remains blocked until the Trade Plan no-target compatibility and DQ hard-block contract is accepted.

## Scope

Focused backend validation for Trade Plan Risk Engine contract behavior:
- no arbitrary target-price semantics in trusted Trade Plan outputs,
- no financial-advice language,
- DQ hard-block behavior for paper-readiness or action-like plan states,
- compatibility treatment for existing target geometry fields if they remain during migration.

Out of scope:
- frontend Today Review/UI display changes unless separately approved,
- API shape migration beyond the accepted contract,
- Prisma, route registry, shared utility, package, provider, startup/backfill, or UI test changes.

## Required QA Assertions

- Trade Plan outputs do not present arbitrary `targetPrice`, profit target, or guaranteed-return semantics as trusted guidance.
- Existing target geometry fields, if retained for compatibility, are labeled or treated as non-advice limitations per the accepted contract.
- Exit and invalidation outputs are rule-based and include reason/evidence language.
- Missing DQ evaluation blocks paper-readiness or action-like plan states.
- `NOT_READY`, `BLOCKED`, stale, unsupported, scope-mismatched, or provider-gap DQ states hard-block paper-readiness where the accepted contract requires it.
- `LIMITED` readiness follows the accepted contract and cannot silently become action-ready.
- `eligibleForSignals=false` and DQE blockers prevent trusted action-like Trade Plan output.
- Wording uses research-support language such as candidate, review, risk warning, exit condition, invalidation condition, and data quality.
- No `buy now`, `sell now`, `profit target`, `price target`, `must buy`, `must sell`, or guaranteed-return language is introduced.

## Focused Command Guidance

Blocked until contract acceptance and implementation handoff:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

Only if repository behavior changes in the approved implementation:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.repository.test.ts --runInBand
```

Approval-gated only if Today Review backend output is explicitly in scope:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts today-trade-review.controller.test.ts --runInBand
```

Frontend build and Playwright/UI smoke are excluded by default and require separate UI scope approval.

## Stop Conditions

Stop QA and return to Orchestrator/Architect if validation requires:
- unresolved target geometry migration decisions,
- frontend display changes,
- Prisma schema changes,
- route registry changes,
- shared utility or shared UI edits,
- package changes,
- live market-data providers,
- startup/backfill behavior,
- broad backend suites,
- UI/Playwright checks.

## Evidence Required Later

- Accepted Trade Plan contract reference.
- Exact changed-file list from implementation handoff.
- Focused command output.
- DQ scenario coverage for missing, `LIMITED`, `NOT_READY`, `BLOCKED`, stale, and `READY`.
- Product-language scan notes for forbidden advice/target terms.
- Skipped checks and reasons.
