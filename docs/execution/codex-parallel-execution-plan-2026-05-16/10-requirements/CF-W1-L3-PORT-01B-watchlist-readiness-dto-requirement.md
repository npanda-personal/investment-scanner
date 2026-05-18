# CF-W1-L3-PORT-01B - Watchlist Readiness DTO Requirement

Date: 2026-05-18

## Status

Audit-derived future child requirement. Not Ready for Implementation.

## Product Value

Watchlist users need the same trust clarity that portfolio users get: a saved item should not look reliable just because it has a current price, a latest signal, or daily movement. Watchlists are a high-frequency investor workflow, so readiness and blocker evidence should be visible without implying that a watch item is trusted for action.

## Evidence

- Parent requirement `CF-W1-L3-PORT-01` already splits the portfolio/watchlist DTO work and keeps watchlist as future `CF-W1-L3-PORT-01B`.
- Audit `11-module-audits/audit-portfolio-watchlist-alerts.md` found watchlist enrichment returns current price, daily move, and latest signal without readiness status or blockers.
- Audit `11-module-audits/current-assignment-readiness-drift-audit-2026-05-18.md` notes `watchlist-management.service.ts` and `watchlist-management.types.ts` still expose watchlist data without readiness evidence.
- Watchlist item mutations still need explicit user ownership protection from the broader Lane 3 auth work.

## Acceptance Criteria

- Watchlist DTOs expose Data Quality readiness evidence from approved public DQE outputs.
- Current price, daily move, and latest signal do not imply trusted readiness without explicit readiness fields.
- Missing, `LIMITED`, `NOT_READY`, stale, blocked, unsupported, or scope-mismatched DQ states are surfaced as blocker or limited context, not trusted readiness.
- Existing watchlist response fields remain backward-compatible.
- Focused tests cover ready, limited, missing, blocked, and stale cases for watchlist rows.

## Non-Goals

- No Prisma, route registry, frontend, provider, package, or generated-file change.
- No DQE scoring logic duplication.
- No portfolio-only changes in this child.
- No direct financial advice or recommendation wording.

## Next Gate

Product refinement and an architecture contract for the watchlist-only child, then QA planning and Team 00 Ready evaluation after the parent split is honored.
