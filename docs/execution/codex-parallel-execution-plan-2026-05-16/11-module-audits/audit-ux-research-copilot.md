# Audit: UX / Research / Copilot

Date: 2026-05-17

Mode: Read-only Audit Team E.

## Scope

- `frontend/src/features/stock-research-workbench/**`
- `frontend/src/features/market-data-foundation/**`
- `frontend/src/features/ai-investment-copilot/**`
- `frontend/src/shared/**`
- `frontend/tests/ui/**`
- active execution docs

No builds, tests, browser checks, live data checks, staging, commits, or file edits were run by the audit stream.

## Key Findings

1. Copilot can look more trusted than current readiness evidence supports. The UI shows data status, source modules, gaps, and a disclaimer, but not DQ readiness evidence, use-case tier, stale-data blockers, latest trusted data date, or why a summary is allowed.
2. Stock Research Workbench trust explanations are too thin. It shows source, timestamp, and status chips, but most sections do not explain readiness blockers, stale/missing data, scope mismatch, or downstream eligibility.
3. Financial-advice language risk remains in user-facing copy. Runtime copy includes terms such as `AI Investment Copilot`, `Generate Report`, `Bullish Factors`, and `No strong bullish factors returned`; visual status mapping can imply good/bad recommendations.
4. Deterministic/cost-free copilot is locally routed but not visibly proven. Frontend copilot calls local `/api/v1/copilot/*` endpoints, but the UI does not show source rule versions, no-external-LLM status, or cost-free proof.
5. Market Data Foundation has the strongest trust UX, but it is dense and scope can confuse users.
6. Table/filter/progress UX is uneven. Catalog sync is stronger than import/backfill; shared empty/loading/error states can be generic.
7. UI test coverage is asymmetric. Market Data has meaningful Playwright coverage; copilot and stock research do not yet prove blocked/readiness states, scoped data, trust explanations, or safe empty states.

## Candidate Stories

- `CF-W1-UX-01`: Design Stock Research Workbench trust surfaces for readiness status, blocker reasons, source timestamp, and downstream eligibility.
- `CF-W1-UX-02`: Design Copilot readiness evidence, stale-data warnings, deterministic source/rule proof, and research-only status.
- `CF-W1-UX-03`: Define market-scope refresh/clear behavior for research and copilot summaries.
- `CF-W1-UX-04`: Make import/backfill workflows bounded, cancellable, resumable, and explicit about scope/source.
- `CF-W1-UX-05`: Run a copy pass replacing advisory-feeling labels with research-support language.
- `CF-W1-QA-UI-01`: Add Playwright smoke tests for stock research and copilot trusted/blocked states.

## Product Owner Review Needed

UX review is needed for research/copilot trust surfaces, copilot naming/copy, unsupported asset-class visibility, and whether Stock Research Workbench should suppress downstream widgets until readiness consumer gates are implemented.

