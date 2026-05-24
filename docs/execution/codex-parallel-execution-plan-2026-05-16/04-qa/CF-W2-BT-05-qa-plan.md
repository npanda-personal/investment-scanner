# CF-W2-BT-05 QA Plan

Date: 2026-05-24

Owner: Team 04 QA Factory

## Work Item

`CF-W2-BT-05` - backtesting documented-rule exit / invalidation supporting evidence separated from optional take-profit simulation assumptions.

## QA Status

`ACCEPT / READY-FOR-TEAM00-EVALUATION`

Docs-only QA planning is prepared from the requirement, Team 03 architecture review, contract, work packet, and Team 03 architecture outbox. This packet is separate from active `TSC-03A` QA verification and does not authorize implementation by itself.

No Team 04 planning blocker remains. Team 00 can evaluate this item for Ready promotion only if it preserves one-writer sequencing and stacks the implementation on accepted `CF-W1-BT-04` commit `2bd794f`.

## Verdict

The `CF-W2-BT-05` QA plan is ready for Team 00 Ready evaluation as one bounded backend-only `backtesting-strategy-lab` child.

Remaining Team 00 readiness work after this QA plan:

- copy the exact four-file writer set from the architecture/work-packet packet into the Ready queue;
- enforce the required base `CF-W1-BT-04` commit `2bd794f`;
- reserve one dedicated Team 06 backtesting worktree;
- keep this packet separate from active `TSC-03A` QA work and any other `backtesting-strategy-lab` implementation pass.

## Scope

Backend-only QA for an additive backtesting rule-evidence projection in `backtesting-strategy-lab`.

Planned in-scope implementation surfaces, once Team 00 promotes an exact handoff:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`

Out of scope for this first child:

- Prisma schema, migrations, generated files, persistence redesign, or backfill
- repository, controller, router, validation, module, or public export changes
- frontend rendering, frontend tests, or Today Review consumer adoption
- route registry, shared UI, shared backend utility, package, provider/live-data, startup, or cross-module source/test changes
- `strategy-framework`, `signal-quality-lab`, `strategy-decision-engine`, `trade-plan-risk-engine`, and `market-data-foundation` source/test edits
- any target-price, profit-target, reward/risk, or advice framing

## Contract Inputs Reviewed

- `10-requirements/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-requirement.md`
- `03-architecture/CF-W2-BT-05-architecture-review.md`
- `06-contracts/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-contract.md`
- `08-work-packets/CF-W2-BT-05-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W2-BT-05-architecture-outbox.md`
- base dependency noted by Team 03:
  - accepted `CF-W1-BT-04` commit `2bd794f`

## Current Packet Alignment

- The first child is explicitly backend-only and no-schema first.
- Team 03 has already constrained the implementation to four module-local files.
- Team 03 requires the slice to stack on accepted `CF-W1-BT-04` commit `2bd794f`, because current `dev` does not carry the accepted backtesting trust stack.
- Required behavior is additive evidence projection only; no route, repository, schema, or frontend widening is permitted.
- Historical registered runs that lack stable documented exit rule codes must remain readable and must be marked as missing evidence rather than upgraded into documented proof.
- `TAKE_PROFIT` must stay isolated as a simulation assumption and must never become trusted supporting evidence or target framing.

## Required QA Assertions

- The implementation is stacked on accepted `CF-W1-BT-04` commit `2bd794f`, not plain `dev`.
- The implementation changes only the four reserved `backtesting-strategy-lab` files.
- The evidence packet is additive only and does not remove or rename existing run DTO fields.
- A registered run with explicit documented exit rule codes produces documented exit evidence using stable rule codes, not human-readable reason text.
- A registered legacy run with missing historical rule-code evidence is surfaced honestly as missing documented rule-code evidence.
- A custom-rule run or missing-strategy-code run is marked unsupported and is not safe for trusted candidate supporting evidence.
- Comparable-run freshness is derived from existing registered saved runs with matching comparability dimensions and uses the latest comparable run status truthfully.
- `TAKE_PROFIT` appears only under simulation-assumption exit counts and is not merged into documented exits, invalidation proof, or trusted target-like evidence.
- `STOP_LOSS`, `TRAILING_STOP`, `MAX_HOLDING_PERIOD`, `END_OF_TEST`, and `STRATEGY_EXIT` remain outside documented invalidation proof unless explicit invalidation proof exists.
- No documented invalidation proof is inferred from stop loss, trailing stop, max hold, take profit, or free-text reason summaries.
- No target, target price, profit target, reward/risk, `R:R`, buy/sell advice, guaranteed outcome, or automated trade instruction wording appears in evidence fields, docs, or focused tests.
- Existing run DTO compatibility is preserved for historical runs without backfill.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Registered run with documented exit rule codes | Evidence reports registered support status, preserves strategy scope fields, exposes explicit documented exit rule codes and counts, and may mark trusted supporting evidence `true` only if take-profit is isolated and documented exit proof is present. |
| Registered legacy run missing rule-code evidence | Evidence reports legacy missing-rule-code status or equivalent missing-evidence path; the run remains readable but cannot be represented as documented-rule proof. |
| Custom-rule run unsupported | Evidence reports custom-rule unsupported status, includes missing-evidence signaling for undocumented/custom rules, and keeps trusted supporting evidence `false`. |
| Comparable-run freshness | A non-latest comparable registered run is marked stale against the latest comparable registered run; the latest comparable run is marked latest using existing saved-run timestamps only. |
| Take-profit isolation | `TAKE_PROFIT` is counted only inside simulation-assumption exit counts and never appears as documented exit proof, invalidation proof, or target-like supporting evidence. |
| Operational exit isolation | `STOP_LOSS`, `TRAILING_STOP`, `MAX_HOLDING_PERIOD`, `END_OF_TEST`, and `STRATEGY_EXIT` stay classified as operational exits and do not create documented invalidation proof by implication. |
| No inferred invalidation from reason text | Free-text `reasons` or similar human-readable explanations do not generate documented invalidation rule codes or counts. |
| Missing invalidation proof honesty | If explicit invalidation proof is absent, evidence surfaces missing invalidation modeling truthfully instead of fabricating invalidation counts. |
| No-trades path | A zero-trade run returns honest missing-evidence signaling and does not overstate documented proof or freshness. |
| Language safety | Evidence fields, test assertions, and module docs stay research-supportive and contain no target/profit-target/R:R/advice wording. |
| Forbidden-scope attempt | Any repository, route, schema, frontend, shared utility/UI, package, generated, provider/live, startup/backfill, or cross-module widening is a QA reject. |

## Required Test Commands

Commands below are guidance only. They were not run during this docs-only QA planning task.

Focused backend tests after Team 00 promotion, stacked base confirmation, and implementation handoff:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

Required backend build after accepted implementation and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

Required changed-file language guard after implementation:

```powershell
rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction|target evidence" backend/src/modules/backtesting-strategy-lab backend/tests/modules/backtesting-strategy-lab
```

Recommended changed-file scope check from the implementation worktree:

```powershell
git diff --name-only 2bd794f --
```

## Minimum Test Assertions

Focused service tests must prove:

- registered runs with explicit documented exit rule codes expose those codes and counts under documented exit evidence;
- legacy registered runs without stable rule-code persistence are marked as missing documented rule-code evidence;
- custom-rule or missing-strategy-code runs are marked unsupported and unsafe for trusted candidate supporting evidence;
- freshness compares only against comparable registered runs and distinguishes latest comparable from stale comparable runs;
- `TAKE_PROFIT` is counted only under simulation-assumption exit counts;
- `STOP_LOSS`, `TRAILING_STOP`, `MAX_HOLDING_PERIOD`, `END_OF_TEST`, and `STRATEGY_EXIT` stay under operational exit counts;
- invalidation evidence is not inferred from stop loss, trailing stop, max hold, take profit, or human-readable reasons;
- no-trades runs emit truthful missing-evidence signaling;
- existing run DTO fields remain backward-compatible.

## QA Rejection Conditions

Reject the developer handoff if:

- any required focused backend test or backend build fails;
- implementation does not stack on accepted `CF-W1-BT-04` commit `2bd794f`;
- implementation touches files outside Team 00's Ready reservation;
- the slice requires repository, route, schema, frontend, shared utility, package, generated, provider/live, startup/backfill, or cross-module changes to complete;
- `TAKE_PROFIT` is represented as documented exit evidence, invalidation evidence, target evidence, or trusted candidate target-like support;
- invalidation is inferred from `STOP_LOSS`, `TRAILING_STOP`, `MAX_HOLDING_PERIOD`, `END_OF_TEST`, `TAKE_PROFIT`, or free-text reasons;
- legacy runs without stable rule-code proof are surfaced as documented-rule evidence;
- custom-rule runs are surfaced as trusted supporting evidence;
- language introduces target/profit-target/R:R/advice/guarantee wording;
- the implementation widens into Today Review, Signal Quality, Strategy Decision, frontend, or persistence redesign.

## Stop Conditions For Team 04

Stop QA and return to Team 00 / Architect if:

- implementation requires repository changes to find comparable runs or rule evidence truthfully;
- implementation requires new persistence or backfill to preserve historical rule-code evidence;
- implementation needs controller, router, validation, route, or frontend changes to complete the first child;
- implementation cannot isolate `TAKE_PROFIT` without changing broader backtesting semantics;
- another team already owns any reserved `backtesting-strategy-lab` file;
- executable validation is blocked by laptop safety/resource limits.

## Evidence Required Later

- Exact implementation handoff limited to the four reserved backend files
- Proof that the implementation worktree is based on accepted `CF-W1-BT-04` commit `2bd794f`
- Scenario evidence for documented-rule, legacy-missing-evidence, custom-rule-unsupported, stale/latest comparable freshness, and no-trades paths
- Proof that `TAKE_PROFIT` is isolated under simulation assumptions only
- Proof that operational exits do not become invalidation proof
- Proof that invalidation is not inferred from reason text
- Focused backend test output
- Backend build output
- Language-scan result
- Explicit note that no forbidden scope and no plain-`dev` base drift occurred
