# CF-W1-AUTH-SUB-01 Delegated Product Owner Acceptance Packet

Date: 2026-05-18

Owner: Team 00 - Master Orchestrator / Integration under standing delegation

## Work Item

`CF-W1-AUTH-SUB-01` - combined backend-only controller-policy slice for protected Team 09 fail-closed user context and admin/manual-only subscription plan changes.

## Acceptance Decision

Accepted under standing delegation.

Human Product Owner action required: no.

## Scope Accepted

Accepted implementation scope:

- protected subscription controller actions fail closed when `req.user.id` is missing;
- protected notification controller actions fail closed when `req.user.id` is missing;
- protected controller paths do not call services with `default-user`;
- authenticated controller paths pass the actual user id;
- ordinary authenticated users cannot self-change subscription plans;
- ordinary authenticated users cannot self-select `ADMIN`;
- admin/manual subscription plan update remains `ADMIN_API_KEY` guarded and uses explicit `:userId`;
- module docs record the frontend subscription UI limitation.

## Accepted Files

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts`
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-architect-signoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-AUTH-SUB-01-po-acceptance-packet.md`

## Validation Evidence

- Team 09 developer validation:
  - `npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand` passed.
  - `npm.cmd run build` passed.
  - optional route/service regression passed.
- Team 04 QA verification:
  - focused controller tests passed with `2` suites and `9` tests.
  - backend build passed.
  - optional route/service regression passed with `3` suites and `7` tests.
- Team 10 review:
  - accepted with no blocking findings.
  - confirmed the tests are policy-based and not only route-registration checks.
- Team 03 Architect Signoff:
  - accepted.
  - confirmed the combined handoff resolves the shared subscription controller conflict with one writer.
  - confirmed no forbidden auth middleware, router, route registry, service, repository, provider, validation, Prisma, frontend, package, generated, startup/backfill, or live-provider drift.

## Product Review

Accepted product behavior:

- Protected Team 09 controllers no longer silently fall back to `default-user` when auth context is missing.
- Ordinary users cannot use the local validation app to self-upgrade or self-select `ADMIN`.
- The admin/manual path remains the only backend plan-change path in this slice.

Rejected or deferred scope:

- no auth middleware changes
- no route registry or router changes
- no subscription or notification service/repository/provider/validation changes
- no Prisma/schema/migration changes
- no frontend subscription UI work
- no package, generated, server, env-example, provider startup/backfill, paid/cloud, broker, telemetry, credential, or live-provider changes

## Residual Risk

- Broader legacy `default-user` compatibility remains in unchanged service/repository internals for explicit internal/test compatibility.
- Frontend subscription UI may still show self-change affordances until a separate approved UX slice lands.
- Per the latest Product Owner priority direction, future work should de-prioritize admin/settings/auth/subscription/notifications unless needed for correctness blockers; this accepted branch is parked and not pushed or merged here.

## Release Decision

Team 00 may create a scoped local commit on branch `codex/team09-platform/CF-W1-AUTH-SUB-01` after exact staged-scope verification passes.

Do not push or merge to `dev` during this acceptance packet.
