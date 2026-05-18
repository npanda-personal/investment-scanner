# CF-W1-DQ-02 - Data Quality Currentness Evidence Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Data freshness needs to reflect market-session currentness and latest completed EOD evidence, not only a blunt calendar-age rule. If currentness is wrong, every downstream trust surface can overstate freshness or hide stale evidence from traders and research users.

## Evidence

- Audit `11-module-audits/audit-market-data-data-quality.md` found a simple 7-calendar-day stale rule.
- The same audit found Data Quality does not directly consume market-session currentness or durable duplicate/invalid/missing-candle evidence.
- Downstream trusted consumers remain blocked until readiness and currentness evidence are aligned.
- `CF-W1-MD-01` and `CF-W1-MD-02` already cover validation hardening and durable evidence storage, but neither by itself defines the downstream currentness contract.

## Acceptance Criteria

- Data Quality exposes a currentness or stale reason that can be traced to latest completed EOD evidence where available.
- Missing session evidence, blocked evidence, and stale evidence use stable, explainable reason strings.
- Downstream callers can choose fail-closed eligibility instead of inheriting a permissive default.
- Currentness logic does not silently claim freshness from incomplete or provider-gapped evidence.
- Focused tests cover current, stale, missing, blocked, and session-gap scenarios.

## Non-Goals

- No live provider, broker, startup/backfill, or paid/cloud workflow.
- No Prisma schema, route registry, or frontend change in this requirement draft.
- No duplicate scoring logic in downstream consumers.

## Next Gate

Architecture contract and QA plan for a bounded Data Quality currentness slice, with later implementation reserved to Market Data / DQ modules only.
