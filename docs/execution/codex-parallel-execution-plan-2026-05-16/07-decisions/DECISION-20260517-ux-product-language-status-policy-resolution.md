# DECISION-20260517 UX Product Language Status Policy Resolution

Date: 2026-05-18

Status: Resolved by Product Owner

Decision Inbox source: `99-decision-inbox/DECISION-20260517-ux-product-language-status-policy.md`

## Approved Option

Option A: start with Copilot-only copy cleanup after or together with the Copilot trust UX slice.

## Approved Policy

- Start with Copilot-only copy cleanup after or together with the Copilot trust UX slice.
- Do not modify shared `StatusBadge` yet.
- Do not reserve shared UI files yet.
- Do not modify Research Hub or Market Data unsupported asset surfaces in this first slice.
- Product-language cleanup should avoid advisory or recommendation-quality language.

Preferred language:

- research support;
- trust state;
- blocked;
- limited;
- not ready;
- data quality missing;
- manual review required;
- evidence;
- reason summary.

Avoid:

- buy;
- sell;
- must act;
- guaranteed;
- profit target;
- target achieved;
- recommendation quality;
- advice-like wording.

Shared status-color mapping remains a future shared-UI reservation decision.

## Not Approved

This decision does not approve:

- shared `StatusBadge` or other shared UI changes;
- route or navigation changes;
- Research Hub changes;
- Market Data unsupported asset UI changes;
- package, provider, Prisma, generated-file, or broad frontend changes.

## Queue Impact

The Decision Inbox blocker for `CF-W1-UX-05` is resolved.

`CF-W1-UX-05` is not automatically Ready for Implementation. The approved first child should be Copilot-only and sequenced after or together with `CF-W1-UX-02`; Team 08, Team 03, and Team 04 must refresh exact copy/test reservations before implementation.

## Product Owner Action

No further Product Owner action is required for this Decision Inbox item.

