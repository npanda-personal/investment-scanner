# Sprint 1B Wave 1 Portfolio / Alerts / Copilot DQ Dependency Audit

Date: 2026-05-17

Status: Workstream D read-only audit evidence.

## 1. Scope Inspected

Read-only scope:
- `backend/src/modules/portfolio-intelligence/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/alerts-monitoring/**`
- `backend/src/modules/ai-investment-copilot/**`
- `backend/src/modules/data-quality-engine/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/**`

No files were modified, staged, reverted, created, or deleted during the read-only audit. No tests, local servers, live data checks, startup checks, UI checks, or provider-specific checks were run.

## 2. Main Finding

The audited Lane 3 downstream modules do not currently consume `DataQualityEngineService` readiness outputs as an explicit gate.

They directly consume market data, signals, portfolio summaries, watchlist details, and alert events. That means untrusted, stale, limited, or missing-readiness market data can still reach user-facing portfolio, watchlist, alert, and copilot workflows unless separate enforcement is added and accepted.

## 3. Potential Leak Points

### `portfolio-intelligence`

Observed behavior:
- Builds health score, status, review ranking, red flags, and signal overlay from `PortfolioManagementService.summary/allocation`.
- Copies `summary.dataStatus`, but does not gate or downgrade reliability based on Data Quality readiness evidence.

Risk:
- Portfolio intelligence may present derived review outputs without proving current trusted Market Data / DQ readiness.

### `watchlist-management`

Observed behavior:
- Enriches watchlist rows with latest price, daily movement, and latest signal from Market Data / Signal services.
- Returned DTOs do not appear to include readiness status or blocker evidence.

Risk:
- Watchlist rows may display price/signal context without warning that the underlying data is stale, limited, unsupported, or untrusted.

### `alerts-monitoring`

Observed behavior:
- Creates stock, portfolio, and watchlist alert events from price movement, signal score/direction, drawdown, and bearish signal checks.
- Does not require instrument-level Data Quality `READY` before creating action-like alert events.

Risk:
- Highest-risk Lane 3 surface because alerts can turn untrusted data into action-like user attention.

### `ai-investment-copilot`

Observed behavior:
- Summarizes stock, portfolio, watchlist, market, and alert data.
- Marks source data status as complete when local source calls return data, not when Data Quality readiness is proven.

Risk:
- Copilot summaries can turn untrusted upstream data into confident narrative summaries unless Data Quality evidence is required.

### `data-quality-engine`

Observed behavior:
- Exposes useful readiness outputs and use-case tiers.
- `filterEligibleInstruments` defaults missing Data Quality evaluations to a warning/process posture unless callers explicitly pass stricter options.

Risk:
- Downstream reliability paths must explicitly choose fail-closed behavior; relying on defaults is unsafe for alerts, copilot reliability, and automated decision-support workflows.

## 4. Research-Support Language Review

Audited outputs mostly use research-support language such as:
- review
- risk
- bearish
- bullish
- signal score
- data gaps

No direct runtime language was identified for:
- buy now
- sell now
- guaranteed
- price target

Caveats:
- `portfolio-intelligence` exposes `actionSuggestion: HOLD`, which may read as advice-like even when it avoids direct buy/sell language.
- Copilot sanitization appears limited and does not cover every forbidden phrase from root `AGENTS.md`.
- Phrases such as "appears strong" or "high-scoring names to research" are acceptable only when backed by readiness evidence; current enforcement is not proven.

## 5. Blocked Modules

The following modules remain blocked from treating Market Data / DQ as trusted input:
- `portfolio-intelligence`
- `watchlist-management`
- `alerts-monitoring`
- `ai-investment-copilot`

They also remain blocked from reliability claims until separate downstream enforcement, QA, review, Architect signoff, and Product Owner acceptance are complete.

## 6. Exclusion Confirmation

This audit did not use or approve:
- Angel One.
- Live providers.
- Broker credentials.
- Provider-heavy tests.
- Startup scheduler behavior.
- Startup backfill behavior.
- UI changes.
- Prisma schema changes.
- Route registry changes.
- Shared files.

## 7. Recommended Next Contract / Test Slice

Create a narrow Lane 3 Readiness Consumer Contract before implementation.

Required contract points:
- Missing Data Quality evaluation blocks reliability by default.
- `LIMITED` may display with warnings only.
- Alerts require instrument-level `READY` and current data.
- Copilot may summarize gaps, but must not mark reliability as complete without Data Quality evidence.
- Portfolio and watchlist responses should carry readiness evidence or explicit data-gap warnings.

Recommended first test slice:
- `alerts-monitoring` backend-only readiness consumer tests.

Test goal:
- Missing, `LIMITED`, `NOT_READY`, stale, and blocked Data Quality states create no price or signal alert event.
- `READY` permits alert event creation only when the event preserves readiness evidence in metadata.

Required boundary:
- Test-only first.
- No source change unless the tests prove a gap and a later Product Owner/Architect-approved implementation slice is opened.
- No live providers.
- No Angel One.
- No startup/backfill.
- No UI.
