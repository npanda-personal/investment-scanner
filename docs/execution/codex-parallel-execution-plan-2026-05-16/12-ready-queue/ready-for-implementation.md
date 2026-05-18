# Ready For Implementation

Date: 2026-05-18

## Current Ready Queue

No available application-code item is currently waiting unassigned in Ready.

`CF-W1-SMI-01` is promoted and assigned to Team 06 for bounded backend-only Smart Money evidence freshness and partial-trust framing in a dedicated worktree. It can run in parallel with `CF-W1-TP-02` rework because the file reservations are disjoint.

`CF-W1-TP-02` is promoted and assigned to Team 06 for bounded backend-only Trade Plan exit/invalidation semantics implementation. It must be based on accepted branch `codex/team06-strategy-signal/CF-W1-TP-01B` because upstream commit `8ff22fd` is not yet in `dev`.

`CF-W1-BT-02` is promoted and assigned to Team 06 for a bounded `backtesting-strategy-lab` implementation in a dedicated worktree.

`CF-W1-HCTX-01` is promoted and assigned to Team 05 for a bounded backend-only `historical-context-snapshots` implementation in a dedicated worktree.

`CF-W1-CAL-01` is promoted and assigned to Team 06 for a bounded backend-only `signal-calibration-engine` implementation in a dedicated worktree.

2026-05-18 Team 00 promotion update:

- `CF-W1-BT-02` is promoted after Team 03 refreshed the narrowed architecture/contract/work packet and Team 04 accepted the narrowed QA plan. Implementation is limited to canonical run-level review disposition plus shared saved-list/detail reason summary.
- `CF-W1-STRAT-02A` was promoted, implemented, accepted through QA/review/Architect/delegated PO gates, and locally committed on its Team 06 branch as `359d0a3`.
- `CF-W1-DQ-02A` was promoted, implemented, accepted through QA/review/Architect/delegated PO gates, and locally committed on its Team 05 branch as `c2d6753`.
- `CF-W1-UX-01A` was promoted, implemented, accepted through QA/review/Architect/delegated PO gates, and locally committed on its Team 08 branch as `246d5a3`.

`CF-W1-SQLAB-01` was promoted by Team 00 on 2026-05-18 and assigned to Team 06 in a dedicated worktree for bounded backend-only Signal Quality Lab implementation.

`CF-W1-SQLAB-02A` is active in Team 04 QA planning for the no-schema Signal Quality Lab preview child. It is not a Ready item yet.

`CF-W1-L3-TREV-01` was promoted by Team 00 on 2026-05-18 and assigned to Team 07 in a dedicated worktree for bounded Today Review implementation.

`CF-W1-L3-PORT-01A` was pulled by Team 07, implemented in its dedicated worktree, and moved through first-pass QA / Code Review. Team 10 rejected release acceptance and routed bounded rework back to Team 07. It remains uncommitted and unaccepted.

`CF-W1-TP-01B` already has an implementation handoff in the Team 06 worktree and is routed to Team 10 review.

`CF-W1-NOTIF-02` is promoted and pulled by Team 09 for bounded implementation in a dedicated worktree.

`CF-W1-L3-ALERT-01` is promoted and pulled by Team 07 for bounded implementation in a dedicated worktree. It must not run in parallel with `CF-W1-L3-AUTH-03` because both reserve alerts-monitoring files.

`CF-W1-MD-01` was promoted and pulled by Team 05 for a narrowed backend-only reject-only Market Data validator child. QA, Team 10 review, Architect Signoff, delegated PO acceptance, and scoped local commit are complete on the Team 05 branch.

`CF-W1-AUTH-SUB-01` was promoted, implemented, accepted through QA/review/Architect/delegated PO gates, and locally committed on its Team 09 branch as `354499d`.

`CF-W1-SIG-TRIGGER-02A` is promoted and assigned to Team 06 for bounded backend-only Signal Generation trigger-audit surfacing in a dedicated worktree.

`CF-W1-SIG-TRIGGER-02A` completed QA, Team 10 review, Architect Signoff, delegated PO acceptance, and scoped local branch commit `788c237`; it is parked for later clean integration.

## Pulled / In Review

| ID | Owner | Branch | Worktree | Scope | Status |
| --- | --- | --- | --- | --- | --- |
| `CF-W1-STRAT-02A` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-STRAT-02A` | `../investment-scanner-worktrees/team06-CF-W1-STRAT-02A` | No-schema Strategy Framework rule metadata and DQ gate trust exposure | Accepted and locally committed as `359d0a3`; awaiting later clean `dev` integration |
| `CF-W1-UX-01A` | Team 08 - UX / Research / Copilot | `codex/team08-ux-research/CF-W1-UX-01A` | `../investment-scanner-worktrees/team08-CF-W1-UX-01A` | Frontend-only Stock Research Workbench trust framing from current page evidence | Accepted and locally committed as `246d5a3`; awaiting later clean `dev` integration |
| `CF-W1-DQ-02A` | Team 05 - Market Data / Data Quality | `codex/team05-market-data/CF-W1-DQ-02A` | `../investment-scanner-worktrees/team05-CF-W1-DQ-02A` | Backend-only DQE currentness evidence and fail-closed propagation | Accepted and locally committed as `c2d6753`; awaiting later clean `dev` integration |
| `CF-W1-BT-02` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-BT-02` | `../investment-scanner-worktrees/team06-CF-W1-BT-02` | Backtesting canonical review disposition and saved-list/detail reason-summary normalization | Accepted and locally committed as `bb49ce2`; awaiting later clean `dev` integration |
| `CF-W1-HCTX-01` | Team 05 - Market Data / Data Quality | `codex/team05-market-data/CF-W1-HCTX-01` | `../investment-scanner-worktrees/team05-CF-W1-HCTX-01` | Backend-only Historical Context lookup explainability and provenance labeling | Promoted and assigned to Team 05 |
| `CF-W1-CAL-01` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-CAL-01` | `../investment-scanner-worktrees/team06-CF-W1-CAL-01` | Backend-only Signal Calibration readiness trust-state and DQ hard-block framing | Accepted and locally committed as `fd3d464`; awaiting later clean `dev` integration |
| `CF-W1-L3-PORT-01A` | Team 07 - Portfolio / Watchlist / Alerts | `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A` | `../investment-scanner-worktrees/team07-CF-W1-L3-PORT-01A` | Backend-only portfolio-management readiness DTOs | Rejected / Rework after Team 10 review; Team 07 revision pending |
| `CF-W1-TP-01B` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-TP-01B` | `../investment-scanner-worktrees/team06-CF-W1-TP-01B` | Backend-only Trade Plan DQ hard-block and target compatibility | Implemented in worktree; Team 10 review pending |
| `CF-W1-NOTIF-02` | Team 09 - Platform / Auth / Subscription / Notifications | `codex/team09-platform/CF-W1-NOTIF-02` | `../investment-scanner-worktrees/team09-CF-W1-NOTIF-02` | Backend-only local notification log redaction | Ready and pulled by Team 09 for implementation |
| `CF-W1-L3-ALERT-01` | Team 07 - Portfolio / Watchlist / Alerts | `codex/team07-portfolio-alerts/CF-W1-L3-ALERT-01` | `../investment-scanner-worktrees/team07-CF-W1-L3-ALERT-01` | Backend-only alert readiness suppression | Ready and pulled by Team 07 for implementation |
| `CF-W1-MD-01` | Team 05 - Market Data / Data Quality | `codex/team05-market-data/CF-W1-MD-01` | `../investment-scanner-worktrees/team05-CF-W1-MD-01` | Backend-only reject-only historical-price validator hardening | Accepted and locally committed as `913b56b`; awaiting later clean `dev` integration |
| `CF-W1-L3-TREV-01` | Team 07 - Portfolio / Watchlist / Alerts | `codex/team07-portfolio-alerts/CF-W1-L3-TREV-01` | `../investment-scanner-worktrees/team07-CF-W1-L3-TREV-01` | Today Review run/list publication evidence and readiness-coherence normalization | Ready and assigned to Team 07 |
| `CF-W1-SQLAB-01` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-SQLAB-01` | `../investment-scanner-worktrees/team06-CF-W1-SQLAB-01` | Backend-only Signal Quality Lab outcome-confidence metadata | Ready and assigned to Team 06 |
| `CF-W1-AUTH-SUB-01` | Team 09 - Platform / Auth / Subscription / Notifications | `codex/team09-platform/CF-W1-AUTH-SUB-01` | `../investment-scanner-worktrees/team09-CF-W1-AUTH-SUB-01` | Combined backend-only auth fail-closed and admin/manual subscription controller-policy slice | Accepted and locally committed as `354499d`; awaiting later clean `dev` integration |
| `CF-W1-SIG-TRIGGER-02A` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-SIG-TRIGGER-02A` | `../investment-scanner-worktrees/team06-CF-W1-SIG-TRIGGER-02A` | Backend-only Signal Generation trigger-audit surfacing and provenance labeling | Ready and assigned to Team 06 |
| `CF-W1-TP-02` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-TP-02` | `../investment-scanner-worktrees/team06-CF-W1-TP-02` | Backend-only Trade Plan structured exit/invalidation semantics | Ready and assigned to Team 06; branch must be based on accepted `CF-W1-TP-01B` commit `8ff22fd` |
| `CF-W1-SMI-01` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-SMI-01` | `../investment-scanner-worktrees/team06-CF-W1-SMI-01` | Backend-only Smart Money evidence freshness and partial-trust framing | Ready and assigned to Team 06; can run in parallel with TP-02 rework because files are disjoint |

## Active Ready Handoff - `CF-W1-BT-02`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-BT-02` against Ready gates and promoted it as an independent Team 06 implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- Architecture review: `03-architecture/CF-W1-BT-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- Work packet: `08-work-packets/CF-W1-BT-02-work-packet.md`
- QA plan: `04-qa/CF-W1-BT-02-qa-plan.md`
- Team 03 architecture outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Team 04 QA outbox: `17-team-outboxes/TEAM-04-qa-factory.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved backend module and feature-local frontend files.

Branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-BT-02`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-BT-02`

Allowed files:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`

Forbidden files:

- Prisma schema or migrations
- generated files
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- backend or frontend route registries
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `frontend/src/features/backtesting-strategy-lab/api/**`
- `frontend/src/features/backtesting-strategy-lab/hooks/**`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- shared backend utilities
- shared frontend components
- package manifests
- providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical docs

Required behavior:

- add additive run-level review-disposition fields equivalent to `TRUSTED_REVIEW`, `PARTIAL_REVIEW`, `DIAGNOSTIC_ONLY`, `LEGACY_REPAIRED`, and `WITHHELD`;
- add one concise reason summary and specific reason list derived from current module evidence;
- derive review disposition only from existing availability, calculation-audit, coverage, benchmark, exit-diagnostic, and trade-count evidence;
- make the saved-run list and selected-run detail show the same disposition label and reason summary for the same run;
- preserve existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit evidence;
- preserve registered and custom-run execution behavior, routes, query params, and current payload fields;
- keep research-support language and avoid direct advice, target-price, guarantee, broker, or automation wording.

Focused validation guidance:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

If frontend files are changed:

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

Stop and return to Team 00 if implementation requires any forbidden file, schema/generated/route/shared changes, `strategy-framework` or `trade-plan-risk-engine` source edits, frontend API/hook/route changes, simulation math changes, benchmark math changes, route-contract changes, shared UI, cross-module source changes, or trade-level structured rule-ID expansion.

## Active Ready Handoff - `CF-W1-HCTX-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-HCTX-01` against Ready gates and promoted it as an independent Team 05 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-HCTX-01-historical-context-explainability-requirement.md`
- Architecture review: `03-architecture/CF-W1-HCTX-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-HCTX-01-historical-context-explainability-contract.md`
- Work packet: `08-work-packets/CF-W1-HCTX-01-work-packet.md`
- QA plan: `04-qa/CF-W1-HCTX-01-qa-plan.md`
- Team 03 architecture outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved backend module files.

Branch/worktree:

- Branch: `codex/team05-market-data/CF-W1-HCTX-01`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-HCTX-01`

Allowed files:

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-01-developer-handoff.md`

Forbidden files:

- Prisma schema or migrations
- generated files
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- backend or frontend route registries
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/smart-money-intelligence/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/signal-calibration-engine/**`
- shared backend utilities or shared DTOs
- shared frontend components
- frontend source or tests
- package manifests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- add additive lookup explainability metadata for market, sector, country, smart-money, and data-quality selection evidence;
- distinguish exact-date, nearest-prior, missing-within-lookback, metadata-gap, and not-requested states;
- expose requested date, lookback days, region, asset type, selected snapshot date, lag days, per-slice source, top-level selected nearest snapshot date, max lag, partial flag, and concise research-support summary;
- preserve current lookup fields, route behavior, query behavior, `dataStatus`, and `gaps[]`;
- do not add a second repository search to distinguish never-generated from older-than-lookback evidence;
- do not edit upstream producers or downstream consumers in this slice.

Focused validation guidance:

```powershell
cd backend
npm.cmd test -- historical-context-snapshots.service.test.ts --runInBand
npm.cmd run build
```

Stop and return to Team 00 if implementation requires repository/controller/router/validation/index edits, schema/generated/route/shared/package/frontend/provider/startup/live changes, upstream Market Context, Smart Money, Market Data, Signal Calibration, or Signal Quality source changes, or a semantic rewrite of nearest-snapshot lookup.

## Active Ready Handoff - `CF-W1-CAL-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-CAL-01` against Ready gates and promoted it as an independent Team 06 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- Architecture review: `03-architecture/CF-W1-CAL-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-CAL-01-signal-calibration-reliability-drift-contract.md`
- Work packet: `08-work-packets/CF-W1-CAL-01-work-packet.md`
- QA plan: `04-qa/CF-W1-CAL-01-qa-plan.md`
- Team 03 architecture outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Team 04 QA outbox: `17-team-outboxes/TEAM-04-qa-factory.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved `signal-calibration-engine` files.

Branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-CAL-01`

Allowed files:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Optional only if endpoint-level additive payload assertions are needed:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-developer-handoff.md`

Forbidden files:

- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- `backend/src/modules/signal-quality-lab/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/historical-context-snapshots/**`
- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- frontend source/tests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- add additive calibration trust-state metadata inside existing `calibrationReadiness`;
- represent trusted, limited, diagnostic-only, unavailable-no-evidence, and unavailable-blocking-DQ states;
- fail closed for `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID`;
- preserve existing score math, readiness/evidence fields, route behavior, response compatibility, and research-support language;
- do not change Signal Quality Lab, Data Quality Engine, Historical Context, route contracts, schema, frontend, shared files, packages, or generated files.

Focused validation command:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
npm.cmd run build
```

If route-level payload assertions are added:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts signal-calibration-engine.routes.test.ts --runInBand
```

Stop and return to Team 00 if implementation requires any forbidden file, DQE/HCTX/SQLAB source changes, schema/generated/route/shared/package/frontend/provider/startup/live-provider scope, score-math rewrites, or vague missing-DQ/blocking-DQ messaging that does not preserve the QA-plan distinctions.

## Active Ready Handoff - `CF-W1-AUTH-SUB-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-AUTH-01` and `CF-W1-SUB-01` against Ready gates and promoted one combined Team 09 backend-only controller-policy slice to avoid overlapping subscription controller/test/doc writers.

Gate evidence:

- Auth requirement: `10-requirements/CF-W1-AUTH-01-platform-auth-default-user-fallback-requirement.md`
- Subscription requirement: `10-requirements/CF-W1-SUB-01-local-manual-subscription-plan-policy-requirement.md`
- Auth contract: `06-contracts/CF-W1-AUTH-01-platform-auth-fail-closed-contract.md`
- Subscription contract: `06-contracts/CF-W1-SUB-01-manual-subscription-plan-policy-contract.md`
- Auth work packet: `08-work-packets/CF-W1-AUTH-01-work-packet.md`
- Subscription work packet: `08-work-packets/CF-W1-SUB-01-work-packet.md`
- Combined work packet: `08-work-packets/CF-W1-AUTH-SUB-01-combined-controller-policy-work-packet.md`
- Combined QA plan: `04-qa/CF-W1-AUTH-SUB-01-controller-policy-qa-plan.md`
- Team 09 readiness evidence: `17-team-outboxes/TEAM-09-outbox.md`
- Open decisions: none.
- Shared-file conflict: resolved by one combined Team 09 writer.

Branch/worktree:

- Branch: `codex/team09-platform/CF-W1-AUTH-SUB-01`
- Worktree: `../investment-scanner-worktrees/team09-CF-W1-AUTH-SUB-01`

Allowed files:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts`
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md`

Forbidden files:

- `backend/src/modules/auth-identity/**`
- shared auth middleware
- backend route registries
- subscription or notification routers
- subscription or notification services, repositories, providers, or validation files
- Prisma schema or migrations
- shared backend utilities or shared DTOs
- frontend files, routes, or shared UI
- package manifests
- generated files
- backend server or env-example files
- provider startup/backfill, live-provider, paid/cloud, broker, telemetry, or credential flows

Required behavior:

- protected subscription controller actions fail closed when `req.user.id` is missing;
- protected notification controller actions fail closed when `req.user.id` is missing;
- protected controllers must not call services with `default-user`;
- authenticated controller actions pass the actual `req.user.id`;
- ordinary users cannot self-change plans or self-select `ADMIN`;
- admin/manual plan update remains guarded by `ADMIN_API_KEY`;
- subscription/notification docs describe the controller policy and frontend subscription UI limitation.

Focused validation command:

```powershell
cd backend
npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand
npm.cmd run build
```

Stop and return to Team 00 if implementation requires auth middleware, route registries, routers, services, repositories, providers, validation files, Prisma/schema/migrations, shared utilities/UI, frontend, package/generated/server/env files, paid/cloud/live-provider/startup/backfill/broker/telemetry/credential scope, or changing public route paths.

## Active Ready Handoff - `CF-W1-SQLAB-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-SQLAB-01` against Ready gates and promoted it as an independent Team 06 backend-only Signal Quality Lab implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-SQLAB-01-signal-quality-outcome-confidence-requirement.md`
- Architecture review: `03-architecture/CF-W1-SQLAB-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-SQLAB-01-signal-quality-outcome-confidence-contract.md`
- Work packet: `08-work-packets/CF-W1-SQLAB-01-work-packet.md`
- QA plan: `04-qa/CF-W1-SQLAB-01-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside reserved `signal-quality-lab` service/types/doc/test files.

Branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-SQLAB-01`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-SQLAB-01`

Allowed files:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`

Optional only if endpoint-level additive response assertions are added:

- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`

Forbidden files:

- Prisma schema or migrations
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- Data Quality Engine source or exports
- Signal Generation, Signal Calibration, Strategy Decision, or Trade Plan source/tests
- backend and frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- frontend source/tests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- add additive outcome-confidence metadata that distinguishes `TRUSTED`, `LIMITED`, `DIAGNOSTIC`, and `UNTRUSTED`;
- derive those states from existing selected-horizon evidence and Data Quality evaluation presence/blockers;
- preserve existing evidence diagnostics, grouped metric statuses, `recommendedAction`, warnings, and summary/group payload compatibility;
- do not make DQ required by default or change query/filter behavior in this slice;
- preserve research-support wording and avoid direct advice, target-price framing, broker, or automation wording.

Focused validation guidance:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts --runInBand
npm.cmd run build
```

If route-level additive assertions are added:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts signal-quality-lab.routes.test.ts --runInBand
```

## Active Ready Handoff - `CF-W1-UX-01A`

Date promoted: 2026-05-18

Team 00 evaluated the narrowed `CF-W1-UX-01A` child against Ready gates and promoted it as an independent Team 08 frontend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-UX-01-stock-research-workbench-trust-surfaces-requirement.md`
- Architecture review: `03-architecture/CF-W1-UX-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-UX-01-stock-research-workbench-trust-surfaces-contract.md`
- Work packet: `08-work-packets/CF-W1-UX-01-work-packet.md`
- QA plan: `04-qa/CF-W1-UX-01-qa-plan.md`
- UX source mapping: `09-summaries/CF-W1-UX-01-ux-source-mapping.md`
- Team 08 reservation acceptance: `17-team-outboxes/TEAM-08-outbox.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved Stock Research Workbench frontend files and does not edit downstream widget internals.

Branch/worktree:

- Branch: `codex/team08-ux-research/CF-W1-UX-01A`
- Worktree: `../investment-scanner-worktrees/team08-CF-W1-UX-01A`

Allowed files:

- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

Forbidden files:

- `backend/src/modules/stock-research-workbench/**`
- backend tests
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- shared frontend components
- frontend route registries or navigation metadata
- backend route registries
- Prisma schema or migrations
- package manifests
- generated files
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- derive page trust framing only from existing Workbench response fields plus currently requested `region` / `assetType` from market scope;
- show requested scope only as requested/unverified scope, not as verified scope;
- map `COMPLETE` to limited research context, not trusted or ready context;
- map `PARTIAL` and `DELAYED` to limited context with visible warning reasons;
- map `MISSING` and `ERROR` to blocked context with visible blocker reasons and page-owned downstream widget suppression;
- keep Signal and Strategy widgets unmodified;
- do not claim DQ readiness, latest trusted data date, downstream eligibility, reliability, or action readiness;
- preserve existing loading, error, chart, fundamentals, valuation, peers, and corporate-action empty states;
- use research-support language only.

Focused validation guidance:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

Stop and return to Team 00 if implementation requires backend DTO or endpoint changes, API service changes, SignalWidget or StrategyDecisionWidget edits, shared UI, routes/navigation, package changes, generated files, or new trust fields that current source cannot prove.

## Active Ready Handoff - `CF-W1-L3-TREV-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-L3-TREV-01` against Ready gates and promoted it as an independent Team 07 Today Review implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-L3-TREV-01-today-review-publication-evidence-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-TREV-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-TREV-01-today-review-publication-evidence-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-TREV-01-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-TREV-01-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved Today Review backend/feature/test files.

Branch/worktree:

- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-TREV-01`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-TREV-01`

Allowed files:

- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Optional only if repository legacy-read-path synthesis is added:

- `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`

Forbidden files:

- Prisma schema or migrations
- backend or frontend route registries
- Market Data Foundation, Data Quality Engine, Strategy Decision Engine, or Trade Plan source/tests
- Today Review controller, router, validation, controller tests, API hooks, and candidate-detail page
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Required behavior:

- add stable additive `publicationEvidence` metadata to the Today Review run `sourceSnapshot`;
- persist it for new runs without schema or route changes;
- synthesize equivalent evidence on read for legacy runs that lack it;
- expose run/list publication outcome, mode source, readiness state, trusted-universe availability, scan completion, membership-load status, failure reason, and outside-trusted-universe exclusion count;
- keep candidate detail read-only research support and do not widen candidate-detail run evidence in this slice;
- preserve outside-trusted-universe Strategy Decision exclusion from all Today Review candidate sections.

Focused validation guidance:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
```

If repository synthesis is added:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts today-trade-review.repository.test.ts --runInBand
```

If frontend files are edited:

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
npm.cmd run build
```

Backend build after backend changes:

```powershell
cd backend
npm.cmd run build
```

## Active Ready Handoff - `CF-W1-MD-01`

Date promoted: 2026-05-18

Team 00 evaluated the narrowed `CF-W1-MD-01` child against Ready gates and promoted it as an independent Team 05 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-MD-01-market-data-validation-hardening-policy-requirement.md`
- Architecture contract: `06-contracts/CF-W1-MD-01-market-data-validation-hardening-contract.md`
- Work packet: `08-work-packets/CF-W1-MD-01-work-packet.md`
- QA plan: `04-qa/CF-W1-MD-01-qa-plan.md`
- Team 05 readiness inspection: `17-team-outboxes/TEAM-05-outbox.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the three reserved Market Data validator/test/doc files.

Allowed files:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

Forbidden files:

- Market Data repository, provider, adapter, Angel One provider, service, scheduler, worker, queue, router, controller, and types files
- Market Data readiness/storage invariant tests
- Data Quality Engine source/tests
- Prisma schema or migrations
- generated files
- route registries
- shared backend utilities
- package manifests
- providers, schedulers, startup/backfill, repair, sync, import, Angel One, broker, live-provider, paid/cloud, or telemetry flows
- frontend source, shared UI, or Playwright tests
- durable readiness storage or natural-key implementation under `CF-W1-MD-02`

Required behavior:

- reject future-dated candles using validator-local, backward-compatible boundary behavior;
- reject invalid present `adjustedClose` values;
- keep negative volume invalid;
- preserve duplicate-row determinism;
- keep spike rejection opt-in and off by default.

Explicitly deferred:

- missing `adjustedClose` fallback/incomplete evidence;
- zero/suspicious-volume warning/readiness evidence;
- repository/provider/startup plumbing for a formal latest-session boundary.

Focused validation command:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts --runInBand
npm.cmd run build
```

## Active Ready Handoff - `CF-W1-L3-ALERT-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-L3-ALERT-01` against Ready gates and promoted it as an independent Team 07 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-L3-ALERT-01-alert-readiness-suppression-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-ALERT-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-ALERT-01-alert-readiness-suppression-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-ALERT-01-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-ALERT-01-qa-plan.md`
- Team 03 reservation matrix: `03-architecture/team03-near-ready-file-reservation-matrix-2026-05-18.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside reserved alerts-monitoring files and does not run in parallel with `CF-W1-L3-AUTH-03`.

Allowed files:

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`

Optional only if ownership-sensitive behavior is touched:

- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

Forbidden files:

- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- Data Quality Engine source or public exports
- Portfolio Management source/tests
- Watchlist Management source/tests
- Portfolio Intelligence source/tests
- notification or copilot digest consumers
- frontend files
- providers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

Focused validation command:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.validation.test.ts --runInBand
```

## Active Ready Handoff - `CF-W1-NOTIF-02`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-NOTIF-02` against Ready gates and promoted it as an independent Team 09 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-NOTIF-02-notification-log-redaction-requirement.md`
- Architecture review: `03-architecture/CF-W1-NOTIF-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-NOTIF-02-notification-log-redaction-contract.md`
- Work packet: `08-work-packets/CF-W1-NOTIF-02-work-packet.md`
- QA plan: `04-qa/CF-W1-NOTIF-02-qa-plan.md`
- Team 09 readiness evidence: `17-team-outboxes/TEAM-09-outbox.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved provider/test/doc files.

Allowed files:

- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Forbidden files:

- notification controller, service, repository, router, validation, or unrelated tests
- auth-identity source/tests
- subscription-billing source/tests
- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- frontend files
- backend/src/server.ts
- backend/.env.example
- external provider, SMTP implementation, provider startup, live provider, paid/cloud, broker, or telemetry flows

Focused validation command:

```powershell
cd backend
npm.cmd test -- notifications-delivery.service.test.ts --runInBand
```

## Active Ready Handoff - `CF-W1-L3-PORT-01A`

Date promoted: 2026-05-18

Current status: Pulled by Team 07; first developer handoff routed to Team 04 and Team 10 on 2026-05-18; Team 10 rejected for bounded rework on 2026-05-18.

Team 00 evaluated `CF-W1-L3-PORT-01A` against the Ready gates and promoted it as the first Lane 3 readiness implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-L3-PORT-01A-portfolio-readiness-dto-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-PORT-01-qa-plan.md`
- Team 03 reservation matrix: `03-architecture/team03-near-ready-file-reservation-matrix-2026-05-18.md`
- Team 07 readiness evidence: `17-team-outboxes/TEAM-07-outbox.md`
- Open decisions: none.
- Shared/high-risk blocker: none if the implementation stays within the reserved portfolio-management files and consumes Data Quality through public service outputs only.

Allowed files:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Forbidden files:

- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- Data Quality Engine source or public exports
- watchlist-management source/tests
- alerts-monitoring source/tests
- portfolio-intelligence source/tests
- frontend files
- providers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

Required behavior:

- Add module-local readiness DTO fields to portfolio holding valuation output.
- Add portfolio-level readiness summary to portfolio summary output.
- Preserve existing portfolio response fields, route paths, `dataStatus`, price, valuation, and signal fields.
- Consume `DataQualityEngineService` and `DataQualityEvaluationDto` only through Data Quality public exports.
- Do not duplicate Data Quality scoring, stale thresholds, liquidity scoring, or coverage scoring.
- Treat `READY` as trusted display/action eligibility only as defined by the accepted contract.
- Treat `LIMITED` as passive display only with visible reasons and blocked action eligibility.
- Treat missing, `NOT_READY`, `UNUSABLE`, stale hard blocker, unsupported, scope mismatch, or blocked tier evidence as blocked/untrusted.
- Ensure `dataStatus = COMPLETE` does not imply Data Quality trust.

Focused validation command:

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts --runInBand
```

Stop and return to Team 00 if implementation requires any forbidden file, Data Quality export/source changes, shared DTO/helper changes, watchlist scope, frontend/UI work, route/schema/package/generated changes, provider/startup/live-data behavior, or treating `LIMITED` as action-ready.

## Current Queue Notes

Team 00 consumed Team 01's 2026-05-18 readiness drift audit. That initial routing kept the ready queue closed, then this Team 00 Ready evaluation promoted `CF-W1-L3-PORT-01A` as the first active application-code item.

`CF-W1-L3-AUTH-01` was pulled by Team 07, implemented, validated, reviewed, accepted under standing delegation, committed locally as `74ba6dd`, and moved out of the live ready queue.

`CF-W1-L3-AUTH-02` was unblocked by Product Owner Option B, implemented, validated, reviewed, accepted under standing delegation, committed locally as `503bcd9`, and moved out of the live ready queue.

`CF-W1-SIG-TRIGGER-01` was unblocked by Product Owner Option A, implemented as an additive DTO projection, validated, reviewed, accepted under standing delegation, committed locally as `6ab3999`, and moved out of the live ready queue.

Product Owner resolved the three current Decision Inbox items on 2026-05-17:

- `CF-W1-L3-DQ-01`: Option B, passive `LIMITED` display with action-like blocking.
- `CF-W1-TP-01A`: Option B, backend-only compatibility direction.
- `CF-W1-MD-02`: Option B as ADR direction only, companion durable readiness/evidence storage.

Those decisions remove the Decision Inbox blockers, but they are not app-code implementation handoffs. The affected items still need post-decision child contracts, refreshed QA scenarios, exact file reservations, and Team 00 Ready promotion before any app-code team can pull them.

Post-decision child prep has advanced. Team 00 promoted one child item to Ready; the rest remain out of Ready:

- `CF-W1-L3-PORT-01A`: promoted to Ready as the portfolio-only readiness DTO child. Team 07 owns the bounded implementation in the dedicated branch/worktree recorded above.
- `CF-W1-L3-ALERT-01`: alert readiness suppression child architecture contract, Team 03 near-ready file-reservation matrix, exact backend reservations, and child QA plan are prepared; still needs Team 00 Ready promotion.
- `CF-W1-L3-AUTH-03`: alert rule target ownership requirement, architecture review, contract, work packet, and QA plan are prepared; still needs Team 00 Ready promotion.
- `CF-W1-L3-INTEL-01`: portfolio-intelligence reliability requirement, architecture review, contract, work packet, QA plan, and Team 03 signoff are prepared; still blocked until `CF-W1-L3-PORT-01A` is accepted and Team 00 promotes the child.
- `CF-W1-TP-01B`: Trade Plan backend-only compatibility/DQ hard-block child architecture contract, Team 03 near-ready file-reservation matrix, exact backend reservations, child QA plan, and Team 06 readiness inspection are prepared; still needs Team 00 Ready promotion.
- `CF-W1-NOTIF-02`: notification log redaction requirement, architecture review, contract, work packet, platform QA plan, and Team 03 near-ready file-reservation matrix are prepared; still needs Team 00/Team 09 Ready promotion.

Product Owner resolved the five current Decision Inbox items on 2026-05-18:

- `CF-W1-AUTH-01`: Option A, protected Team 09 controllers fail closed when `req.user.id` is missing.
- `CF-W1-SUB-01`: Option A, ordinary users may not self-change plan or self-select `ADMIN`; plan changes are admin/manual only.
- `CF-W1-UX-02`: Option B, first slice is Copilot-only with research-support naming and blocked narrative hidden.
- `CF-W1-UX-05`: Option A, first product-language cleanup is Copilot-only after or with the Copilot trust slice; shared `StatusBadge` remains future.
- `CF-W1-MD-01`: Option A, future-dated candles and invalid adjusted close are rejected; missing adjusted close is fallback/incomplete evidence; suspicious volume is warning evidence; spike rejection remains opt-in.

Those decisions remove the Decision Inbox blockers, but they are not app-code implementation handoffs. Team 03/04 have since prepared module-specific contract/work-packet and QA refreshes for the affected items; each still needs its remaining upstream owner check, exact Team 00 implementation handoff, and Ready promotion before any app-code team can pull it.

Newly resolved but still not Ready:

- `CF-W1-AUTH-01`: Team 03 contract/work packet and Team 04 QA refresh are prepared; needs Team 00 Ready promotion, Team 09 handoff, and sequencing/combining with `CF-W1-SUB-01` because subscription files overlap.
- `CF-W1-SUB-01`: Team 03 contract/work packet and Team 04 QA refresh are prepared; needs Team 00 Ready promotion, Team 09 handoff, and sequencing/combining with `CF-W1-AUTH-01` because subscription files overlap.
- `CF-W1-UX-02`: Team 03 Copilot-only contract/work packet and Team 04 QA refresh are prepared; needs Team 08 source-supported trust-field mapping, exact handoff, and Team 00 Ready promotion.
- `CF-W1-UX-05`: Team 03 Copilot-only contract/work packet and Team 04 QA refresh are prepared; needs folding into or sequencing after `CF-W1-UX-02`; shared UI remains forbidden.
- `CF-W1-MD-01`: Team 03 validation-only work packet and Team 04 QA refresh are prepared; needs Team 05 readiness acceptance, Team 00 Ready promotion, and no storage/provider/schema scope.

## Completed Slices Not Active For Pull

The following are completed, superseded, or split and must not be treated as active implementation work:

- `CF-W2-DQ-01`
- `CF-W2-SIG-01A`
- `CF-W1-SIG-01B`
- `CF-W1-SIG-LATEST-01`
- `CF-W1-STRAT-01`
- `CF-W1-QA-01`
- `CF-W1-L3-AUTH-01`
- `CF-W1-L3-AUTH-02`
- `CF-W1-SIG-TRIGGER-01`
- legacy parent `CF-W1-SIG-01`
- legacy parent/superseded `CF-W1-DQ-01`
- legacy parent `CF-W1-TP-01`

## Why Other Code Items Were Not Pulled

The remaining top findings still require at least one of:

- refreshed Architect child contract or ADR record,
- exact module-level file reservation,
- refreshed QA scenario matrix,
- source-changing implementation packet,
- schema/migration approval for future Market Data storage work,
- shared-file reservation,
- upstream dependency completion,
- focused QA plan.

Forcing implementation now would either preserve unsafe behavior with misleading tests or skip the required child-slice gates after Product Owner policy resolution.

## Next Safe Work

Docs-only contract and QA preparation should now follow the Product Owner corrected investor/trader-value order:

1. `CF-W1-BT-02`
2. `CF-W1-HCTX-01`
3. `CF-W1-MCTX-01`
4. `CF-W1-CAL-01`
5. `CF-W1-SQLAB-02`
6. `CF-W1-STRAT-02`
7. `CF-W1-DQ-02`
8. `CF-W1-TP-01B`
9. `CF-W1-MD-02`
10. `CF-W1-UX-01`

Platform, notification, auth/subscription, settings, and alert convenience items should not preempt this stack unless they block correctness, privacy, user-data safety, or an already accepted branch gate.

Next Team 00/owner work:

- `CF-W1-BT-02`: route Team 03 architecture/contract refresh, then Team 04 QA refresh.
- `CF-W1-HCTX-01`: prepare historical lookup provenance packet after `BT-02`.
- `CF-W1-MCTX-01`: prepare market context regime-evidence packet after `HCTX-01`.
- `CF-W1-CAL-01`: prepare calibration trust-drift packet after context evidence prep.
- `CF-W1-TP-01B`: reconcile branch/review state before any further Ready work.
- `CF-W1-MD-02`: continue ADR and split-packet prep only; no schema/source promotion.

No app-code item became Ready during decision resolution itself. `CF-W1-L3-PORT-01A` was later promoted by Team 00 after requirement, architecture, QA, reservation, and Team 07 readiness gates passed.

---

## Active Ready Handoff - `CF-W1-SIG-TRIGGER-02A`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-SIG-TRIGGER-02A` against Ready gates and promoted it as an independent Team 06 backend-only implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-requirement.md`
- Architecture review: `03-architecture/CF-W1-SIG-TRIGGER-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-contract.md`
- Work packet: `08-work-packets/CF-W1-SIG-TRIGGER-02-work-packet.md`
- QA plan: `04-qa/CF-W1-SIG-TRIGGER-02A-qa-plan.md`
- Team 03 architecture outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Team 04 QA outbox: `17-team-outboxes/TEAM-04-qa-factory.md`
- Open decisions: none.
- Prior dependency: `CF-W1-SIG-TRIGGER-01` commit `6ab3999` is an ancestor of current `dev`; current source includes `triggerContract` projection.
- Shared/high-risk blocker: none if implementation stays inside the reserved `signal-generation-engine` files and backend tests.

Branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-SIG-TRIGGER-02A`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-SIG-TRIGGER-02A`

Allowed files:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SIG-TRIGGER-02A-developer-handoff.md`

Forbidden files:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- backend/frontend route registries
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- all downstream module source, frontend source, shared utilities/UI, package manifests, provider/live-data, paid/cloud, broker, and telemetry files.

Required behavior:

- surface persisted `created_at` and `updated_at` for current `SignalResult` rows;
- expose additive run audit metadata when `generationRunId` resolves to a run row;
- label `trigger_timestamp` semantics as source-price-date, source-data-date, or unavailable;
- label transient `strategyMatches[]` provenance as compatibility-only;
- keep `trigger_price`, rule ids, timeframe, and unproven lifecycle state unavailable;
- preserve legacy incomplete handling and strict DQ trusted read/run/latest behavior.

Required validation after implementation:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

2026-05-18 acceptance update:

- `CF-W1-HCTX-01` completed Team 05 implementation, Team 04 QA, Team 10 review, Team 03 Architect Signoff, delegated PO acceptance, and scoped local branch commit `23b6c92`.
- The branch commit is parked for later clean integration and has not been pushed or merged to `dev`.

2026-05-18 Ready promotion result:

- `CF-W1-L3-PORT-01A` was promoted for Team 07 implementation in `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`.
- Team 07 used `../investment-scanner-worktrees/team07-CF-W1-L3-PORT-01A`.
- The shared `dev` workspace contains unrelated active-doc changes from other teams; Team 07 implementation remains isolated in the dedicated worktree.

2026-05-18 Developer handoff routing result:

- `CF-W1-L3-PORT-01A` developer handoff was submitted from the Team 07 worktree.
- Team 04 owns QA Verification.
- Team 10 owns Code Review / Release Readiness precheck.
- No commit is authorized until QA, review, Architect Signoff, delegated PO acceptance, and Team 00 staged-scope verification pass.

2026-05-18 review result:

- Team 04 first-pass focused QA passed.
- Team 10 rejected release acceptance because automation-only Data Quality blockers can be treated as portfolio display hard blockers.
- Team 07 must revise within the existing file reservation and add the focused automation-blocked DQE case.
- Team 04 must rerun QA, then Team 10 must re-review.
- No Product Owner action is required unless the rework needs forbidden scope.

2026-05-18 routing result:

- `CF-W1-L3-PORT-01A`, `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01` are assigned back to Teams 02/03/04 and their lane teams for readiness inspection.
- `CF-W1-L3-INTEL-01` remains blocked behind accepted `CF-W1-L3-PORT-01A`.
- The stale completed-work inbox `16-team-inboxes/TEAM-07-CF-W1-L3-AUTH-01.md` must not be used as current Ready evidence.
- No application source/test implementation is authorized by this routing update.

2026-05-18 decision resolution result:

- Open decisions are zero.
- Product Owner action is not required.
- Daemon should continue autonomous work.
- No application-code item became Ready from the five policy resolutions.

## Ready Criteria Reminder

Move an app-code item here only when all of the following are proven:

- accepted requirement,
- accepted architecture contract or architecture review,
- accepted QA plan,
- exact allowed and forbidden file reservations,
- no unresolved Product Owner, Architect, QA, shared-file, schema, route, package, provider, or upstream blocker,
- local-first and zero-incremental-cost constraints preserved.

---

## Active Ready Handoff - `CF-W1-MCTX-01`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-MCTX-01` against Ready gates and promoted it as an independent Team 05 implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-MCTX-01-market-context-regime-evidence-requirement.md`
- Architecture review: `03-architecture/CF-W1-MCTX-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-MCTX-01-market-context-regime-evidence-contract.md`
- Work packet: `08-work-packets/CF-W1-MCTX-01-work-packet.md`
- QA plan: `04-qa/CF-W1-MCTX-01-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside the reserved `market-context-intelligence` backend and feature-local frontend files.

Branch/worktree:

- Branch: `codex/team05-market-data/CF-W1-MCTX-01`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-MCTX-01`

Allowed files:

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- `frontend/src/features/market-context-intelligence/types.ts`
- `frontend/src/features/market-context-intelligence/components/MarketContextPage.tsx`
- `frontend/src/features/market-context-intelligence/components/MarketRegimeWidget.tsx`
- `frontend/tests/ui/market-context-intelligence.spec.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MCTX-01-developer-handoff.md`

Forbidden files:

- Prisma schema or migrations
- generated files
- `backend/src/modules/market-context-intelligence/market-context-intelligence.repository.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.controller.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.router.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.validation.ts`
- `backend/src/modules/market-context-intelligence/index.ts`
- backend or frontend route registries
- `frontend/src/features/market-context-intelligence/routes.tsx`
- `frontend/src/features/market-context-intelligence/api/**`
- `frontend/src/features/market-context-intelligence/hooks/**`
- upstream/downstream module source, shared utilities/UI, package manifests, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, and broad UX/navigation work.

Required behavior:

- add additive market-context evidence metadata for trustworthy, partial, low-evidence, and missing-evidence regime states;
- expose persisted-versus-fresh provenance explicitly;
- preserve exact fresh breadth denominators on the auto-generation path;
- mark persisted denominator reconstruction as derived and partial when exact SMA denominators are unavailable;
- keep macro explicitly missing with stable reason framing;
- render the evidence on existing Market Context page and Market Regime widget surfaces only;
- preserve current routes, query params, existing fields, and research-support language.

Required validation after implementation:

```powershell
cd backend
npm.cmd test -- market-context-intelligence.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- market-context-intelligence.spec.ts --workers=1
npm.cmd run build
```

---

## Active Ready Handoff - `CF-W1-MD-03`

Date promoted: 2026-05-18

Team 00 evaluated `CF-W1-MD-03` against Ready gates and promoted it as an independent Team 05 backend-only Market Data implementation slice.

Gate evidence:

- Requirement: `10-requirements/CF-W1-MD-03-market-data-signoff-threshold-contract-requirement.md`
- Architecture review: `03-architecture/CF-W1-MD-03-architecture-review.md`
- Contract: `06-contracts/CF-W1-MD-03-market-data-signoff-threshold-contract.md`
- Work packet: `08-work-packets/CF-W1-MD-03-work-packet.md`
- QA plan: `04-qa/CF-W1-MD-03-qa-plan.md`
- Open decisions: none.
- Shared/high-risk blocker: none if implementation stays inside reserved Market Data service/doc/focused tests.

Branch/worktree:

- Branch: `codex/team05-market-data/CF-W1-MD-03`
- Worktree: `../investment-scanner-worktrees/team05-CF-W1-MD-03`

Allowed files:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-MD-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-MD-03-developer-handoff.md`

Forbidden files:

- Prisma schema or migrations
- generated files
- Market Data repository, provider, validation, types, controller, router, scheduler, worker, and queue files
- Data Quality Engine source/tests
- route registries
- shared backend utilities
- package manifests
- frontend or shared UI files
- provider/live-data/startup/backfill redesign
- `CF-W1-MD-02A` and future `CF-W1-MD-02B` durable evidence/schema work
- paid/cloud, broker, telemetry, or credentials

Required behavior:

- add explicit universe signoff blockers for price coverage below `95%` and metadata coverage below `90%`;
- keep `downstreamAllowed=false` whenever either threshold misses;
- preserve existing review-ready minimum-count and `10%` review-ready-share gates;
- keep threshold blocker reasoning separate and specific;
- preserve current coverage fields, response shape, route behavior, and universe-state classification;
- update module docs for the enforced Universe Signoff threshold policy.

Required validation after implementation:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.universe.test.ts --runInBand
npm.cmd run build
```
