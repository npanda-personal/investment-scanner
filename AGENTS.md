# AGENTS.md

You are working inside my existing investment-scanner project.

This file is the root operating constitution for the AI agent, subagents, planning mode, implementation mode, reviews, and release gates. The detailed sections now live as topic files under `docs/agents/` — read the ones relevant to your task before making changes (routing table in `CLAUDE.md`).

Keep this file durable. Do not turn it into a task log. Detailed plans, audits, work packets, QA evidence, release notes, and decision records belong under `docs/`.

## Mission (one line)

Build and evolve a localhost-first, zero-incremental-cost, rule-based market intelligence application — research-support only, never financial advice — for 6–12 months of personal validation before any B2C/B2B decision.

## Non-Negotiable Constraints (always apply)

- Local laptop development only; localhost runtime only unless explicitly approved.
- No cloud deployment, paid APIs, paid databases, paid infrastructure, paid market-data providers, paid AI services, or paid hosted testing.
- No broker integration. No real-money trade execution.
- No hidden dependencies that create future cost or vendor lock-in; no external telemetry without explicit approval.
- No arbitrary target prices, no black-box buy/sell recommendations; every signal must be rule-based, explainable, auditable, and strategy-versioned.
- Data quality status must be checked before downstream signal/strategy/alert/portfolio/copilot workflows use market data.
- Research-support language only (bullish/bearish/entry/exit/invalidation trigger, candidate, signal quality) — never "buy now", "price target", "guaranteed", or financial-advice wording.
- UX must be designed before meaningful UI implementation.
- The agent must not self-approve its own implementation; Product Owner acceptance comes only after QA, code review, and release audit.

Full constraint text: [docs/agents/mission-and-constraints.md](docs/agents/mission-and-constraints.md)

## Topic Files (the full constitution)

| Read this | When working on | Original sections |
|---|---|---|
| [mission-and-constraints.md](docs/agents/mission-and-constraints.md) | scope/priority decisions, product language, what is allowed | §1, §3, §4, §6 |
| [team-and-lanes.md](docs/agents/team-and-lanes.md) | agent roles, startup protocol, module lane ownership, orchestration defaults | §5, §7, §8, §36 |
| [delivery-workflow.md](docs/agents/delivery-workflow.md) | parallel execution, branching, delivery flow, handoffs, review gates, release | §9–§12, §30–§32 |
| [architecture-standards.md](docs/agents/architecture-standards.md) | project baseline, backend/frontend module structure, layering | §2, §13–§15 |
| [ux-standards.md](docs/agents/ux-standards.md) | any UI/page/component work | §16 |
| [signals-and-strategy.md](docs/agents/signals-and-strategy.md) | signal/trigger contracts, strategy and rule requirements | §17, §18 |
| [data-and-market-policy.md](docs/agents/data-and-market-policy.md) | data quality, OHLC policy, market scope, batch orchestration | §19–§22 |
| [domain-rules.md](docs/agents/domain-rules.md) | AI copilot, auth, subscription, notifications | §23, §24 |
| [testing-and-quality.md](docs/agents/testing-and-quality.md) | tests, performance/laptop safety, refactors | §25–§27 |
| [docs-security.md](docs/agents/docs-security.md) | documentation rules, safety and security | §28, §29 |
| [decision-heuristics.md](docs/agents/decision-heuristics.md) | choosing next work, MVP-first, final principle | §33–§35 |

Related: hard constraints quick sheet at [docs/instructions.md](docs/instructions.md); architecture deep-dive at [docs/architecture.md](docs/architecture.md).
