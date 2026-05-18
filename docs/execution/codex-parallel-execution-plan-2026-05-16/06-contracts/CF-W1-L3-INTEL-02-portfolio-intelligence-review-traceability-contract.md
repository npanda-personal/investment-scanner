# CF-W1-L3-INTEL-02 Portfolio Intelligence Review Traceability Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Portfolio Intelligence review-traceability contract prepared. Not Ready for Implementation.

Upstream prerequisite: accepted `CF-W1-L3-PORT-01A`.

## Contract Intent

Portfolio Intelligence is a review surface. It must explain whether a review-oriented label is reliable, limited, diagnostic-only, or blocked, and it must trace the evidence behind that state.

## Required Upstream Contract

This child consumes accepted portfolio readiness metadata from Portfolio Management only:

- `PortfolioSummaryDto.readinessSummary`
- `HoldingValuationDto.readiness`

It must not depend on watchlist readiness DTOs.

## Required Traceability Behavior

- Review output distinguishes `RELIABLE`, `LIMITED`, `DIAGNOSTIC`, and `BLOCKED`.
- Review ranking, red flags, grouped summaries, and action-like labels must not imply trust when readiness is not trusted.
- Traceability should identify source modules, blocker reasons, and latest trusted data date where available from upstream readiness evidence.
- Existing public response fields remain present for backward compatibility.

## Traceability Semantics

- `RELIABLE`: accepted portfolio readiness permits trusted review output.
- `LIMITED`: review output is visible, but trust is limited and action-like interpretation is blocked.
- `DIAGNOSTIC`: the system is surfacing heuristic review context only; it is not reliable enough for trusted review ranking.
- `BLOCKED`: missing or blocked readiness evidence prevents trusted review interpretation.

## Boundaries

In scope:

- `portfolio-intelligence` service/types/docs/tests

Out of scope:

- Portfolio Management source changes
- DQE source/export changes
- watchlist readiness
- Prisma/schema/migrations
- route changes
- shared utilities/UI
- frontend work

## Conflict Rule

This child shares the same `portfolio-intelligence` file set as `CF-W1-L3-INTEL-01`. Team 00 must combine or sequence the two packets. They cannot be separate concurrent writers.

## Test Contract

Focused backend tests must prove:

- reliable review traceability;
- limited review traceability;
- diagnostic review traceability;
- blocked review traceability;
- source-module and blocker propagation where available;
- existing Portfolio Intelligence response fields remain present.
