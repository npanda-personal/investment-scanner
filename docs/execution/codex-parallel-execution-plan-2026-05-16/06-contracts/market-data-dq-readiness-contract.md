# Market Data / Data Quality Readiness Contract

Date: 2026-05-17

Status: Sprint 1A read-only contract audit output. Not an implementation approval.

Authoritative inputs:
- Root `AGENTS.md`
- Active execution plan under `docs/execution/codex-parallel-execution-plan-2026-05-16/`
- Current Market Data Foundation and Data Quality Engine source structure
- Current Product Owner direction for local-first, zero-incremental-cost, rule-based market intelligence

Historical-only inputs:
- `docs/codex-agent-team-plan/`
- Deleted `docs/AGENTS.md`

## 1. Purpose

This contract defines when Market Data and Data Quality are trusted enough for downstream use by signals, strategy decisions, backtests, trade plans, portfolio context, alerts, and copilot summaries.

The contract is intentionally conservative. A downstream module must not treat market data as reliable unless both the market-data evidence and the data-quality evaluation satisfy the gate for that use case.

## 2. Market Scope

Default Sprint 1 scope:
- Region: `IN`
- Asset class: `STOCK`
- Data cadence: daily EOD OHLCV
- Execution mode: local-first, read-only, no order placement, no broker execution

Out of scope until separately approved:
- Live trading
- Order placement
- Broker account actions
- Paid data providers
- Paid APIs
- Cloud-hosted data services
- Hidden telemetry
- Non-stock asset classes for implementation
- Global or multi-region rollout beyond contract review

Current code exposes broader scope concepts such as region and asset type. Sprint 1 implementation must not imply those broader scopes are trusted until separate Product Owner, Architect, and QA approvals exist.

## 3. Supported Asset Class

Sprint 1A readiness applies only to `IN/STOCK`.

Any other asset class or region must be classified as one of:
- Unsupported
- Contract pending
- Data-quality pending
- Manual review required

Unsupported instruments must not enter automated signal, strategy, alert, trade-plan, portfolio-intelligence, or copilot reliability paths.

## 4. Instrument Identity Requirements

An instrument is eligible for downstream use only when identity is complete enough to avoid symbol collision, exchange mismatch, or stale listing behavior.

Required identity fields:
- Internal instrument id
- Provider-stable symbol or provider symbol mapping
- Display symbol
- Exchange
- Region or country
- Asset type
- Currency
- Active or tradable status when discoverable
- Listing date or conservative fallback history rule
- Provider support status
- Provenance for catalog and provider mapping

Hard blockers:
- Missing internal id
- Missing provider mapping for provider-backed ingestion
- Ambiguous symbol or exchange
- Unsupported provider classification
- Delisted or inactive status unless explicitly included for historical analysis
- Manual symbol repair required

Manual-required rows may be displayed in repair workflows, but must not feed downstream automated decisions.

## 5. OHLC / Price Data Requirements

Required candle fields:
- Instrument id
- Date or session date
- Open
- High
- Low
- Close
- Adjusted close when available
- Volume when available
- Data status
- Source provider
- Source fingerprint or source run id when available
- Created and updated timestamps

Valid OHLC rule:
- `high >= max(open, close, low)`
- `low <= min(open, close, high)`
- `open`, `high`, `low`, and `close` must be finite positive values
- Adjusted close must be finite positive when present
- Candle date must not be in the future relative to the completed market session being evaluated

Invalid OHLC rows are hard blockers for the affected instrument and must be captured as evidence.

## 6. Provider / Source Provenance

Every price row and readiness result must preserve enough source evidence to explain where the data came from and why it was trusted or rejected.

Required provenance fields:
- Provider id or source name
- Provider symbol used
- Source run id or batch id when available
- Ingestion timestamp
- Validation window start and end
- Provider classification
- Retry or cooldown state when relevant
- Fallback source attempted flag when relevant
- Error or warning code when relevant

Provider provenance must be visible to audit and repair flows. It does not need to be prominent in the main UX, but user-visible explanations must summarize it.

## 7. Minimum History Requirements

Baseline full-review requirement:
- Daily EOD OHLCV from listing date to latest completed session, or
- A conservative 15-year history target when listing date is missing or older than 15 years.

Strategy-specific requirement:
- The instrument must have at least the strategy lookback window plus any warmup, signal confirmation, forward-validation, and backtest window required by that strategy.

Minimum use-case gates:
- Daily review: may be `LIMITED` if the latest completed EOD is current and warnings are explicit.
- Signal generation: requires instrument-level `READY`.
- Backtesting: requires full required history for the backtest window.
- Calibration: requires enough historical events and data-quality evidence for forward validation.
- Automation or alerts: requires `READY`; `LIMITED` is not enough for action-like alerts.

## 8. Coverage Thresholds

Universe-level readiness thresholds for broad scanner use:
- Price coverage threshold: recommended minimum `95%` of provider-supported active in-scope instruments must be price-ready.
- Metadata coverage threshold: recommended minimum `90%` of provider-supported active in-scope instruments must have required business metadata.
- Hard-blocker threshold: zero unresolved hard blockers for instruments included in downstream use.

Instrument-level readiness always wins over universe-level readiness. Even if the universe threshold passes, an individual blocked instrument must remain blocked.

Limited-review mode may be Product Owner-approved for exploration only, but must not unlock downstream signals, strategy decisions, backtests, trade plans, portfolio intelligence, alerts, or copilot reliability claims for non-ready instruments.

## 9. Stale Data Rules

An instrument is stale when:
- The latest stored candle is older than the latest completed market session required by the market calendar, or
- The market calendar is unknown and the candle cannot be proven current, or
- A provider retry cooldown prevents currentness validation.

Stale data outcomes:
- Daily review: `LIMITED` at most, with visible stale-data explanation.
- Signals and strategy decisions: blocked.
- Backtests and calibration: blocked for windows that require the missing current data.
- Alerts: blocked if based on current signal or price movement.
- Copilot summaries: may mention stale status, but must not present findings as reliable.

## 10. Missing Candle Rules

Missing candles must be classified by likely cause:
- Normal market closure
- Known holiday
- Pre-listing period
- Provider gap
- Ingestion failure
- Manual review required
- Unknown

Hard blockers:
- Missing latest completed session
- Missing candles inside strategy lookback or backtest window with no market-calendar explanation
- Repeated provider gaps that exceed the accepted threshold

Missing candles must be counted and included in readiness evidence.

## 11. Duplicate Candle Rules

Duplicate candles are hard blockers unless the repository layer can deterministically collapse them by instrument, date, source priority, and update timestamp.

Duplicate evidence must include:
- Instrument id
- Date
- Duplicate count
- Source providers
- Resolution action or manual-required state

Downstream modules must not choose between duplicates ad hoc.

## 12. Invalid OHLC Rules

Invalid OHLC rows are hard blockers.

Invalid conditions include:
- Non-finite prices
- Non-positive prices
- High lower than open, close, or low
- Low higher than open, close, or high
- Future-dated candle
- Malformed adjusted close when adjusted close is required by the strategy

Suspicious spike rejection must be contract-governed. Current source inspection shows spike rejection is disabled by default unless explicitly enabled. Enabling it requires Architect and QA approval because it can silently change historical data.

## 13. Zero / Suspicious Volume Rules

Zero or suspicious volume must be handled by use case.

Hard blockers:
- Volume is required by the strategy, liquidity screen, or signal rule and is missing, zero, or suspicious.
- Liquidity status is `ILLIQUID` or `UNKNOWN` for a use case that requires liquidity.

Allowed limited cases:
- Daily visual review may display zero-volume rows with warning.
- Non-volume strategies may proceed only if all other readiness gates pass and QA has approved the invariant.

## 14. Retry-Cooldown Handling

Retry-cooldown states must be explicit and must not be hidden behind a ready state.

Rules:
- Provider validation blocked by retry cooldown is not ready for downstream use.
- Retryable provider errors may stay in repair queues, not signal queues.
- Cooldown state must include last attempt time, next eligible attempt time if known, provider classification, and error category.
- Force overrides require Architect approval and QA evidence.

## 15. Manual-Required Rows

Manual-required rows include:
- Catalog identity repair required
- Manual provider symbol repair required
- Manual metadata import required
- Ambiguous exchange or provider mapping
- Unsupported or inactive classification requiring Product Owner decision

Manual-required rows must not feed automated downstream use until repaired and revalidated.

## 16. Unsupported Instruments

Unsupported instruments must be excluded from trusted universes.

They may be retained for:
- Historical evidence
- Repair workflow visibility
- User-facing explanation
- Future provider review

They must not be silently counted as ready, missing, or stale.

## 17. Data-Quality Status Values

Current code status values that the active contract must respect:

Market Data:
- `COMPLETE`
- `PARTIAL`
- `DELAYED`
- `MISSING`
- `ERROR`

Universe trust:
- `OK`
- `PARTIAL`
- `NOT_TRUSTWORTHY`

Trusted review universe:
- `READY`
- `LIMITED`
- `NOT_READY`

Data Quality coverage:
- `GOOD`
- `PARTIAL`
- `POOR`
- `UNUSABLE`

Signal readiness:
- `READY`
- `LIMITED`
- `NOT_READY`

Liquidity:
- `LIQUID`
- `THIN`
- `ILLIQUID`
- `UNKNOWN`

Use-case tier:
- `READY`
- `LIMITED`
- `BLOCKED`

Contract rule:
- Only `READY` instrument-level use-case tiers may feed downstream automated logic.
- `LIMITED` may display in research workflows with explicit warnings.
- `BLOCKED`, `NOT_READY`, `NOT_TRUSTWORTHY`, `UNUSABLE`, and hard-blocker states must block downstream use.

## 18. Downstream Blocking Rules

| Downstream module | Required gate | Block if |
| --- | --- | --- |
| Signal generation | Instrument DQ `READY`, use-case `signal=READY`, current EOD, no hard blockers | `LIMITED`, `NOT_READY`, stale, missing latest candle, invalid OHLC, manual-required |
| Strategy decisions | Same as signal generation plus strategy contract satisfied | Any signal gate fails, strategy version missing, rule evidence missing |
| Backtesting | `backtest=READY`, required history complete, no duplicate or invalid candles in window | Incomplete history, provider gaps, unresolved duplicates, adjusted close mismatch |
| Calibration | `calibration=READY`, enough forward-validation evidence | Insufficient events, DQ missing, overfit risk, stale history |
| Trade-plan/risk | Accepted signal or decision with DQ evidence | Missing signal provenance, DQ blocked, stale trigger price |
| Portfolio context | DQ `READY` for scoring; `LIMITED` only for display with warnings | Missing price, stale price, unsupported asset, missing instrument identity |
| Watchlists | Display may allow limited items; action-like triggers require `READY` | DQ blocked for alert or signal action |
| Alerts | `READY` and latest completed EOD current | Stale, delayed, provider cooldown, no trigger provenance |
| Copilot summaries | May summarize gaps; reliability claims require `READY` evidence | Data blocked, DQ missing, stale data, unsupported source |

## 19. Audit Fields

Every downstream event that consumes Market Data or Data Quality must preserve:
- Instrument id
- Symbol
- Region
- Asset type
- Strategy or use-case id when relevant
- Rule or gate version
- Trigger price or evaluated price when relevant
- Candle date
- Provider id
- Provider symbol
- Data-quality evaluation id or timestamp
- Data-quality status values
- Blocking or warning reason codes
- Source run id or batch id when available
- Evaluated at timestamp

## 20. Evidence Fields

Required evidence for readiness:
- Latest completed candle date
- Required history start date
- Required history status
- Price coverage percentage
- Metadata coverage percentage
- Missing candle count
- Duplicate candle count
- Invalid OHLC count
- Stale candle count
- Zero or suspicious volume count when relevant
- Provider validation classification
- Retry cooldown state
- Manual-required count
- Unsupported count
- Readiness blockers
- Recommended fixes

## 21. User-Visible Explanation Fields

User-facing explanations must be research-support language, not financial advice.

Required explanation fields:
- Readiness label
- Plain-language reason
- Data source summary
- Latest data date
- Main blockers
- Main warnings
- Recommended repair or wait action
- Whether downstream signals are blocked

Disallowed language:
- Buy, sell, hold, guaranteed, safe, certain, profit, recommendation, execution-ready.

## 22. Stop Conditions

Implementation or downstream use must stop if any of these occur:
- Product Owner approval is missing for the requirement.
- Architect approval is missing for shared files, provider policy, schema, route, scheduler, startup, or contract changes.
- QA plan is missing for the change.
- Paid provider, paid API, paid AI, cloud dependency, or broker execution is introduced without explicit approval.
- Secrets are committed or logged.
- Angel One or any broker provider is used for live calls without explicit approval.
- Startup behavior performs provider-heavy work without approval.
- Data-quality gates fail but downstream modules continue processing as reliable.
- Route registry, Prisma schema, shared utilities, shared UI components, or package manifests are touched without reservation.
- Old plan docs are treated as active authority.
- Evidence cannot explain provider, status, blocker, and repair reason.

## 23. Approval State

This contract is not yet approved for implementation.

Required before Sprint 1B implementation:
- Product Owner approves readiness thresholds and Angel One policy.
- Solution Architect approves adapter boundaries, startup behavior, route/schema impact, storage behavior, and shared-file reservations.
- QA approves validation plan and later executes approved tests.

