# Team 00 Trusted Signal Candidate Goal Summary

Date: 2026-05-24

## Goal

Move the product direction away from Trade Plan, R:R, arbitrary targets, synthetic profit targets, and target-price framing, and toward a Trusted Signal Candidate workflow anchored on `/today-review`.

## Completed Previous-Engagement Cleanup

- `CF-W1-STRAT-04` completed QA, Team 10 review, Architect Signoff, delegated PO acceptance, and scoped local implementation-branch commit `8b3498e feat: add strategy evidence freshness labels`.
- `CF-W1-SQLAB-03` completed QA, Team 10 review, Architect Signoff, delegated PO acceptance, and scoped local implementation-branch commit `5db98f2 feat: add signal quality review actions`.
- Neither accepted branch has been pushed or integrated into `dev`.

## Product Direction Applied

- `CF-W1-TP-03` is paused/stale as currently framed.
- `CF-W1-TSC-01` is the active Trusted Signal Candidate workflow path.
- `/today-review` remains the preferred first surface.
- Candidate groups are `Highly Trusted`, `Trusted but Needs Review`, `Watch Only`, and `Blocked`.
- Health states are `Active`, `Healthy`, `Weakening`, `Risk Warning`, `Exit Triggered`, `Invalidated`, `Expired`, and `Blocked`.
- No TSC output may use R:R, arbitrary targets, synthetic profit targets, direct buy/sell advice, or Trade Plan-first wording.

## Current Blocker

`CF-W1-TSC-01A` is not Ready.

Read-only source mapping found that current Today Review does not source-prove rule-triggered entry price, trigger timestamp, or rule provenance. Current Signal Trigger contracts still mark `trigger_price` unavailable.

Because the Product Owner requires trusted candidates to show entry price, Team 00 must not promote TSC implementation until upstream trigger evidence exists or a separate Product Owner/Architect decision accepts a zero-highly-trusted first slice.

## Next Routing

- `CF-W1-SIG-TRIGGER-ENTRY-01` was created as the upstream requirement child.
- Team 02 should refine the requirement and acceptance criteria.
- Team 03 should prepare architecture and exact file-reservation readiness.
- Team 04 should prepare QA planning and reject conditions.
- Team 06 remains standby for implementation only after Team 00 Ready promotion.

Product Owner action required: no.
