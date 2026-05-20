# CF-W1-L3-PORT-01B Watchlist Readiness DTO Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Watchlist-only child contract refreshed. READY-CANDIDATE for Team 00 sequencing.

Parent prerequisite: accepted `CF-W1-L3-PORT-01A` portfolio readiness DTO semantics.

Prerequisite evidence: Team 00 confirmed stable accepted commit `f1432e6` on branch `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`, including delegated Product Owner acceptance packet `09-summaries/CF-W1-L3-PORT-01A-po-acceptance-packet.md`.

Base rule: future implementation must stack on `f1432e6` unless Team 00 first confirms a later clean `dev` contains `f1432e6`.

## Contract Intent

Watchlist detail DTOs must expose DQ readiness evidence so current price, daily move, and latest signal do not overstate trust.

This contract reuses the parent `CF-W1-L3-PORT-01` readiness shape and applies it only to `watchlist-management`.

## Required Data Source

Implementation must use `DataQualityEngineService` through the DQ public module export.

Forbidden:

- importing DQ repository internals;
- duplicating DQ scoring logic;
- changing DQ source/exports in this child;
- touching portfolio files.

## Required DTO Attach Points

- Add `readiness: WatchlistItemReadinessDto` to `WatchlistDashboardItemDto`.
- Add `readinessSummary: WatchlistReadinessSummaryDto` to `WatchlistDetailDto`.

The child should reuse the parent semantics:

- `displayStatus`: `READY | LIMITED | BLOCKED`
- `actionStatus`: `READY | BLOCKED`
- DQ reason/blocker/warning propagation
- missing evaluation mapped to blocked
- `LIMITED` mapped to passive display only

## Backward Compatibility

Preserve existing watchlist fields:

- `currentPrice`
- `dailyChange`
- `dailyChangePercent`
- `latestSignal`
- `researchUrl`

Do not change route paths or sorting behavior in this child.

## Dependency Rule

- `CF-W1-L3-PORT-01B` must reuse accepted `CF-W1-L3-PORT-01A` readiness naming and mapping shape.
- Accepted `CF-W1-L3-PORT-01A` commit `f1432e6` satisfies the prerequisite, but current `dev` does not yet contain that commit.
- After Team 00 chooses the base, this child can run independently in watchlist files only.
- Do not implement from an unstacked `dev` base that omits `f1432e6`.

## Test Contract

Focused backend tests must prove:

- ready, limited, missing, blocked, and stale watchlist readiness cases;
- no silent trust inference from current price or latest signal alone;
- backward-compatible existing watchlist fields remain present.
