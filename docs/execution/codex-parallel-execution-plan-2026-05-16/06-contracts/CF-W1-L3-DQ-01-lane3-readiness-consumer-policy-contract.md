# CF-W1-L3-DQ-01 Lane 3 Readiness Consumer Policy Contract

Date: 2026-05-17

## Status

Contract draft prepared. Implementation remains blocked.

Product Owner and Architect acceptance are required because the unresolved policy is whether Lane 3 passive displays may show limited data while action-like workflows remain blocked.

## Contract Intent

Lane 3 modules must consume Data Quality Engine public readiness outputs instead of duplicating readiness logic or treating market/signal data as trusted just because price or signal fields are present.

This contract covers the policy surface for:

- portfolio summaries and holdings context,
- watchlist enrichment,
- alerts monitoring,
- portfolio intelligence,
- research or copilot trust surfaces that consume Lane 3 context.

## Proposed Conservative Policy

This policy is proposed for Product Owner and Architect acceptance. It is not approved for source implementation yet.

| Consumer behavior | `READY` | `LIMITED` | `NOT_READY`, `BLOCKED`, missing DQ, stale hard blocker |
| --- | --- | --- | --- |
| Passive display of current price, latest signal, or context | Allowed with DQ status shown | Allowed only with visible warning/status and no action-like language | Block trusted display or show domain empty/warning state |
| Portfolio/watchlist review context | Allowed | Allowed as limited review context if reasons/blockers are shown | Block reliability claims and downstream trusted use |
| Alerts or action-like event creation | Allowed only when required use-case tier is ready | Block unless Product Owner explicitly accepts limited alert behavior | Block |
| Portfolio intelligence scoring, risk labels, or action suggestions | Allowed only with DQ evidence | Degrade to limited/untrusted status, no action wording | Block or return not-enough-trusted-data state |
| Copilot/research summary trust claims | Allowed with sources | Must disclose limitations and avoid recommendations | Block trusted summary or return data-gap summary |

## Required Data Source

Lane 3 consumers must use public Data Quality Engine outputs such as:

- latest instrument evaluation,
- batch evaluation lookup,
- use-case tier status where present,
- readiness reasons and blockers,
- coverage, signal-readiness, and liquidity statuses.

Consumers must not reimplement DQ scoring, stale-data policy, liquidity scoring, or readiness thresholds.

## Implementation Blockers

Source work is blocked until the Product Owner and Architect choose and accept:

- whether `LIMITED` data can appear in passive portfolio/watchlist displays,
- whether any alert can be created from `LIMITED` data,
- which use-case tier maps to portfolio/watchlist display versus alert/action workflows,
- whether missing DQ should render empty state, warning state, or block state per module,
- how much DQ evidence must be added to DTOs before frontend work.

## Future Slice Guidance

After policy acceptance, do not implement all Lane 3 consumers in one broad pass.

Use child work items with one module owner per implementation pass:

- portfolio/watchlist readiness DTO slice,
- alerts readiness suppression slice,
- portfolio intelligence reliability gate,
- copilot/research trust surface slice,
- frontend display slice only after UX acceptance.

## Forbidden Behavior

- Do not duplicate Data Quality Engine scoring logic in Lane 3 modules.
- Do not create alert events from missing or blocked DQ.
- Do not use direct financial advice language.
- Do not change Data Quality Engine public contract without Architect approval.
- Do not edit Prisma, route registries, shared UI, package files, generated types, providers, scheduler/startup behavior, or live-provider flows in this parent policy slice.

## Decision Packet Note

A Decision Packet is needed later if Product Owner acceptance is required for `LIMITED` passive display versus blocked action behavior. It was not created in this pass because this task is documentation-only contract preparation and no implementation gate is being opened now.

