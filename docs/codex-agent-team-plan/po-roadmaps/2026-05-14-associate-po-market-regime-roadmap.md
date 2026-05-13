# Associate PO Roadmap - Market Regime and Trade Permission

Date: 2026-05-14  
Scope: `IN / STOCK` first, research-support only, no paid providers/services.

## Current capability

- Market health already exists in pieces:
  - `market-context-intelligence` produces region-scoped `RISK_ON / NEUTRAL / RISK_OFF`.
  - `strategy-decision-engine` maps that into `OPEN / SELECTIVE / CLOSED / UNKNOWN` market gate plus allowed actions.
  - `market-data-foundation` and `data-quality-engine` already expose `FULL_REVIEW / LIMITED_REVIEW / NO_REVIEW`.
- Candidate generation already exists in pieces:
  - `strategy-framework` has active math-based long-entry strategies and one defensive exit strategy.
  - `strategy-decision-engine` outputs `TRADE_CANDIDATE`, `WATCH`, `AVOID`, `EXIT_CANDIDATE`, and `REDUCE_RISK`.
  - `today-trade-review` groups `LONG_REVIEW`, `SHORT_REVIEW`, and `EXIT_RISK_REVIEW`.
- Evidence and proof layers exist:
  - `signal-quality-lab` measures historical outcomes.
  - `signal-calibration-engine` adjusts scores when evidence is sufficient.
  - `historical-context-snapshots` persists regime/sector/context for lookback use.
  - `trade-plan-risk-engine` persists proof-chain, geometry, and readiness snapshots.
- Current repo state is still conservative:
  - 2026-05-13 PO review shows `reviewMode = NO_REVIEW`, zero Today Review candidates, unavailable calibration influence, and zero paper-ready trade plans.

## Product gaps

1. There is no single trade-permission contract that answers: "Is the market healthy enough for new trades now?"
2. The current market gate is mainly long-entry oriented; it does not explicitly govern long exit, short entry, and short exit as one permission matrix.
3. Strategy coverage is asymmetric: long-entry and defensive-exit are first-class; short-entry and short-exit are not first-class framework-backed strategies yet.
4. `trade-plan-risk-engine` still defaults promoted targets to `REWARD_RISK_MULTIPLE` / default 2R, which conflicts with the product goal of strategy-native mathematical exits.
5. Research Hub, Today Review, Strategy Decision, and Trade Plans still use partially different readiness/actionability semantics.
6. Signal-quality maturity and calibration readiness are not yet strong enough to authorize higher-confidence trade permission.
7. Short-side feasibility is not modeled explicitly by instrument/product availability, so short candidates can be overstated if the product expands too quickly.

## Priority order and roadmap

| Priority | Item | Acceptance criteria | Dependencies |
| --- | --- | --- | --- |
| P0 | Canonical trade-permission contract | One shared contract returns per-scope status for `newLong`, `exitLong`, `newShort`, and `exitShort` with `READY / LIMITED / BLOCKED / UNPROVEN / INSUFFICIENT_DATA`, plus reasons and next action. Research Hub, Today Review, Strategy Decision, and Trade Plans do not contradict it. | Market gate, review readiness, DQE, Signal Quality, Calibration, Strategy Framework proof |
| P1 | Versioned market-regime scoring for permissioning | Trade permission uses a documented, versioned mathematical regime model from breadth/regime/context inputs, not page-specific heuristics. Threshold changes are traceable and testable. | Market Context Intelligence, Historical Context Snapshots |
| P2 | Strategy catalog expansion to full action set | Framework-backed strategies exist for long entry, long exit, short entry, and short exit/reduce-risk. Each has deterministic rules, required inputs, backtest summary, and readiness label. | Strategy Framework, Backtesting Strategy Lab, Strategy Decision |
| P3 | Replace default 2R targets for promoted candidates | Promoted trade candidates use strategy-native exit/target logic or market-structure logic. Default `REWARD_RISK_MULTIPLE` is not the promoted-path target method. If fallback geometry remains, it is explicitly downgraded to watch/unproven. | Trade Plan Risk Engine, Strategy Framework, Backtesting Strategy Lab |
| P4 | Evidence gating for permission and promotion | When signal evidence is `UNAVAILABLE`, calibration is `UNAVAILABLE`, or strategy proof is `UNPROVEN`, the system downgrades to watch/block/unproven instead of allowing new-trade permission. | Signal Quality Lab, Signal Calibration Engine, Strategy Framework |
| P5 | Cross-module candidate taxonomy rollout | Internal domain taxonomy cleanly maps to `LONG_ENTRY`, `LONG_EXIT`, `SHORT_ENTRY`, `SHORT_EXIT`, `REDUCE_RISK`; user-facing UI may keep review-safe language, but downstream logic and analytics use one canonical action model. | Strategy Decision, Today Review, Trade Plans, Research Hub |

## Key dependencies

- Trusted review-universe repair in `market-data-foundation`
- Persisted coverage/readiness in `data-quality-engine`
- Historical outcome usability in `signal-quality-lab`
- Calibration readiness in `signal-calibration-engine`
- Strategy proof and ratings in `strategy-framework` + `backtesting-strategy-lab`
- Persisted regime/context snapshots in `historical-context-snapshots`
- Existing-position context for exit logic; future broker integration is optional and out of scope here

## Risks

- If modules continue to infer actionability independently, the user will keep seeing contradictory answers.
- If short-entry support ships before shortability/product-eligibility is modeled, short candidates will be misleading.
- If 2R fallback remains on the promoted path, the product will look mathematically disciplined while still behaving like generic RR templating.
- If permissioning consumes weak signal-quality/calibration samples, the system will overstate confidence.
- Free/local data may remain the limiting factor for long-horizon proof; permissioning must fail conservative when evidence is thin.

## Domain recommendation

Build this domain in this order:

1. shared trade-permission contract
2. versioned regime model
3. full action-set strategy coverage
4. strategy-native exits/targets
5. cross-module rollout

The core PO rule for this domain should be: market health alone is never enough. New-trade permission requires market regime, trusted data, usable signal evidence, proven strategy logic, and non-generic exit math to agree.
