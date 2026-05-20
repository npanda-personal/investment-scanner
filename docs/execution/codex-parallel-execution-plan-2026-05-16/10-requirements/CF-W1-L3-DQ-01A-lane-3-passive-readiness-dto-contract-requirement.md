# CF-W1-L3-DQ-01A - Lane 3 Passive Readiness DTO Contract Requirement

Date: 2026-05-20

## Status

Audit-derived future child requirement. Not Ready for Implementation.

## Product Value

Lane 3 passive surfaces should show readiness truthfully without implying that a saved item, holding, or watch entry is trusted for action. After accepted `CF-W1-L3-PORT-01B` and active `CF-W1-L3-WATCH-01`, the next tight trust gap is the passive display contract: users still need to see DQ state, blockers, and limited context without receiving reliability or action-like language.

This child keeps portfolio and watchlist display honest while preserving backward-compatible response fields. It is narrower than the full Lane 3 policy parent because it only covers passive display and reason surfaces, not alerts or portfolio-intelligence trust labels.

## Evidence

- Parent policy `CF-W1-L3-DQ-01` already resolved Option B for passive `LIMITED` display with action-like blocking.
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/post-decision-source-readiness-audit-2026-05-17.md` names `CF-W1-L3-DQ-01A` as the portfolio/watchlist passive readiness DTO child.
- `backend/src/modules/portfolio-management/portfolio-management.service.ts` and `backend/src/modules/watchlist-management/watchlist-management.service.ts` still expose display data without an explicit passive readiness contract in the source-backed audit.
- Accepted `CF-W1-L3-PORT-01B` gives the watchlist readiness baseline, but the passive display contract still needs its own bounded child so readiness and actionability do not blur together.

## Bounded Requirement

Define a passive readiness DTO contract for portfolio and watchlist display surfaces that exposes DQ status, blocker reasons, and limited context while preventing reliability or action-like language from implying trust.

The first child slice should focus on:

- `READY`, `LIMITED`, `NOT_READY`, `UNUSABLE`, stale, blocked, unsupported, and scope-mismatched state mapping for passive display;
- visible DQ status, blocker reasons, and latest trusted data date where available;
- explicit passive-only handling for `LIMITED` data;
- no duplicate DQ scoring logic;
- no alerts, portfolio-intelligence, or recommendation behavior.

## Acceptance Criteria

- Portfolio and watchlist DTOs expose readiness status and blocker reasons in a passive display shape.
- `LIMITED` can appear only as visible passive context, not as trusted actionability.
- Missing, stale, blocked, unsupported, or scope-mismatched DQ states do not read as reliable output.
- Existing response fields remain backward-compatible.
- Focused tests cover ready, limited, missing, blocked, and stale display cases.

## Non-Goals

- No Prisma schema, route registry, shared utility, shared UI, frontend, package, provider, or generated-file change.
- No DQE scoring duplication.
- No alert readiness suppression in this child.
- No portfolio-intelligence reliability labels in this child.
- No direct financial advice wording.

## Future Candidate Files After Ready Promotion

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`
- `backend/src/modules/watchlist-management/watchlist-management.service.ts`
- `backend/src/modules/watchlist-management/watchlist-management.types.ts`
- `backend/src/modules/watchlist-management/watchlist-management.md`
- `backend/tests/modules/watchlist-management/watchlist-management.service.test.ts`

## Next Gate

Product refinement and an architecture contract for the passive portfolio/watchlist readiness DTO child, then QA planning and Team 00 routing after the parent policy remains honored.
