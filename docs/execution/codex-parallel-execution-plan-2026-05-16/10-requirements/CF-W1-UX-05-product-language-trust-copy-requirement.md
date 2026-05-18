# CF-W1-UX-05 - Product Language And Trust Copy Requirement

Date: 2026-05-17

Owner: Team 08 UX / Research / Copilot

Status: Policy resolved; first child is Copilot-only. Not Ready for Implementation. This is sequenced behind `CF-W1-UX-02` and should not be treated as an independent Ready-promotion candidate.

## Product Value

User-facing language and status colors must support research review without implying direct financial advice, black-box recommendations, or unsupported market scope readiness.

## Current Evidence

Inputs:

- `11-module-audits/CF-W1-UX-05-product-language-status-audit.md`
- `11-module-audits/audit-ux-research-copilot.md`
- `06-contracts/CF-W1-UX-02-copilot-trust-ux-contract.md`
- `07-decisions/DECISION-20260517-ux-product-language-status-policy-resolution.md`
- Current Team 00 routing keeps this behind `CF-W1-UX-02` and the other current front-runners.

Observed risks:

- Shared status colors treat investment labels such as `BULLISH`, `HIGH`, and `ACCUMULATION` as success.
- Copilot copy includes `AI Investment Copilot`, `Generate Report`, `Bullish Factors`, `appears strong`, and `high-scoring names`.
- Research Hub has stronger trust gating, but future copy needs a policy for action-like labels.
- Market Data UI exposes unsupported future asset classes without a clear policy.

## User Goal

Review evidence, triggers, readiness, and limitations without mistaking the application for a direct advice or trade-instruction system.

## Proposed Acceptance Criteria

Future implementation must:

- Replace advisory-feeling labels with research-support language in approved scope.
- Preserve domain meaning for bullish/bearish trigger data while avoiding recommendation-like section labels.
- Avoid treating `BULLISH`, `HIGH`, or `ACCUMULATION` as universal success states outside context.
- Show unsupported asset classes as unavailable/limited if they remain visible.
- Keep copy compatible with root `AGENTS.md` product-language constraints.
- Add focused tests or copy assertions for the changed surface.
- Avoid shared UI, route, navigation, package, provider, Prisma, or generated-file changes unless separately reserved.

## Non-Goals

- No code changes in this requirement refinement pass.
- No shared `StatusBadge` change without a specific shared-file reservation.
- No route or navigation rename without approval.
- No new providers, AI services, telemetry, broker integration, or paid/cloud dependency.
- No strategy/rule semantics changes.

## Approved First Split

`CF-W1-UX-05A`: Copilot module-local copy changes after or together with the Copilot-only `CF-W1-UX-02` trust UX slice.

Future split candidates:

- `CF-W1-UX-05B`: Research Hub copy review after Copilot trust policy settles.
- `CF-W1-UX-05C`: Market Data unsupported asset visibility policy and copy.
- `CF-W1-UX-05D`: Shared `StatusBadge` color/label semantics, requiring shared UI reservation.

Not approved in the first child:

- shared `StatusBadge` changes;
- Research Hub changes;
- Market Data unsupported asset UI changes;
- shared UI, route, navigation, package, provider, Prisma, or generated-file changes.

## Stop Conditions

- Shared UI, route, navigation, or package changes become necessary without reservation.
- Copy change would alter strategy, trigger, exit, invalidation, or DQ semantics.
- Tests would only check page load instead of copy/trust behavior.

## Next Gate

Prepare a Copilot-only `CF-W1-UX-05A` child packet sequenced after or together with `CF-W1-UX-02`; Team 00 must promote an exact handoff before implementation.
