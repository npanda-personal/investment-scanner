# CF-W1-AUTH-SUB-01 Architect Signoff

Date: 2026-05-18

Owner: Team 03 - Architecture Factory

Reviewed branch: `codex/team09-platform/CF-W1-AUTH-SUB-01`

Reviewed worktree: `C:\work\repo\investment-scanner-worktrees\team09-CF-W1-AUTH-SUB-01`

## Verdict

`SIGNOFF ACCEPT`

Delegated Product Owner acceptance may proceed.

## Scope Verification

Approved application-file reservation remains intact:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts`
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Observed non-application evidence-file changes are acceptable for this gate:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-code-review.md`

No forbidden drift was found in:

- auth middleware or `auth-identity`
- routers or route registries
- services, repositories, providers, or validation files
- Prisma/schema/migrations
- shared backend utilities or shared UI
- frontend files
- package manifests
- generated files
- server/env-example files
- startup/backfill/live-provider, paid/cloud, broker, telemetry, or credential paths

## Architecture Findings

No blocking findings.

Key acceptance points:

1. The combined Team 09 handoff correctly resolves the AUTH/SUB shared subscription controller conflict with one writer, matching the Team 00 Ready promotion and combined work packet.

2. Protected subscription controller paths fail closed when `req.user.id` is missing and do not call services with `default-user`.
   - `backend/src/modules/subscription-billing/subscription-billing.controller.ts:6-15`
   - `backend/src/modules/subscription-billing/subscription-billing.controller.ts:23-31`
   - `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts:21-49`

3. Protected subscription read paths pass the authenticated user id explicitly, and protected controller paths do not route through service defaults.
   - `backend/src/modules/subscription-billing/subscription-billing.controller.ts:23-26`
   - `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts:51-70`

4. Ordinary user self-plan change and `ADMIN` self-selection are blocked at the controller boundary before any service mutation call.
   - `backend/src/modules/subscription-billing/subscription-billing.controller.ts:29-31`
   - `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts:72-98`

5. The admin/manual subscription path remains explicit and `ADMIN_API_KEY` guarded.
   - `backend/src/modules/subscription-billing/subscription-billing.controller.ts:34-37`
   - `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts:100-135`

6. Protected notification user-owned actions fail closed when `req.user.id` is missing and do not call services with `default-user`.
   - `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts:4-12`
   - `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts:17-39`
   - `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts:49-79`
   - `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts:14-83`

7. Notification and subscription provider-status behavior remains explicit and user-independent where intended, without drifting into paid-provider or external-service behavior.
   - `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts:41-47`
   - `backend/src/modules/subscription-billing/subscription-billing.controller.ts:27`

8. Service-level legacy defaults remain internal/test compatibility only in this approved slice: `DEFAULT_USER_ID` stays in unchanged service/repository code, but protected controller paths now require explicit authenticated ids and no longer expose `default-user` fallback through the public controller boundary.

9. The backend-first limitation is documented: frontend subscription UI alignment remains out of scope for this slice.
   - `backend/src/modules/subscription-billing/subscription-billing.md:90-102`
   - `backend/src/modules/subscription-billing/subscription-billing.md:134-141`
   - `backend/src/modules/notifications-delivery/notifications-delivery.md:91-95`

## Validation Reviewed / Run

Direct architect checks:

- read root `AGENTS.md`
- reviewed:
  - `10-requirements/CF-W1-AUTH-01-platform-auth-default-user-fallback-requirement.md`
  - `10-requirements/CF-W1-SUB-01-local-manual-subscription-plan-policy-requirement.md`
  - `06-contracts/CF-W1-AUTH-01-platform-auth-fail-closed-contract.md`
  - `06-contracts/CF-W1-SUB-01-manual-subscription-plan-policy-contract.md`
  - `08-work-packets/CF-W1-AUTH-SUB-01-combined-controller-policy-work-packet.md`
  - `04-qa/CF-W1-AUTH-SUB-01-controller-policy-qa-plan.md`
  - `18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md`
  - `18-integration-queue/CF-W1-AUTH-SUB-01-qa-verification.md`
  - `18-integration-queue/CF-W1-AUTH-SUB-01-code-review.md`
  - `17-team-outboxes/TEAM-04-outbox.md`
  - `17-team-outboxes/TEAM-10-outbox.md`
  - `09-summaries/CF-W1-AUTH-SUB-01-ready-promotion.md`
- ran `git branch --show-current`
- ran `git status --short`
- ran `git diff --stat`
- ran `git diff --name-only`
- ran `git diff --check`
- ran targeted `rg` scan for `default-user|DEFAULT_USER_ID` across affected modules/tests
- reran `Get-Counter '\Memory\% Committed Bytes In Use'` before heavy commands: about `75.17%`
- reran `npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand` from `backend`: passed (`2` suites, `9` tests)
- reran `npm.cmd run build` from `backend`: passed
- reran optional `npm.cmd test -- subscription-billing.routes.test.ts notifications-delivery.routes.test.ts subscription-billing.service.test.ts --runInBand` from `backend`: passed (`3` suites, `7` tests)

Reviewed downstream gate evidence:

- Team 04 QA verification: `PASS`
- Team 10 code review: `ACCEPT`

## Residual Risk

Residual risk is low for this bounded controller-policy slice.

Known non-blocking residual risk:

- `subscription-billing` still carries legacy `default-user` compatibility in unchanged service/repository internals and one older module-doc persistence note. This slice correctly stops that behavior at protected controller boundaries but does not retire the broader compatibility path.
- The frontend billing page may still present self-change affordances until the separate approved UI-alignment slice lands.
- The new controller tests and branch-local integration evidence are still untracked and must be included in the later scoped commit.

## Release-Gate Recommendation

Architect signoff is complete. Team 00 may route this child to delegated Product Owner acceptance.

## Teams Ready To Pick Up New Tasks

- Team 09
- Team 04
- Team 10
- Team 03
