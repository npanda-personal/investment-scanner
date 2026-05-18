# CF-W1-L3-ALERT-03 - Alert Follow-Through Traceability Requirement

Status: Requirement draft prepared. Not Ready for Implementation. This is a docs-only discovery item for the active alert-trigger monitoring workflow and does not move anything to Ready.

## Problem

Alerts Monitoring currently creates inbox events and supports read/dismiss actions, but it does not persist a durable follow-through outcome for what the user decided after reviewing a trigger. That leaves the trigger-monitor workflow with no explicit review journal, no outcome traceability, and no bounded way to tell whether an alert was reviewed, deferred, acted on, or intentionally ignored.

## User Value

Investors and traders need to know what happened after an alert fired:

- Was it reviewed promptly?
- Was it actionable or just informational noise?
- Was it deferred for later follow-up?
- Did the event lead to a portfolio/watchlist change, risk review, or invalidation follow-up?

Without a durable follow-through state, the alert inbox is useful for notification but weak for review workflow memory.

## Bounded Requirement

Define a bounded alert follow-through contract that records the post-trigger review outcome for an alert event using the existing `alerts-monitoring` module surface.

The first child slice should focus on:

- a small, explicit follow-through outcome taxonomy;
- a concise reason summary or review note;
- timestamps for review/follow-up state transitions;
- no overclaiming of action taken when the user only dismissed or read the event;
- clear distinction between alert creation, alert inbox state, and post-review follow-through outcome.

## Evidence Consumed

- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-portfolio-watchlist-alerts.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/risk-register.md`

## What This Is Not

- Not a new alert scheduler.
- Not a push/email delivery feature.
- Not a schema-wide alert history rewrite.
- Not a new shared UI system.
- Not Ready for Implementation.

## Allowed Future Scope

After Team 00/03 reservation and contract prep, the future child slice may use:

- `backend/src/modules/alerts-monitoring/**`
- `backend/tests/modules/alerts-monitoring/**`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`

Frontend follow-up is optional and should not be assumed in the first contract unless UX later requires it.

## Priority Position

This requirement is ranked behind `CF-W1-L3-TREV-01` and `CF-W1-BT-02`, and ahead of the calibration/context traceability items because it closes a live investor/trader review loop rather than only improving derived diagnostics.

## Next Gate

Team 00/03 reservation and an architecture/QA prep packet are required before any implementation handoff.
