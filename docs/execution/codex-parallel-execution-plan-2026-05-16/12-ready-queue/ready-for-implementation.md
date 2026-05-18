# Ready For Implementation

Date: 2026-05-18

## Current Ready Queue

No available application-code item is currently waiting unassigned in Ready.

`CF-W1-L3-PORT-01A` was pulled by Team 07, implemented in its dedicated worktree, and moved through first-pass QA / Code Review. Team 10 rejected release acceptance and routed bounded rework back to Team 07. It remains uncommitted and unaccepted.

`CF-W1-TP-01B` already has an implementation handoff in the Team 06 worktree and is routed to Team 10 review.

`CF-W1-NOTIF-02` is promoted and pulled by Team 09 for bounded implementation in a dedicated worktree.

`CF-W1-L3-ALERT-01` is promoted and pulled by Team 07 for bounded implementation in a dedicated worktree. It must not run in parallel with `CF-W1-L3-AUTH-03` because both reserve alerts-monitoring files.

`CF-W1-MD-01` is promoted and pulled by Team 05 for a narrowed backend-only reject-only Market Data validator child.

## Pulled / In Review

| ID | Owner | Branch | Worktree | Scope | Status |
| --- | --- | --- | --- | --- | --- |
| `CF-W1-L3-PORT-01A` | Team 07 - Portfolio / Watchlist / Alerts | `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A` | `../investment-scanner-worktrees/team07-CF-W1-L3-PORT-01A` | Backend-only portfolio-management readiness DTOs | Rejected / Rework after Team 10 review; Team 07 revision pending |
| `CF-W1-TP-01B` | Team 06 - Strategy / Signal / Risk | `codex/team06-strategy-signal/CF-W1-TP-01B` | `../investment-scanner-worktrees/team06-CF-W1-TP-01B` | Backend-only Trade Plan DQ hard-block and target compatibility | Implemented in worktree; Team 10 review pending |
| `CF-W1-NOTIF-02` | Team 09 - Platform / Auth / Subscription / Notifications | `codex/team09-platform/CF-W1-NOTIF-02` | `../investment-scanner-worktrees/team09-CF-W1-NOTIF-02` | Backend-only local notification log redaction | Ready and pulled by Team 09 for implementation |
| `CF-W1-L3-ALERT-01` | Team 07 - Portfolio / Watchlist / Alerts | `codex/team07-portfolio-alerts/CF-W1-L3-ALERT-01` | `../investment-scanner-worktrees/team07-CF-W1-L3-ALERT-01` | Backend-only alert readiness suppression | Ready and pulled by Team 07 for implementation |
| `CF-W1-MD-01` | Team 05 - Market Data / Data Quality | `codex/team05-market-data/CF-W1-MD-01` | `../investment-scanner-worktrees/team05-CF-W1-MD-01` | Backend-only reject-only historical-price validator hardening | Ready and pulled by Team 05 for implementation |

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

Docs-only contract and QA preparation:

- `CF-W1-L3-PORT-01A`
- `CF-W1-L3-ALERT-01`
- `CF-W1-L3-AUTH-03`
- `CF-W1-L3-INTEL-01`
- `CF-W1-TP-01B`
- `CF-W1-UX-02`
- `CF-W1-MD-02`
- `CF-W1-MD-01`
- `CF-W1-NOTIF-02`

Next Team 00/owner work should evaluate the remaining prepared child artifacts for Ready promotion:

- `CF-W1-TP-01B`: promote the backend-only Trade Plan compatibility and DQ hard-block child if the prepared contract and QA plan pass Ready gates.
- `CF-W1-NOTIF-02`: promote the notification log redaction slice if the prepared requirement, contract, work packet, and platform QA plan pass Ready gates.
- `CF-W1-L3-ALERT-01`: promote the alert readiness suppression child if the prepared contract and QA plan pass Ready gates.
- `CF-W1-L3-AUTH-03`: promote the alert rule target ownership child if the prepared requirement, contract, work packet, and QA plan pass Ready gates.
- `CF-W1-L3-INTEL-01`: keep queued behind `CF-W1-L3-PORT-01A`; promote only after portfolio readiness DTOs are implemented and accepted.
- `CF-W1-MD-02`: formal ADR and later approval-gated source/schema split packets.
- `CF-W1-AUTH-01`: evaluate prepared Team 09 backend fail-closed controller packet for Ready, sequenced or combined with `CF-W1-SUB-01`.
- `CF-W1-SUB-01`: evaluate prepared Team 09 backend manual/admin-only subscription packet for Ready, sequenced or combined with `CF-W1-AUTH-01`.
- `CF-W1-UX-02`: complete Team 08 source-supported trust-field mapping, then evaluate prepared Copilot-only trust UX packet for Ready.
- `CF-W1-UX-05`: fold Copilot-only copy cleanup into or behind `CF-W1-UX-02`; keep shared status work future.
- `CF-W1-MD-01`: complete Team 05 readiness acceptance, then evaluate prepared Market Data validation-only packet for Ready.

No app-code item became Ready during decision resolution itself. `CF-W1-L3-PORT-01A` was later promoted by Team 00 after requirement, architecture, QA, reservation, and Team 07 readiness gates passed.

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
