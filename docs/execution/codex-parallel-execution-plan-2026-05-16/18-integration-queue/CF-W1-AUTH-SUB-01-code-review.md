# CF-W1-AUTH-SUB-01 - Team 10 Code Review / Release Gate

Date: 2026-05-18

Reviewer: Team 10 - Review / Release

Reviewed branch: `codex/team09-platform/CF-W1-AUTH-SUB-01`

Reviewed worktree: `C:\work\repo\investment-scanner-worktrees\team09-CF-W1-AUTH-SUB-01`

## Decision

`ACCEPT`

Architect Signoff may proceed.

## Findings

No blocking findings.

Review notes:

- Reserved app scope is respected. `git status --short` shows app changes only in the approved subscription and notifications controllers, module docs, and the two new controller tests. No forbidden-file drift was found in auth middleware, routers, services, repositories, providers, validation, Prisma/schema, shared utilities/UI, frontend, package manifests, generated files, or startup/provider flows.
- Protected subscription actions fail closed when `req.user.id` is missing at `backend/src/modules/subscription-billing/subscription-billing.controller.ts:6` to `:15`, and authenticated reads pass the real user id at `:23` to `:26`.
- `POST /subscription/change-plan` is now blocked for ordinary authenticated self-service callers before any service call at `backend/src/modules/subscription-billing/subscription-billing.controller.ts:29` to `:32`, which also blocks `ADMIN` self-selection on that path.
- The admin/manual plan path remains explicit-user-id based and `ADMIN_API_KEY` guarded at `backend/src/modules/subscription-billing/subscription-billing.controller.ts:34` to `:37`.
- Protected notification user-owned actions fail closed when auth context is missing at `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts:4` to `:12`, `:17` to `:37`, and `:49` to `:79`, while provider status remains user-independent at `:41` to `:47`.
- Focused controller tests are meaningful. `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts:21` to `:135` and `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts:14` to `:96` prove missing-auth rejection, real user-id pass-through, blocked self-service plan changes, preserved admin/manual path, and preserved provider-status behavior.
- Module docs capture the backend-first policy and known frontend mismatch in `backend/src/modules/subscription-billing/subscription-billing.md:24`, `:90`, `:96` to `:102`, and `:141`, plus `backend/src/modules/notifications-delivery/notifications-delivery.md:24` and `:91` to `:95`.
- Branch-local integration evidence is present but currently untracked: the two controller tests plus `18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md` and `18-integration-queue/CF-W1-AUTH-SUB-01-qa-verification.md`. This is not a review blocker, but the eventual scoped commit must include them.

## Scope Confirmation

Approved application files reviewed:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts`
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Evidence docs reviewed:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-AUTH-SUB-01-combined-controller-policy-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-AUTH-SUB-01-controller-policy-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-local-manual-subscription-plan-change-policy-resolution.md`

Additional route/service inspection:

- `backend/src/modules/subscription-billing/subscription-billing.router.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.router.ts`
- `backend/src/modules/subscription-billing/subscription-billing.service.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.service.ts`

## Validation

Reviewer commands run:

- read root `AGENTS.md`
- read combined work packet, QA plan, Team 09 handoff, Team 04 QA verification, and decision record
- `git status --short`
- `git branch --show-current`
- `git diff --stat`
- `git diff -- backend/src/modules/subscription-billing/subscription-billing.controller.ts backend/src/modules/notifications-delivery/notifications-delivery.controller.ts backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts backend/src/modules/subscription-billing/subscription-billing.md backend/src/modules/notifications-delivery/notifications-delivery.md`
- `git diff --name-only`
- `git ls-files --others --exclude-standard`
- `Get-Counter '\Memory\% Committed Bytes In Use'`
- `npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand`
- `npm.cmd run build`
- `npm.cmd test -- subscription-billing.routes.test.ts notifications-delivery.routes.test.ts subscription-billing.service.test.ts --runInBand`

Results:

- Memory gate before reruns: approximately `75.25%`.
- Focused controller tests: pass, `2` suites / `9` tests.
- Backend build: pass.
- Optional route/service regression: pass, `3` suites / `7` tests.
- `git diff --name-only` shows only the tracked controller/doc edits plus Team 04 / Team 09 evidence docs; `git ls-files --others --exclude-standard` shows the expected new controller tests and integration handoff/QA docs.

## Release Risk

Residual release risk is low for this bounded controller-policy slice.

Known non-blocking residual risk:

- The frontend billing page may still present self-change affordances until the separate approved UI-alignment slice lands.
- The worktree still contains untracked controller tests and branch-local integration evidence; the later scoped commit must include those files.

## Next Gate

Architect Signoff may proceed.

## Teams Ready To Pick Up New Tasks

- Team 09
- Team 04
- Team 10
- Team 00
