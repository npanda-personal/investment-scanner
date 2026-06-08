# Architecture Deep-Analysis — investment-scanner (Pass 2: spine internals)

_Date: 2026-06-06 · Author: Architect review (Claude) · Status: findings only — no changes executed, pending owner approval_

> Companion to `docs/architecture-audit-2026-06.md` (Pass 1). Pass 1 covered the surface: data-layer N+1s, connection ceiling, persisted-read GET leaks, module boundaries, the `.env` Angel One credentials, frontend, infra. **Pass 2 goes deep into the SPINE INTERNALS** that Pass 1 didn't open: signal-scoring math, calibration/track-record statistical validity, backtest realism, schema/data-model design, systemic code-quality, and auth/authz/concurrency. Pass-1 findings are NOT repeated here.

---

## Verification & corrections (read this first)

Two of the sub-agents' headline **"P0"** findings were **overstated**; I verified them against the code and re-rated them. Recording the corrections so the rest of the report is trustworthy:

1. **"P0 authorization bypass" on alerts/portfolio/watchlist → actually P1 defense-in-depth + TOCTOU gap.** The repository `updateRule`/`deleteRule` do use `where: { id }` with no `userId` (`alerts-monitoring.repository.ts:47,64`). BUT the **service layer enforces ownership first** — `updateRule` calls `getRule(id, userId)` and throws if not owned (`alerts-monitoring.service.ts:40`), and portfolio's `updatePortfolio` calls `requirePortfolio(id, userId)` then passes `userId` into the repo (`portfolio-management.service.ts:53–55`). So this is **not an exploitable bypass through the API** — it's a real but lower-severity issue: (a) defense-in-depth gap (the repo trusts its caller), and (b) a genuine check-then-act **TOCTOU race**. Trivial, worthwhile fix: push `userId` into the `WHERE` clause so ownership is atomic. Re-rated **P1**.

2. **"P0 calibration unwired / recomputes on every read" → actually a STALE-persisted-read issue.** Verified `signal-calibration-engine.service.ts:112–119`: when a persisted calibration row exists it is **returned as-is** (`withEvidenceFromSummary(existing, …)`) — it does **not** recompute. Recompute only happens when **no** row exists. The agent confused "re-attach evidence summary for display" with "recompute the score." The real nuance worth keeping: the persisted `calibratedScore` is served even when **stale relative to the regenerated corpus** (memory: 267 stale rows), and the evidence wrapper around it *is* recomputed live — so a stale score can be shown next to fresh-looking evidence. Re-rated **P1 (staleness/consistency), not unwired.**

Everything below reflects these corrections.

---

## 1 — Red flags 🔴 (NEW, spine-level)

| # | Red flag | Evidence | Severity | Why it matters |
|---|----------|----------|----------|----------------|
| R6 | **`Float` used for financial returns instead of `Decimal`** | `schema.prisma:380–392` (`SignalOutcome.forwardReturnPercent`, `maxFavorable/AdverseExcursion`, `benchmarkReturnPercent`, `alphaPercent`), `:922–930` (`SectorSnapshot.return1W/1M/3M`) — while price ticks and fundamentals correctly use `Decimal` (`:17–20`, `:515–519`) | **P1** | The track-record, alpha, and excursion math — the numbers the whole "honest evidence" thesis rests on — accumulate float rounding across millions of rows. Inconsistent with the `Decimal` discipline used for prices. Correctness-of-evidence risk. |
| R7 | **Null-owner rows visible to ALL users** | `alerts-monitoring.repository.ts:116–117`: `ownerWhere = { OR: [{ userId }, { userId: null }] }`; `AlertRule.userId` is nullable in schema | **P1** | Any alert rule with `userId: null` is matched for **every** user (evaluation + read). Benign in single-user mode now, but it's the same class as the documented "alert-digest wrong-user / billing null-owner" bugs, and a latent multi-tenant leak. Note alert *events* are correctly scoped (`ownedEventWhere`, `:121`, no null) — so the codebase is **inconsistent** about null-owner. |
| R8 | **Repository writes lack atomic ownership in `WHERE`** | `alerts-monitoring.repository.ts:47,64` (`where:{id}`); watchlist update/delete same pattern | **P1** | See correction #1 — defense-in-depth + TOCTOU. Not API-exploitable today (service gates it), but ownership should be enforced at the data layer too. |
| R9 | **Risk-adjusted stats computed on tiny samples with no guard** | `backtesting-strategy-lab.service.ts:735` (Sharpe: only `volatility>0`), `:719–724` (Sortino: `downside>1`), `:726` (Calmar: no `n` guard) | **P1** | A 30-bar backtest yields a precise-looking Sharpe/Sortino/Calmar from ~2–29 observations and surfaces it with no low-sample flag. Overstates strategy quality — directly undercuts "trustworthy backtests." (Win-rate Wilson CI *does* carry a `lowSample` flag — good — but it isn't echoed into `realismWarnings`.) |
| R10 | **`Stock.symbol` globally `@unique`; `LatestPrice.symbol` is the `@id`** | `schema.prisma:49`, `:37–44` | **P1** | Known limitation (memory) but confirmed concrete: NSE+BSE both listing the same symbol, or symbol reuse after delisting, collides. `LatestPrice` keyed on `symbol` alone can return the wrong exchange's price into signal/portfolio math. `InstrumentExchangeIdentity` already models per-exchange identity (`:132–153`) — the core tables just don't use it. |

---

## 2 — Improvements needed 🟡 (NEW)

- **`$queryRawUnsafe` with string interpolation in signal-quality-lab.** 6 call-sites (`signal-quality-lab.repository.ts:96,364,462,653,705,818`) build SQL via interpolation + a hand-rolled escape function. **Currently safe** — inputs are validated upstream (horizon/direction enums, `modelVersion` regex `^[A-Za-z0-9._:-]{1,80}$`, date validation, quote-rejecting sector escape). But it's the one injection surface in a codebase that is otherwise 100% `Prisma.sql`-parameterized. Migrate these 6 to `Prisma.sql` to retire the escape function as architectural debt. (Whole-backend check: empty catches = 0, TODO/FIXME = 0, all other `$queryRaw` parameterized — the codebase is clean here.)
- **`DataQualitySnapshot` is missing `scopeRegion` + `scopeAssetType`** (`schema.prisma:1003–1021`), while peer snapshots (`EarningsIntelligenceSnapshot`, `StockInterestSnapshot`, `SectorSnapshot`) all carry them. Downstream scoped reads of DQ data can't filter by scope at the DB level → silent scope leakage or extra joins. (Memory already had this as an open #37 item — confirmed.)
- **Calibration confidence cliff at `MIN_PERSISTED_SAMPLES = 200`.** `signal-calibration-engine.service.ts:52` + `:692`: below 200 mature persisted outcomes the engine falls back to the on-demand path computing over ~10k signals, then reports its confidence tier from that large pool while the *real* mature corpus is 50–199. Overstates maturity mid-growth. Either gate confidence on the mature count, or label the fallback.
- **Data-quality penalty not sample-gated.** `signal-calibration-engine.service.ts:1305–1316`: `UNUSABLE → −10`, `POOR → −6` applied with no sample-size multiplier (unlike the metric-based adjustments which respect `MIN_GROUP_SAMPLES`). A single signal with a coverage gap takes the full penalty. Scale by confidence.
- **Type-safety at the edges.** `as any` count is high (~527, mostly the architectural `(this.db as any).<untypedModel>` pattern for raw-SQL-created tables — low risk). The real items are a handful of crash-on-null spots: `market-context-intelligence.service.ts:144` (`latestSnapshot()!` after `run()`), and `Map.get()!` without a guard in `trade-plan-risk-engine.service.ts:1029,1031,1038`. Add guards.
- **Benchmark alpha sparsity is silent.** When `^NSEI` data is missing for a date, `alphaPercent` is null and the scorecard's `AVG(alphaPercent)` silently averages over the non-null subset (`signal-quality-lab` benchmark path). Report `alphaRowCount` alongside, or the alpha number misrepresents coverage. (This compounds Pass-1's #41 Nifty-source gap.)

---

## 3 — Performance killers 🟠 (NEW, beyond Pass-1's N+1s)

- **`price_ticks` is a plain Postgres table, not a Timescale hypertable** — confirmed: zero `CREATE HYPERTABLE` in any of the 40 migrations. 5.5M rows growing ~50–100k/day with no chunk pruning, no compression, no continuous aggregates. The single biggest structural perf lever left untouched.
- **Index design issues (quality, not just count):** overlapping Stock indexes both led by `(region, assetType)` (`schema.prisma:100–101`) add write amplification; repair-retry queries (`WHERE repairType=… AND status=… AND nextRetryAt<=now`) have no index with the right leading columns (`:289`). On the 5.5M-row hot table, write amplification from redundant indexes is real cost.
- **`SignalOutcome` denormalization write-amplification** (`schema.prisma:362–404`): symbol/direction/score/sector/country/modelVersion all denormalized onto every outcome row; a corporate-action recompute (`markStaleByInstrumentIds`) rewrites thousands of full rows, not just the computed columns. Acceptable for analytics-read speed, but note the maintenance cost on every CA event.

---

## 4 — Simple, robust, scalable 🟢

What's genuinely solid (verified, so you can stop worrying about these):

- **Signal-scoring math is in good shape.** Deep read of `signal-generation-engine.service.ts` confirmed the v3 spread formula (`SCORE_SPREAD_GAIN=1.8`, `CATEGORY_SCORE_ALPHA=1`, evidence saturation at 7), the **overextension/mean-reversion guard is actually wired into the served path** (overbought-RSI `:1025`, SMA50-stretch `:1041`, parabolic-runup `:1093` → negative votes into category scoring), the **regime-gate on shorts is wired** (`:1746`, adjusts trigger_type/confidence not score), and the claimed fixes landed (FUNDAMENTALS_AVAILABLE tautology removed, EPS/NI de-duped, momentum thresholds sane at ±2/3%, RSI warm-up 140 bars, ADX divide-by-zero guarded). Cash-stock bearish correctly classified as `risk_warning`, never a tradable short. _(This is the sub-agent's assessment; I prioritized my own verification budget on the auth/calibration corrections above rather than re-deriving the math — treat the clean bill as high-but-not-independently-reconfirmed.)_
- **Backtest engine is mostly honest:** next-bar fill (no same-bar look-ahead, `:430`), per-bar historical regime via binary-search as-of (`:1329`), UNKNOWN-not-OPEN gate fallback, capital correctly freed on exit / chained across walk-forward OOS, realistic India transaction costs (0.225%/leg), 6.5% risk-free rate. Honest survivorship + price-proxy + warm-up warnings are emitted. The gap is the small-sample stat guards (R9) and a missing slippage-absent warning.
- **Calibration correctness:** win-rate excludes NEUTRAL from the denominator (verified in both TS and SQL paths), forward-return uses a trading-day (not calendar) window with T+1 entry, score buckets are unified to one canonical definition, per-horizon excursions are correctly scoped. The fabricated-200 sample fallback was removed.
- **Concurrency where it counts:** pipeline-orchestration stage leases are **atomic** (single `updateMany` with compound WHERE on lease expiry/owner — `pipeline-orchestration.repository.ts:159`), idempotency keys on runs+stages. **Auth rate-limiting exists** (login 10/15min, signup 5/60min). Ingestion idempotency is solid (Pass 1).

The one structural concurrency weakness: the **market-data scheduler's `activeRun` is an in-memory flag** (`market-data-foundation.scheduler.ts:41`) — fine for one process, but two processes or a mid-run crash defeats it. A DB-backed lock (you already have the lease primitive in pipeline-orchestration) would make it durable.

---

## 5 & 6 — Free tools / no-paid-data (the non-negotiable) ✅

No new violations found in the spine. The runtime remains NSE/BSE-only; the only residue is the dormant Angel One env block already documented in Pass 1 (rotate + purge). The benchmark gap (#41) must stay on a **free** historical-Nifty source — do not let "we need clean alpha numbers" become a reason to reach for a paid index feed. The honest-labeling path (report alpha sparsity, R9 small-sample flags) is the free-and-correct way to close that gap.

---

## Consolidated remediation sequence (Pass 2)

Ordered by value-per-effort, all confined and low-risk:

1. **Auth hardening (cheap, high-trust):** push `userId` into the `WHERE` of alerts/portfolio/watchlist update+delete (fixes R8 TOCTOU); decide null-owner semantics and either drop `{ userId: null }` from `ownerWhere` or document it (R7).
2. **Evidence correctness:** migrate `forwardReturnPercent`/`alphaPercent`/excursions/sector-returns `Float → Decimal` (R6) — additive migration; add `DataQualitySnapshot` scope fields (open #37 item).
3. **Honest backtest stats:** add min-sample guards/flags to Sharpe/Sortino/Calmar + a slippage-absent warning (R9).
4. **Calibration honesty:** gate confidence on mature count not the on-demand pool; sample-scale the DQ penalty; surface alpha-row-count.
5. **Injection debt:** convert the 6 `$queryRawUnsafe` call-sites to `Prisma.sql`.
6. **Scale levers (when load appears):** make `price_ticks` a hypertable + continuous aggregates; prune redundant indexes; DB-back the scheduler lock.

_No code changes were made as part of this audit. Execution pending owner approval._
