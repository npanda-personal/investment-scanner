# Refinement Queue

Date: 2026-05-17

## Needs Product Refinement

| ID | Question |
| --- | --- |
| CF-W1-SIG-01 | Should trusted signal-generation runs default to fail-closed DQ filtering, even if this changes current behavior? |
| CF-W1-STRAT-01 | What user-facing replacement should be used for current target-price semantics: modeled exit level, exit condition, reward/risk scenario, or remove entirely? |
| CF-W1-DQ-01 | Should missing DQ fail closed globally, or only in downstream trusted workflows? |
| CF-W1-UX-02 | Should the product continue using the label `AI Investment Copilot`, or rename to a more deterministic/research-support label? |
| CF-W1-L3-DQ-01 | Should portfolio/watchlist display limited data while action-like alerts remain blocked? |

## Needs Architecture Contract

| ID | Contract needed |
| --- | --- |
| CF-W1-SIG-01 | Signal Generation trusted-run DQ fail-closed contract |
| CF-W1-MD-02 | Market Data durable readiness evidence / natural key ADR |
| CF-W1-DQ-01 | DQ fail-closed defaults and use-case tier contract |
| CF-W1-STRAT-01 | Strategy Decision exit/invalidation and no-target contract |
| CF-W1-L3-AUTH-01 | User ownership and alert event ownership boundary |
| CF-W1-L3-ALERT-01 | Alert readiness consumer contract |

## Needs QA Plan

| ID | QA focus |
| --- | --- |
| CF-W1-SIG-01 | Focused signal-generation tests for default fail-closed and DQ filter errors |
| CF-W1-MD-01 | Validation tests for future dates, adjusted close, spike policy |
| CF-W1-DQ-01 | DQ service tests for missing/non-ready defaults |
| CF-W1-L3-AUTH-01 | Two-user ownership tests |
| CF-W1-L3-ALERT-01 | Alert event suppression and DQ evidence tests |
| CF-W1-QA-01 | Documentation-only matrix review |

