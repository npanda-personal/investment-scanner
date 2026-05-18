# TEAM-04 QA Factory Outbox

Date: 2026-05-18

Mode: focused QA rerun plus docs-only QA planning.

## 2026-05-18 `CF-W1-L3-PORT-01A` QA Rerun After Team 07 Rework

- Team: `TEAM-04` - QA Factory
- Requirement: `CF-W1-L3-PORT-01A`
- Source worktree: `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-L3-PORT-01A`
- Decision: `PASS`
- Commands run:
  - `Get-Counter '\Memory\% Committed Bytes In Use'` -> `67.20%`
  - `npm.cmd test -- portfolio-management.service.test.ts --runInBand` -> pass (`1` suite, `11` tests)
  - `npm.cmd run build` -> pass
- Scope confirmation:
  - Reviewed Team 07 worktree status shows only approved portfolio-management source/test/doc files changed on the application side.
  - No forbidden source scope changes found in Prisma/migrations, route registries, shared utilities/DTOs, shared UI, package manifests, generated files, Data Quality Engine source/exports, watchlist, alerts, portfolio-intelligence, frontend, providers, startup/backfill, broker/live-provider, paid/cloud, or telemetry paths.
- Key scenario result:
  - Verified the Team 10-required automation-only DQE blocker case is present and meaningful. The portfolio test fixture carries `AUTOMATION_BLOCKED: PHASE0_AUTOMATION_NOT_AUTHORIZED` while daily-review and signal tiers stay `READY`, and assertions prove portfolio display/action readiness remain `READY`.
- Skipped checks:
  - Ownership/routes regression tests skipped because those files were not changed.
  - UI smoke tests skipped because this is backend-only scope.
  - Broad backend suites skipped because the assignment required focused verification only.
- Risks / notes:
  - Team 07 outbox in the implementation worktree still contains older narrative sections from earlier passes; Team 04 used the updated developer handoff plus current file diff as the authoritative rework record.
- Output files updated:
  - `04-qa/CF-W1-L3-PORT-01A-qa-evidence.md`
  - `18-integration-queue/CF-W1-L3-PORT-01A-qa-verification.md`
  - `17-team-outboxes/TEAM-04-qa-factory.md`
- Next gate: `TEAM-10` re-review can proceed.

## Current Heartbeat

- Team: `TEAM-04` - QA Factory
- State: QA Rerun Complete / Awaiting `TEAM-10` Re-review
- Current assignment: reran focused QA for Team 07's `CF-W1-L3-PORT-01A` rework and recorded a pass for the scoped portfolio-management slice
- Latest heartbeat: 2026-05-18 Team 04 verified the Team 10 automation-blocked DQE case, reran the focused portfolio-management test and backend build in the Team 07 worktree, and updated QA evidence for Team 10 re-review
- Input source: runtime bootstrap, standing delegation, ready/blocked queues, Decision Inbox, Team 03 child contracts/work packets
- Output target: `04-qa/`, `18-integration-queue/`, and this outbox
- Branch/worktree: `dev` in `C:\work\repo\investment-scanner`
- Active requirement ids: `CF-W1-NOTIF-02`, `CF-W1-L3-ALERT-01`, `CF-W1-L3-PORT-01A`, `CF-W1-TP-01B`, `CF-W1-MD-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, `CF-W1-AUTH-01`, `CF-W1-SUB-01`
- Files reserved by Team 04 for this pass: `04-qa/CF-W1-L3-PORT-01-qa-plan.md`, `04-qa/CF-W1-L3-PORT-01A-qa-evidence.md`, `04-qa/CF-W1-MD-01-qa-plan.md`, `04-qa/CF-W1-UX-02-qa-plan.md`, `04-qa/CF-W1-UX-05-product-language-status-qa-plan.md`, `04-qa/CF-W1-QA-AUTH-01-platform-auth-subscription-notification-qa-plan.md`, `04-qa/next-validation-plans.md`, this outbox
- Tests/checks run: `Get-Counter '\Memory\% Committed Bytes In Use'` (`67.20%`), `npm.cmd test -- portfolio-management.service.test.ts --runInBand` in Team 07 worktree passed 11 tests, `npm.cmd run build` passed, plus targeted `git status`, `git diff`, and `rg` line-reference checks; no broad suites
- Commit SHA: none
- Decision Packets created: none
- Can continue without human approval: yes, for docs-only QA updates and routing; no, for implementation, commit, or push

## Completed Work

Prepared and refreshed QA plans for:

- `CF-W1-MD-01`: Market Data validation hardening policy and future focused validation.
- `CF-W1-L3-ALERT-01`: alert readiness suppression validation after Lane 3 readiness policy.
- `CF-W1-UX-02`: Copilot trust UX/backend validation after Product/UX/Architect trust contract.
- `CF-W1-L3-DQ-01`, `CF-W1-TP-01A`, and `CF-W1-MD-02`: post-decision child scenario matrix and ADR QA checklist recorded after Team 03 architecture refresh.
- `CF-W1-L3-ALERT-01`: refreshed child QA plan against the alert readiness suppression contract.
- `CF-W1-L3-PORT-01`: prepared portfolio/watchlist readiness DTO child QA plan; this covers the current `CF-W1-L3-PORT-01A` portfolio-only priority.
- `CF-W1-L3-PORT-01A`: reran focused QA after Team 07 rework, confirmed the Team 10 automation-blocked DQE case, and updated `04-qa/CF-W1-L3-PORT-01A-qa-evidence.md` plus `18-integration-queue/CF-W1-L3-PORT-01A-qa-verification.md`. Team 10 re-review is now the next gate.
- `CF-W1-TP-01B`: prepared backend-only Trade Plan compatibility and DQ hard-block child QA plan.
- `CF-W1-NOTIF-02`: prepared focused notification local log redaction QA plan.
- `CF-W1-MD-01`: refreshed Option A validation-hardening QA plan after Product Owner resolution.
- `CF-W1-UX-02`: refreshed Option B Copilot-only trust QA plan after Product Owner resolution.
- `CF-W1-UX-05`: refreshed Option A Copilot-only copy/status QA plan after Product Owner resolution.
- `CF-W1-AUTH-01` and `CF-W1-SUB-01`: refreshed Option A platform auth/subscription assertions in the combined Team 09 QA plan.

Updated `04-qa/next-validation-plans.md` so the resolved-policy items show QA refresh prepared while executable QA remains blocked behind exact reservations and Team 00 Ready promotion.

Latest Team 04 addition: `04-qa/post-decision-child-scenario-matrix-2026-05-17.md` records child QA scenarios for Lane 3 readiness consumers, Trade Plan backend-only no-target/DQ behavior, and the Market Data durable readiness ADR checklist. This is planning evidence only and does not move any item to Ready for Implementation.

Latest child-plan addition: `04-qa/CF-W1-L3-PORT-01-qa-plan.md` and `04-qa/CF-W1-TP-01B-qa-plan.md` are new planning artifacts; `04-qa/CF-W1-L3-ALERT-01-qa-plan.md` is refreshed. None of these approves implementation or executable QA.

Latest notification-plan addition: `04-qa/CF-W1-NOTIF-02-qa-plan.md` records focused provider redaction scenarios for the prepared notification contract/work packet. It does not approve source/test execution.

Latest policy-resolution refresh: Product Owner resolved the five remaining Decision Inbox items on 2026-05-18. Team 04 reflected those outcomes in QA planning for `CF-W1-MD-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, `CF-W1-AUTH-01`, and `CF-W1-SUB-01`. This does not approve implementation or executable QA.

Latest Ready promotion note: Team 00 promoted `CF-W1-L3-PORT-01A` to Ready for Team 07 implementation in `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`; Team 07 implementation output is present, Team 04 initial focused QA passed, and Team 10 requires a Team 07 revision before release acceptance.

Latest QA evidence: Team 04 found Team 07's developer handoff in `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-L3-PORT-01A`, passed the focused backend test command, and recorded QA evidence in `04-qa/CF-W1-L3-PORT-01A-qa-evidence.md`. Team 10's review supersedes release acceptance until Team 07 revises and Team 04 reruns QA.

Setup authorization interpretation: standing branch/worktree/commit/push authorization does not approve QA execution, app-code readiness, tests, builds, services, providers, Prisma commands, UI smoke, Angel One, startup/backfill, live services, or Ready queue movement.

No application source, tests, Prisma, route registries, shared utilities/UI, packages, generated files, root `AGENTS.md`, `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**` were modified.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-ALERT-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-UX-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-DQ-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/post-decision-child-scenario-matrix-2026-05-17.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-PORT-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-PORT-01A-qa-evidence.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-NOTIF-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-UX-05-product-language-status-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-QA-AUTH-01-platform-auth-subscription-notification-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-qa-verification.md`

## Files Inspected

Content inspected:

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-DQ-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/post-decision-child-scenario-matrix-2026-05-17.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/standing-worktree-push-authorization-summary.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/daemon-cycle-latest.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/daemon-resume-prompt.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/continuous-daemon-iteration-4-architecture-summary.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory-daemon-2026-05-17-iteration-4.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX-02-copilot-trust-ux-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-platform-auth-default-user-fallback-policy-resolution.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-local-manual-subscription-plan-change-policy-resolution.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-copilot-trust-ux-policy-resolution.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-ux-product-language-status-policy-resolution.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-market-data-validation-hardening-policy-resolution.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-01A-trade-plan-no-target-dq-hard-block-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-ALERT-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-ALERT-01-alert-readiness-suppression-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-01B-backend-compatibility-dq-hard-block-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-NOTIF-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-NOTIF-02-notification-log-redaction-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-NOTIF-02-notification-log-redaction-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-ALERT-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-PORT-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-NOTIF-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-QA-AUTH-01-platform-auth-subscription-notification-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-portfolio-watchlist-alerts.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-ux-research-copilot.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/README.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory-2026-05-17.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-ux-research-copilot-2026-05-17.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.controller.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.types.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`
- `frontend/src/features/ai-investment-copilot/api/aiInvestmentCopilotService.ts`
- `frontend/src/features/ai-investment-copilot/hooks/useAiInvestmentCopilot.ts`
- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`
- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.service.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`

Directory/file lists inspected:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/tests/modules/market-data-foundation/market-data-readiness-evidence.invariants.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.validation.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.routes.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.validation.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.routes.test.ts`
- `frontend/tests/ui/market-data-foundation.spec.ts`
- `frontend/tests/ui/research-hub.spec.ts`
- `frontend/tests/ui/support/moduleAssertions.ts`
- `frontend/tests/ui/support/auth.ts`

## Validation

Commands run for validation: targeted docs-only `git diff --check`, `git status --short -- <Team 04 paths>`, and `rg` line-reference checks. No executable tests were run.

Tests, builds, services, providers, startup/backfill, Prisma commands, UI checks, Playwright, staging, commits, and pushes were not run.

`git diff --check` returned no whitespace errors. Git emitted standard CRLF conversion warnings for edited Markdown files.

The plans include focused future command guidance only. Each command remains blocked until the relevant policy, contract, implementation handoff, and resource approval gates exist.

## Unsafe Or Broad Commands Identified

Excluded by default:

- broad `npm.cmd test` commands without file filters,
- Playwright or UI smoke tests before UI scope, exact focused spec, local startup plan, Team 00 validation approval, and memory/resource check,
- backend/frontend builds before implementation and resource approval,
- dev servers, live services, provider services, startup flows, schedulers, repair/sync/import/backfill jobs,
- Prisma generate, migrate, db push, db execute, or any schema/data mutation,
- Angel One, live provider, paid/cloud, external AI, telemetry, broker, or real-money flows.

## Blockers

- `CF-W1-MD-01`: Option A QA refresh is prepared; executable validation is blocked until validation-only file reservations and Team 00 implementation handoff.
- `CF-W1-L3-ALERT-01`: blocked by `CF-W1-L3-DQ-01`, alert readiness contract, and implementation handoff.
- `CF-W1-UX-02`: Option B QA refresh is prepared; executable validation is blocked until Copilot-only trust-field contract refresh, exact file reservations, and Team 00 implementation handoff.
- `CF-W1-UX-02` UI smoke is also blocked because `frontend/tests/ui/ai-investment-copilot.spec.ts` and `frontend/tests/ui/stock-research-workbench.spec.ts` do not currently exist.
- `CF-W1-L3-DQ-01`: child scenario matrix is now recorded; QA execution is blocked until module-specific child contracts, exact file reservations, and implementation handoffs.
- `CF-W1-TP-01A`: backend-only scenario matrix is now recorded; QA execution is blocked until accepted backend-only child packet, exact source/test reservations, and implementation handoff.
- `CF-W1-MD-02`: ADR QA checklist is now recorded; schema/source/test execution remains blocked until a formal storage/natural-key ADR and separate implementation slice approval.
- `CF-W1-L3-ALERT-01`: child QA plan is refreshed; executable QA is blocked until Team 00 Ready promotion and implementation handoff.
- `CF-W1-L3-PORT-01A`: initial focused QA passed, but release acceptance is blocked by Team 10's code-review finding; next gates are Team 07 revision, Team 04 QA rerun, and Team 10 re-review.
- `CF-W1-TP-01B`: child QA plan is prepared; executable QA is blocked until Team 00 Ready promotion and backend-only implementation handoff.
- `CF-W1-NOTIF-02`: focused QA plan is prepared; executable QA is blocked until Team 00/Team 09 Ready promotion and implementation handoff.
- `CF-W1-UX-05`: Option A QA refresh is prepared; executable validation is blocked until Copilot-only child sequencing with `CF-W1-UX-02`, exact copy/test reservations, and Team 00 implementation handoff.
- `CF-W1-AUTH-01`: Option A QA refresh is prepared; executable validation is blocked until exact controller/test reservations and Team 00 implementation handoff.
- `CF-W1-SUB-01`: Option A QA refresh is prepared; executable validation is blocked until exact backend reservations, frontend limitation handling, and Team 00 implementation handoff.
- Scoped commit/push is not attempted because the shared worktree contains many unrelated active docs changes from other teams.

## Next Recommendations

1. Team 07 should revise `CF-W1-L3-PORT-01A` inside the current reservation to address Team 10's readiness-mapping finding.
2. Team 04 should rerun `npm.cmd test -- portfolio-management.service.test.ts --runInBand` after that revision and update QA evidence.
3. Team 10 should re-review after Team 04 rerun.
4. Team 00 may consider Ready promotion for the next bounded slice after reconciling dirty docs state and copying exact reservations: `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, or `CF-W1-L3-ALERT-01`.
5. Team 03 and module teams should refresh source-changing packets for `CF-W1-MD-01`, `CF-W1-UX-02`, `CF-W1-UX-05`, `CF-W1-AUTH-01`, and `CF-W1-SUB-01` using the resolved policies and Team 04 QA criteria.
6. Keep `CF-W1-L3-INTEL-01` queued behind accepted `CF-W1-L3-PORT-01A`.
7. Keep `CF-W1-MD-02` source/schema/test work blocked until a formal ADR is accepted.
