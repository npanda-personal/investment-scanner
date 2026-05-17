# CF-W1-L3-AUTH-02 - Alert Event Ownership Requirement

Date: 2026-05-17

## Status

Completed bounded slice. Not active for implementation.

Product Owner approved the parent-rule ownership model, and the bounded backend slice was implemented, validated, reviewed, accepted under standing delegation, and committed locally as `503bcd9`. Direct `AlertEvent.userId` ownership, Prisma schema/migration work, notification/copilot digest consumers, and broader alert ownership changes remain future split work and require separate approval.

## Product Value

Alert inboxes, alert event actions, alert summaries, and alert-derived digests must not expose one user's events to another user. Alert Monitoring can only be trusted as a user workflow when every alert event has a provable owner and every read, dismiss, mark-read, mark-all, summary, notification, and copilot-digest path is scoped to that owner.

## Current Evidence

Latest inputs:

- `11-module-audits/audit-portfolio-watchlist-alerts.md`
- `11-module-audits/audit-platform-auth-subscription-notifications.md`
- `11-module-audits/daemon-cycle-readiness-audit-2026-05-17.md`
- `17-team-outboxes/TEAM-07-portfolio-watchlist-alerts-2026-05-17.md`
- `17-team-outboxes/TEAM-07-portfolio-watchlist-alerts-daemon-2026-05-17-iteration-2.md`
- `17-team-outboxes/TEAM-09-platform-auth-subscription-notifications-2026-05-17.md`

Historical observed gaps before the completed bounded slice:

- `AlertRule` has a user owner, but current evidence says `AlertEvent` has no direct `userId`.
- Alert event list/read/dismiss/mark-all paths are reported as global.
- Notification and copilot alert digests can consume global alert events.
- Alert evaluation can call portfolio/watchlist lookups without preserving the alert rule owner, which creates `default-user` fallback risk.
- Filtering event ownership through `AlertRule` may avoid schema work but requires a clear orphan-event/system-event policy.
- Direct `AlertEvent.userId` ownership may require Prisma schema and migration approval.

## Resolved Product / Architect Decision

Resolution: `07-decisions/DECISION-20260517-alert-event-ownership-model-resolution.md`

Accepted model for the first bounded backend slice:

- Rule-owner ownership: scope alert events through the owning `AlertRule.userId` and hide or block events that cannot resolve to an owned rule.

Rejected or deferred for this slice:

- Direct event ownership: store an owner on every alert event. This may require `backend/prisma/schema.prisma`, migrations, generated types, backfill/legacy handling, and rollback approval.
- Hybrid ownership: store owners on new events while preserving a documented compatibility path for legacy events through owned rules.
- Explicit deferral: keep alert event inbox/digest implementation blocked until schema and legacy ownership policy can be resolved.

Future direct owner, hybrid, digest, or schema-backed ownership work must define how orphan events, system-generated events, deleted alert rules, legacy `userId = null` data, and rule references to portfolio/watchlist resources are handled without leaking another user's data.

## Exact Dependencies

- Completed slice dependencies were satisfied for parent-rule ownership of alert event list/read/dismiss/mark-all behavior.
- Future notification digest, copilot digest, direct event owner, Prisma schema, migration, or hybrid ownership work must be split into a new requirement or follow-up packet.
- Any future work must reserve exact files and serialize with `alerts-monitoring`, notification digest, copilot digest, Prisma, auth, and shared-file work.

Non-dependencies:

- This requirement does not resolve Lane 3 Data Quality readiness policy; that belongs to `CF-W1-L3-DQ-01` and future alert readiness suppression work.
- This requirement does not resolve portfolio/watchlist child-resource ownership; that belongs to `CF-W1-L3-AUTH-01`.
- This requirement does not resolve platform-wide `default-user` fallback policy; that belongs to a separate auth requirement.
- This requirement does not resolve notification log redaction, subscription policy, or copilot trust UX.

## Candidate Acceptance Criteria

Future accepted implementation must satisfy all approved contract details, including:

- Every alert event returned to a user has a provable owner under the accepted ownership model.
- Event list, event detail, mark-read, dismiss, and mark-all actions are scoped to the current authenticated user.
- Cross-user event access fails closed without revealing that another user's event exists.
- Alert summaries count only the current user's events.
- Notification and copilot alert digests consume only events owned by the digest recipient.
- Alert evaluation preserves the alert rule owner through portfolio and watchlist lookups.
- Alert rules that reference portfolio or watchlist resources validate that those resources belong to the rule owner before event creation.
- Events with missing, orphaned, deleted-rule, or ambiguous ownership are hidden, blocked, or explicitly handled by the accepted contract.
- Legacy `userId = null` compatibility is not broadened into a cross-user event access path.
- Route paths and public response shapes remain backward compatible unless a separate route/API contract is approved.
- No broker integration, paid provider, external telemetry, cloud service, or real-money execution behavior is introduced.
- Module docs are updated if alert ownership behavior changes.
- QA, code review, Architect signoff, and Product Owner acceptance are recorded before release.

## Current Allowed Files

For this documentation-only requirement pass:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-AUTH-02-alert-event-ownership-requirement.md`

## Future Allowed Files For Follow-Up Scope After Approval

Likely documentation-only next files after Orchestrator assignment:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/**`

Possible future implementation files only after accepted decision, contract, QA plan, work packet, and ready-queue promotion:

- `backend/src/modules/alerts-monitoring/**`
- `backend/tests/modules/alerts-monitoring/**`
- notification or copilot digest consumer files only if explicitly reserved by Orchestrator
- `backend/prisma/schema.prisma` and migrations only if direct event ownership is approved

These are not current source reservations.

## Forbidden Without Separate Approval

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/types
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/auth-identity/**`
- portfolio/watchlist source beyond an accepted alert-owner lookup contract
- notification or copilot digest consumers without explicit reservation
- shared backend utilities, shared frontend components, package manifests, providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry files
- root `AGENTS.md`, `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**`

## Shared-File Risk

Risk: High.

The accepted model could affect Prisma schema, generated types, Alerts Monitoring contracts, notification digests, copilot summaries, auth ownership boundaries, and Lane 3 alert semantics. This work must remain decision-first and single-writer controlled.

## Stop Conditions

- Future work changes ownership beyond the accepted parent-rule ownership slice without a new decision or follow-up packet.
- Implementation requires Prisma schema, migration, generated type, auth middleware, route registry, shared utility, digest consumer, package, provider, or frontend changes without explicit approval.
- The proposed contract cannot explain orphan events, deleted-rule events, legacy events, or rule references to user-owned portfolio/watchlist resources.
- Alert evaluation continues to use global rules or `default-user` fallback for owner-sensitive lookups.
- Cross-user tests cannot prove fail-closed behavior for list/read/dismiss/mark-all/summary/digest paths.
- The requirement expands into Data Quality alert suppression, notification redaction, subscription policy, or copilot UX before those separate contracts are accepted.

## Next Gate

No current gate. The bounded parent-rule ownership slice is complete and must not be pulled again as active implementation work. Future direct event owner, digest consumer, schema, or broader alert ownership behavior needs a separate requirement, contract, QA plan, exact file reservation, and Ready queue promotion.
