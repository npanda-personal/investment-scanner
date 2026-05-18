# CF-W1-TP-01B Team 10 Review / Release Precheck

Date: 2026-05-18

Team: TEAM-10 - Review / Release

Source branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-TP-01B`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-TP-01B`

Review result: **REJECT**

## Scope Confirmation

Reviewed source/test files approved for `CF-W1-TP-01B` only:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Branch diff against `dev` contains only those six approved source/test/doc files plus Team 06 evidence/handoff/outbox docs. No Prisma/schema, migrations, route registries, frontend, shared utilities, package manifests, generated files, repositories, provider/startup/backfill logic, broker integrations, paid/cloud services, telemetry, staging, commit, push, or merge were used by Team 10.

## Findings

### P1 - Automation-only Data Quality blockers can make every otherwise trusted paper-review candidate non-ready

`backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts:149` treats any Data Quality blocker containing `blocked` as a hard paper-readiness blocker. The Data Quality snapshot mapper feeds this from `dataQuality.readinessBlockers` at `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts:1529`.

Current Data Quality output always includes the phase-0 automation tier as blocked: `backend/src/modules/data-quality-engine/data-quality-engine.service.ts:501` sets `automation: { status: 'BLOCKED', reasons: [PHASE0_AUTOMATION_NOT_AUTHORIZED] }`, and `backend/src/modules/data-quality-engine/data-quality-engine.service.ts:513` to `:518` folds all blocked use-case tiers, including `automation`, into `readinessBlockers`.

That means a DQE payload with `coverageStatus = GOOD`, `signalReadinessStatus = READY`, `liquidityStatus = LIQUID`, `eligibleForSignals = true`, daily-review/signal-ready evidence, and only `AUTOMATION_BLOCKED: PHASE0_AUTOMATION_NOT_AUTHORIZED` can still be classified as `BLOCKED` by Trade Plan. This contradicts the `CF-W1-TP-01B` QA scenario that valid trusted DQ may become `READY_FOR_PAPER_REVIEW` when non-target proof passes, and it mirrors the already rejected `PORT-01A` release risk around treating automation-only DQ blockers as downstream hard blockers.

Required fix: distinguish required Trade Plan use-case blockers from policy-blocked automation evidence. At minimum, add a focused test with DQE-like readiness blockers containing only `AUTOMATION_BLOCKED: PHASE0_AUTOMATION_NOT_AUTHORIZED` while signal evidence is ready and `eligibleForSignals = true`; the candidate should not be blocked solely by automation policy text. Then keep stale/provider/scope/unsupported, missing DQ, `NOT_READY`, `LIMITED`, `eligibleForSignals=false`, and required Trade Plan tier blockers fail-closed.

## Checks Passed

- Missing `target` no longer blocks paper readiness by itself in the focused paper-readiness test.
- Target-shaped fields remain compatibility/modeled review geometry in changed docs/tests/code wording.
- Positive readiness reasons do not appear to cite target-shaped fields as proof.
- Forbidden product-language scan returned no matches for the requested changed scope.
- Focused Trade Plan Jest suite passed.
- `git diff --check dev...HEAD` passed.

## Validation Run

Memory safety check:

- WMI memory query was denied by sandbox.
- Fallback .NET memory check succeeded: total `15.77 GB`, available `3.32 GB`, used `78.9%`.

Commands:

- `npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand`
  - Result: pass
  - Suites: 2 passed
  - Tests: 46 passed
- `rg -n "price target|profit target|predicted return|direct recommendation|guarantee|buy now|sell now|must buy|must sell|Target is modeled|Target requires|sizing and target" backend/src/modules/trade-plan-risk-engine backend/tests/modules/trade-plan-risk-engine backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
  - Result: no matches
- `git diff --check dev...HEAD`
  - Result: pass
- `git status --short --branch`
  - Result: clean source worktree on `codex/team06-strategy-signal/CF-W1-TP-01B`

Skipped:

- Backend build was skipped because release is rejected on code-review grounds after focused tests passed.
- UI checks and live local data checks were not applicable to this backend-only review and no providers/servers were started.

## Release Risk

If merged as-is, Trade Plan paper-readiness can be systematically over-blocked by DQE's intentionally policy-blocked automation tier, making `READY_FOR_PAPER_REVIEW` unavailable even when the relevant signal/trade-plan DQ evidence is otherwise ready. This damages the paper-review workflow while preserving no additional safety beyond the existing no-broker/no-automation constraints.

## Next Gate

Return to Team 06 rework. After revision, Team 04 should run focused QA for `CF-W1-TP-01B`, then Team 10 should re-review before Architect signoff, Product Owner acceptance, scoped commit, or release.
