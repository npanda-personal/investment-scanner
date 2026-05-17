# CF-W1-UX-05 - Product Language And Trust Copy Requirement

Date: 2026-05-17

Owner: Team 08 UX / Research / Copilot

Status: Requirement draft. Not Ready for Implementation.

## Product Value

User-facing language and status colors must support research review without implying direct financial advice, black-box recommendations, or unsupported market scope readiness.

## Current Evidence

Inputs:

- `11-module-audits/CF-W1-UX-05-product-language-status-audit.md`
- `11-module-audits/audit-ux-research-copilot.md`
- `06-contracts/CF-W1-UX-02-copilot-trust-ux-contract.md`

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

## Proposed Split

`CF-W1-UX-05A`: Copilot module-local copy changes after `CF-W1-UX-02` policy resolves.

`CF-W1-UX-05B`: Research Hub copy review after Copilot trust policy settles.

`CF-W1-UX-05C`: Market Data unsupported asset visibility policy and copy.

`CF-W1-UX-05D`: Shared `StatusBadge` color/label semantics, requiring shared UI reservation.

## Stop Conditions

- Product/UX policy does not define first target surface.
- Shared UI, route, navigation, or package changes become necessary without reservation.
- Copy change would alter strategy, trigger, exit, invalidation, or DQ semantics.
- Tests would only check page load instead of copy/trust behavior.

## Next Gate

Resolve `DECISION-20260517-ux-product-language-status-policy`, then prepare the selected child packet.
