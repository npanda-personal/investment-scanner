# Mission & Non-Negotiable Constraints

> Extracted verbatim from the original AGENTS.md constitution. Index of all topic files: [AGENTS.md](../../AGENTS.md)

# 1. Product Mission

Build and evolve a localhost-first, zero-incremental-cost, rule-based market intelligence application for 6–12 months of personal validation before deciding whether it is ready for B2C or B2B expansion.

The product should help me discover, validate, monitor, and review rule-based market events across:

- stocks
- ETFs
- indices
- crypto
- future asset classes only when explicitly approved

The application should answer:

- Which instruments triggered a bullish, bearish, entry, exit, risk, or invalidation event?
- At what trigger price?
- Under which strategy, rule, and version?
- For what reason?
- With what data quality status?
- What rule-based exit or invalidation condition applies?
- How did the event perform over time?
- Is the signal reliable enough after forward validation?

This is a research-support and market-intelligence application.

It must not present outputs as direct financial advice.

---

# 3. Do Not Be Biased Toward Current Setup

The existing project is the starting point, not a sacred assumption.

Do not blindly preserve the current setup.

Do not blindly recommend starting fresh.

Before recommending a major refactor, migration, or fresh scaffold, the agent must produce evidence from a current-state audit.

The audit must compare:

1. Continue existing project mostly as-is
2. Refactor existing project in place
3. Create fresh scaffold and migrate useful pieces

Decision rule:

- If existing functionality is useful and can be safely modularized, refactor in place.
- If current architecture blocks correctness, testability, or parallel execution, propose a migration plan.
- If a fresh scaffold is faster and safer, prove it with evidence and preserve reusable pieces.

Major architecture changes require Product Owner approval.

---

# 4. Non-Negotiable Constraints

## Local-first and zero-incremental-cost constraints

- Local laptop development only.
- Localhost runtime only unless explicitly approved.
- No cloud deployment.
- No paid APIs.
- No paid databases.
- No paid infrastructure.
- No paid market-data providers.
- No paid AI services.
- No paid hosted testing.
- No broker integration.
- No real-money trade execution.
- No hidden dependency that creates future cost or vendor lock-in.
- No external telemetry, tracking, or remote analytics unless explicitly approved.

## Product constraints

- No arbitrary predefined target prices.
- No black-box buy/sell recommendations.
- Entry events must be based on documented rules.
- Exit events must be based on documented rules.
- Invalidation events must be based on documented rules.
- Every generated signal/trigger must be explainable.
- Every generated signal/trigger must be auditable.
- Every strategy must be versioned.
- Every data source limitation must be documented.
- Data quality status must be checked before downstream signal, strategy, alert, portfolio, or copilot workflows use market data.
- UX must be designed before meaningful UI implementation.
- Product Owner acceptance happens only after QA, code review, and release audit.
- The agent must not self-approve its own implementation.

## Product language constraints

Prefer research-support language:

- bullish trigger
- bearish trigger
- entry trigger
- exit trigger
- invalidation trigger
- risk warning
- candidate
- consider review
- signal quality
- reliability
- data quality
- reason summary
- strategy version
- rule version
- exit condition

Avoid:

- buy now
- sell now
- guaranteed
- profit target
- price target
- must buy
- must sell
- guaranteed return
- financial advice
- automated trade instruction

If the Product Owner says “buy signal” or “sell signal,” map internally to safer language such as “bullish entry trigger,” “bearish trigger,” or “exit trigger.”

---

# 6. Product Owner Priority Rule

The latest Product Owner instruction overrides older docs when there is a conflict.

When Product Owner direction changes:

1. Pause affected downstream work.
2. Update the active work board or planning doc.
3. Return affected items to the earliest impacted gate.
4. Update product brief, acceptance criteria, architecture contract, QA plan, work packet, or decision record as needed.
5. Do not continue old implementation assumptions silently.

The Product Owner owns:

- product direction
- roadmap priority
- acceptance criteria
- investment-domain judgment
- workflow intent
- final acceptance
- whether the product feels useful and trustworthy

The agent may challenge assumptions, but final product judgment belongs to the Product Owner.

---

