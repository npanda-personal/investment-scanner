# CF-W2-SPL-01B QA Plan

Date: 2026-05-26

## Work Item

`CF-W2-SPL-01B` - Signal Position Ledger active rows backend read model.

This QA plan is refreshed to match the completed Team 03 packet:

- backend-only;
- active-only;
- read-path-only;
- current persisted/public evidence only;
- no backend route-registry change;
- no frontend feature or shared UI work;
- no Prisma/schema/migration/generated/package change;
- no durable closed lifecycle truth in this child.

## QA Readiness State

READY CANDIDATE AFTER TEAM 00 PROMOTION.

Team 03 has now completed the narrowed requirement, architecture review, contract, and work packet for the backend-only child. Team 04 QA planning can therefore move from provisional split-child planning to a bounded executable QA gate for the future implementation pass.

This document remains a QA plan only. It does not approve implementation by itself.

## Authority And Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01B-signal-position-ledger-active-positions-read-model-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-SPL-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-SPL-01B-architecture-outbox.md`
- `backend/package.json`

## Bounded QA Scope

In scope for the first implementation pass:

- one backend module-local active-row read model;
- source-proven entry trigger inclusion gating;
- latest trusted price attachment and `currentReturnPercent` projection;
- DQ/trust projection from existing public/persisted outputs;
- strategy/rule/version provenance projection;
- limited health compatibility mapping only;
- pagination and scope correctness;
- backend-focused tests and backend build.

Out of scope for this child:

- backend route-registry mounting;
- frontend routes, pages, components, hooks, or UI smoke tests;
- shared UI or shared backend utility edits;
- Prisma schema, migrations, generated types, package manifests, or lockfiles;
- Today Review, Trade Plan, Portfolio, Backtesting, or provider/live/startup/backfill widening;
- durable open/closed lifecycle truth;
- close date, close price, close reason, closed history, realized P/L, targets, reward/risk, or advice semantics.

## Backend-Only Acceptance Matrix

| Area | Required pass condition | Reject if |
| --- | --- | --- |
| Entry proof gate | Row appears only when trigger contract proves numeric source-backed trigger price and present trigger timestamp | Row appears without source-proven price, timestamp, or reason summary |
| Trigger type gate | Only entry-ledger compatible trigger types are admitted | Risk-only or unsupported trigger types appear as active entry rows |
| Legacy/incomplete exclusion | Legacy or incomplete rows stay hidden or explicitly unsupported | Weak legacy rows surface as trusted active rows |
| Current return basis | `currentReturnPercent` is computed only from source-proven entry price and latest trusted price | Return is computed from stale, missing, unsupported, or fabricated price basis |
| Price status downgrade | Stale or unavailable price basis yields explicit `STALE` or `UNAVAILABLE` semantics | UI or DTO presents a fresh-looking numeric return despite downgraded basis |
| DQ/trust projection | DQ/trust values come from current public/persisted DQ outputs | Module recomputes DQ locally or silently upgrades weak evidence |
| Provenance projection | Strategy id/code, strategy version, trigger type, entry rule id, and reason summary remain visible when provable | Provenance is dropped, rewritten, or fabricated |
| Health compatibility | Only `EXIT_TRIGGERED` and `RISK_WARNING` may be emitted from current exit-oriented decision evidence | Child emits `ACTIVE`, `HEALTHY`, `WEAKENING`, `INVALIDATED`, `EXPIRED`, or `CLOSED` |
| Lifecycle evidence honesty | Non-provable lifecycle stays explicit unavailable or compatibility-only | Child infers durable lifecycle truth from later price moves, targets, or unsupported heuristics |
| Pagination and scope | Response remains paginated and scope-aware for `region` and `assetType` | Scope is ignored, pagination breaks, or unknown-scope rows leak into scoped views |
| Module boundary | Changes stay inside the reserved backend module and backend module tests | Handoff requires route registry, frontend, shared, schema, or generated-file widening |
| Product language | Read-model and tests use research-support wording only | Handoff introduces trade/advice/target/open-trade/closed-trade language |

## Focused Backend Verification Commands

Mandatory focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts signal-position-ledger.validation.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

Recommended reused-evidence regression command:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.trigger-contract.test.ts strategy-decision-engine.service.test.ts --runInBand
```

Recommended price and DQ dependency regression command:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
```

Optional only if the implementation adds isolated module-local controller or router assertions without route-registry mounting:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.routes.test.ts --runInBand
```

Not part of this child's default QA gate:

- `frontend` build commands
- Playwright or other UI smoke commands
- Prisma commands
- package install commands

## Rejection Checks For Drift

Reject the implementation handoff immediately if any of the following appear:

- edits to `backend/src/api/routes.ts`;
- edits under `frontend/src/**`;
- edits under shared UI or shared backend utility locations;
- edits to `backend/prisma/schema.prisma` or `backend/prisma/migrations/**`;
- package manifest or lockfile edits;
- generated-file churn;
- Today Review, Trade Plan, Portfolio, Backtesting, provider/live, startup, worker, queue, or backfill widening;
- any DTO or behavior claiming durable `ACTIVE`, `CLOSED`, or closed-history truth.

## Language Guard

Reject implementation docs, test names, response text, comments, or acceptance notes if they introduce:

- `active trade`
- `open trade`
- `closed trade`
- `buy now`
- `sell now`
- `target`
- `target price`
- `price target`
- `profit target`
- `reward/risk`
- `R:R`
- `realized profit`
- `account gain`
- `portfolio profit`
- `financial advice`

Preferred wording remains:

- `active row`
- `entry trigger`
- `bearish trigger`
- `current return percent`
- `risk warning`
- `reason summary`
- `strategy version`
- `lifecycle evidence status`

## Handoff Rejection Conditions

Reject the future developer handoff if:

- rows appear without source-proven trigger price and timestamp;
- rows hide weak evidence instead of surfacing unavailable/stale semantics;
- current return is shown when price trust is downgraded;
- risk-only signals appear as active entry rows;
- lifecycle compatibility expands beyond `EXIT_TRIGGERED` or `RISK_WARNING`;
- durable closed/open lifecycle wording or semantics appear;
- the file set widens beyond the Team 03 allowed backend module and backend tests;
- implementation requires route-registry, frontend, schema, shared-file, package, or generated-type approval that was not opened as a new Team 00 gate.

## Team 00 Promotion Verdict

Readiness verdict: READY FOR TEAM 00 PROMOTION AS A BACKEND-ONLY CHILD.

Reason:

- the requirement, architecture review, contract, and work packet now agree on one bounded backend-only implementation slice;
- Team 03 explicitly removed route/frontend/schema/shared/durable-lifecycle obligations from this child;
- Team 04 can evaluate the future implementation with a focused backend command set and clear rejection conditions.

## Remaining Blockers

No QA-planning blocker remains inside the active execution docs.

Normal execution gates still remain:

- Team 00 must reserve one backend writer for the full `signal-position-ledger` module/test surface;
- future implementation must stay inside the allowed backend file set;
- any later route exposure or frontend surfacing must be reopened as separate shared-file work.

## Next Gate

Team 00 Ready promotion and sequencing for the bounded backend-only implementation pass.
