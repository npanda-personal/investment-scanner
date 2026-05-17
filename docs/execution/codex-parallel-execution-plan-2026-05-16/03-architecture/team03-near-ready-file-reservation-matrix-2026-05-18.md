# Team 03 Near-Ready File Reservation Matrix

Date: 2026-05-18

Owner: Team 03 Architecture Factory

Status: Architecture readiness inspection complete. No item is promoted to Ready for Implementation by this artifact.

## Evidence Sync

- Branch/worktree: `dev` / `C:\work\repo\investment-scanner`
- Latest commit observed: `c739f78 docs: route team 01 audit findings to parallel teams`
- Ready queue: `12-ready-queue/ready-for-implementation.md` still reports no active application-code item is Ready.
- Worktree state: dirty shared docs workspace with unrelated active changes from Team 02, Team 04, Team 06, Team 07, and Team 09. Team 03 did not stage, revert, or overwrite those files.

## Inspection Inputs

- `16-team-inboxes/TEAM-03-current-assignment.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-upstream-dependency.md`
- `99-decision-inbox/open-decisions.md`
- `10-requirements/CF-W1-L3-PORT-01A-portfolio-readiness-dto-requirement.md`
- `10-requirements/CF-W1-TP-01B-trade-plan-backend-dq-hard-block-requirement.md`
- `10-requirements/CF-W1-NOTIF-02-notification-log-redaction-requirement.md`
- `10-requirements/CF-W1-L3-ALERT-01-alert-readiness-suppression-requirement.md`
- `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- `03-architecture/CF-W1-TP-01B-architecture-review.md`
- `03-architecture/CF-W1-NOTIF-02-architecture-review.md`
- `03-architecture/CF-W1-L3-ALERT-01-architecture-review.md`
- `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`
- `06-contracts/CF-W1-NOTIF-02-notification-log-redaction-contract.md`
- `06-contracts/CF-W1-L3-ALERT-01-alert-readiness-suppression-contract.md`
- `04-qa/CF-W1-L3-PORT-01-qa-plan.md`
- `04-qa/CF-W1-TP-01B-qa-plan.md`
- `04-qa/CF-W1-NOTIF-02-qa-plan.md`
- `04-qa/CF-W1-L3-ALERT-01-qa-plan.md`
- `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`
- `08-work-packets/CF-W1-TP-01B-work-packet.md`
- `08-work-packets/CF-W1-NOTIF-02-work-packet.md`
- `08-work-packets/CF-W1-L3-ALERT-01-work-packet.md`
- Team 06, Team 07, and Team 09 readiness/outbox evidence for their candidate slices.

## Readiness Matrix

| Candidate | Team 03 architecture result | Exact allowed files after Team 00 promotion | Shared/high-risk request | Decision blocker | Current blocker | Team 03 recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| `CF-W1-L3-PORT-01A` | Portfolio-only child is bounded and implementation-eligible. Team 00 promoted it on 2026-05-18. Keep separate from watchlist. | `backend/src/modules/portfolio-management/portfolio-management.service.ts`; `backend/src/modules/portfolio-management/portfolio-management.types.ts`; `backend/src/modules/portfolio-management/portfolio-management.md`; `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts` | None if implementation imports only Data Quality public service/types and does not touch DQE exports or shared DTOs. | None found. Open Decision Inbox items do not block this slice. | No upstream Ready blocker remains. Team 07 must use the dedicated worktree because shared `dev` has unrelated active-doc changes. | Ready handoff written to Team 07. Do not combine with watchlist without Team 00 exception. |
| `CF-W1-TP-01B` | Backend-only Trade Plan compatibility/DQ hard-block child is bounded and aligned with Team 06 readiness inspection. | `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`; `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`; `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`; `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`; `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`; optional only with Architect note: `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts` | None if repository, Prisma, route, frontend, Today Review, shared utility/UI, package, generated, provider, startup/backfill, live-provider, paid/cloud, and telemetry files remain excluded. | None found. Product Owner Option B is already resolved for backend-only compatibility. | Team 00 Ready promotion and implementation handoff. | Promote as a backend-only Lane 2 candidate after Team 00 copies exact reservations and optional geometry rule. |
| `CF-W1-NOTIF-02` | Local notification log redaction is narrowly provider-scoped and aligned with Team 09 readiness check. | `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`; `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`; `backend/src/modules/notifications-delivery/notifications-delivery.md` | None if implementation changes only local log provider payload and focused tests/docs. | None for this slice. Auth fallback and subscription decisions are resolved but remain separate backend policy packets. | Team 00/Team 09 Ready promotion and implementation handoff. | Promote as a small Team 09 backend-only slice when Team 00 is ready; keep auth/subscription policy work separate. |
| `CF-W1-L3-ALERT-01` | Alert readiness suppression child has exact backend reservations and QA plan. Implementation is bounded but should follow `PORT-01A` unless Team 00 chooses otherwise. | `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`; `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`; `backend/src/modules/alerts-monitoring/alerts-monitoring.md`; `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`; optional only if ownership-sensitive paths are touched: `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts` | None if implementation uses Data Quality public service/types and leaves DQE exports, routes, Prisma, notifications, copilot digest, frontend, shared files, providers, and package files untouched. | None found. `LIMITED` behavior is resolved conservatively as suppress/block for alert event creation. | Team 00 Ready promotion and implementation handoff. | Eligible for Ready review, but prefer after `PORT-01A` if Team 00 wants Lane 3 DTO evidence first. |

## Candidate-Specific Stop Conditions

### `CF-W1-L3-PORT-01A`

Stop and return to Team 00 / Architect if the implementation needs:

- Data Quality Engine source or public export changes;
- shared DTO/helper files;
- watchlist, alerts, portfolio-intelligence, frontend, route, Prisma, provider, startup/backfill, package, generated-file, or live-data changes;
- treating `LIMITED` as action-ready;
- breaking existing portfolio response fields.

### `CF-W1-TP-01B`

Stop and return to Team 00 / Architect if the implementation needs:

- removing, renaming, or migrating target-shaped API/storage fields;
- repository, Prisma, route, frontend, Today Review, shared utility/UI, package, generated, provider, startup/backfill, live-provider, paid/cloud, or telemetry files;
- treating `LIMITED` as `READY_FOR_PAPER_REVIEW`;
- direct advice, profit target, price target, guarantee, or trade-instruction wording.

### `CF-W1-NOTIF-02`

Stop and return to Team 00 / Architect if the implementation needs:

- notification controller, service, repository, router, validation, route registry, Prisma, auth, subscription, frontend, shared utility/UI, package, generated, server, env, SMTP, network, or external-provider changes;
- changing persisted notification event shape;
- live email or provider-heavy validation.

### `CF-W1-L3-ALERT-01`

Stop and return to Team 00 / Architect if the implementation needs:

- Data Quality Engine source/export changes;
- Prisma/schema, route registry, shared utility/UI, package, generated, frontend, notification/copilot digest, provider, startup/backfill, live-provider, paid/cloud, telemetry, Angel One, broker, or ownership-model changes;
- creating events from missing, `LIMITED`, `NOT_READY`, `BLOCKED`, stale, unsupported, scope-mismatched, provider-gap, or unusable DQ evidence;
- direct financial advice or arbitrary target-price language.

## Downstream Sequencing

`CF-W1-L3-INTEL-01` remains downstream of accepted `CF-W1-L3-PORT-01A`. Portfolio Intelligence should consume portfolio readiness DTOs after they exist rather than duplicating Data Quality readiness logic.

## Ready Promotion Guidance

Team 03 does not move these items to Ready. Team 00 can evaluate one candidate at a time when the promotion packet repeats:

- accepted requirement;
- accepted architecture contract or architecture review;
- accepted QA plan;
- exact allowed file list;
- exact forbidden file list;
- focused test command guidance;
- no unresolved Product Owner, Architect, QA, shared-file, schema, route, package, provider, upstream, or dirty-worktree blocker.

## Decision Packets

No new Decision Packet is needed from this Team 03 inspection.
