# CF-W1-TSC-02A-TREV-HEALTH QA Plan

Date: 2026-05-24

Owner: Team 04 QA Factory

Status: QA-plan ready for Team 00 evaluation as one bounded Today Review child. Executable QA remains blocked until Team 00 promotes the split child on the required stacked base and Team 07 provides an implementation handoff limited to the reserved Today Review files.

Parent: `CF-W1-TSC-02 - Active Signal Health Rule Evidence`

Architecture packet: `03-architecture/CF-W1-TSC-02-architecture-review.md`

Contract packet: `06-contracts/CF-W1-TSC-02-active-signal-health-rule-evidence-contract.md`

Work packet: `08-work-packets/CF-W1-TSC-02-work-packet.md`

## Scope

Validation plan for additive Today Review active-signal health projection in `CF-W1-TSC-02A-TREV-HEALTH`.

Planned in-scope implementation surfaces after Team 00 promotion:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Out of scope for this first child:

- plain `dev` as the implementation base
- any base other than accepted `CF-W1-TSC-01A-TREV` commit `9fbc989`
- Prisma schema, migrations, generated files, or persisted row shape changes
- Today Review repository/controller/router/validation/index edits
- backend or frontend route registry edits
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- shared backend utilities, shared frontend components, package manifests, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential scope
- upstream or downstream module source/test changes outside the reserved Today Review file set
- `CF-W1-TSC-03`, `CF-W1-BT-04`, new active-monitor page work, or durable health history

This QA plan does not approve source changes, builds, tests, servers, Playwright runs, or Ready movement by itself. It records the bounded QA gate only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `AGENTS.md`
- `10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `03-architecture/CF-W1-TSC-02-architecture-review.md`
- `06-contracts/CF-W1-TSC-02-active-signal-health-rule-evidence-contract.md`
- `08-work-packets/CF-W1-TSC-02-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W1-TSC-02-architecture-outbox.md`

Current source alignment checked in the repo:

- Today Review backend/frontend files and focused tests already exist at the exact reserved paths Team 03 named, so the child can stay inside the Today Review writer set.
- Current `dev` still contains Today Review trade-plan-shaped surfaces, which matches Team 03's finding that implementation must stack on accepted Team07 commit `9fbc989` instead of plain `dev`.
- The child remains additive and read-path-only. QA must reject any attempt to widen into persistence, routes, repositories, shared UI, shared utilities, or upstream evidence rewrites.

## Required QA Assertions

- Implementation is sequenced in a Team07 worktree or branch stacked on accepted `CF-W1-TSC-01A-TREV` commit `9fbc989`. Running this child directly from plain `dev` is a reject.
- Health projection remains additive and backward-compatible for existing Today Review rows and routes.
- Only these health states are emitted:
  - `ACTIVE`
  - `HEALTHY`
  - `WEAKENING`
  - `RISK_WARNING`
  - `EXIT_TRIGGERED`
  - `INVALIDATED`
  - `EXPIRED`
  - `BLOCKED`
- `ACTIVE` is used only when trusted entry evidence exists but no stronger current rule-backed state is proven.
- `HEALTHY`, `WEAKENING`, and `RISK_WARNING` each expose visible current rule/version or evidence basis. Missing proof must not be promoted into those states.
- `EXIT_TRIGGERED` appears only from documented exit-rule proof.
- `INVALIDATED` appears only from documented invalidation-rule proof.
- `EXPIRED` appears only from documented expiry proof.
- Missing-rule-evidence downgrade is fail-closed:
  - absent current proof for a stronger state downgrades to `ACTIVE` or `BLOCKED`
  - explicit missing-evidence reasons remain visible
  - no price movement alone, Trade Plan compatibility field, stop geometry, target-shaped field, or synthetic target is used as health proof
- Data Quality hard-block is fail-closed:
  - blocked, missing, unsupported, or stale-hard-blocked DQ cannot produce `HEALTHY`
  - hard-blocked DQ can produce `BLOCKED` only with visible reason/evidence status
- Legacy snapshot compatibility is preserved:
  - older Today Review rows that lack new health fields still load
  - rows render conservatively without crashing
  - missing health evidence is disclosed rather than invented
- List/detail consistency is preserved for the same candidate:
  - same health state
  - same evidence status
  - same summary
  - same missing-evidence posture
- Product language remains research-supportive:
  - no `R:R`, reward/risk, target price, profit target, synthetic target, buy now, sell now, guaranteed, must buy, must sell, financial advice, or Trade Plan-first framing on touched surfaces
  - confidence wording, if used, must mean evidence-backed trust rather than conviction or action instruction

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| `ACTIVE` with trusted entry evidence and no stronger current proof | Candidate stays `ACTIVE`, trusted entry basis remains attached, and summary explains that stronger current health proof is not available. |
| `HEALTHY` with current rule-backed proof | Candidate renders `HEALTHY` with rule/version basis, evidence date, and compact reason summary. |
| `WEAKENING` with current rule-backed proof | Candidate renders `WEAKENING` with visible weakening basis and no exit/invalidation overclaim. |
| `RISK_WARNING` with current warning evidence and non-blocking DQ | Candidate renders `RISK_WARNING` with evidence-backed caution and does not collapse into `HEALTHY`, `EXIT_TRIGGERED`, or `INVALIDATED`. |
| `EXIT_TRIGGERED` from documented exit-rule proof | Candidate renders `EXIT_TRIGGERED` only when exit-rule proof is present; missing exit proof cannot infer this state. |
| `INVALIDATED` from documented invalidation proof | Candidate renders `INVALIDATED` only when invalidation proof is present; missing invalidation proof cannot infer this state. |
| `EXPIRED` from documented expiry proof | Candidate renders `EXPIRED` only when expiry basis is explicit and current. |
| `BLOCKED` from DQ hard-block | Candidate renders `BLOCKED` when DQ is blocked, missing, unsupported, or stale-hard-blocked; `HEALTHY` is not allowed. |
| Missing-rule-evidence downgrade | Candidate falls to `ACTIVE` or `BLOCKED`, exposes missing-evidence reasons, and does not fabricate stronger health certainty. |
| Legacy snapshot missing new health fields | Today Review list/detail still renders the candidate conservatively and does not crash or backfill invented proof. |
| List/detail normalization | Same candidate shows the same health state, evidence status, and summary in both row and detail surfaces. |
| Language safety | Touched backend docs/types/summaries and frontend UI/spec assertions do not introduce target/R:R/advice leakage. |
| Scope drift attempt | Any touch outside the eight reserved Today Review files, or any attempt to implement against plain `dev`, is a QA reject. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Required implementation-base confirmation before any executable QA:

```powershell
git rev-parse HEAD
git merge-base --is-ancestor 9fbc989 HEAD
git diff --name-only 9fbc989 --
```

Expected QA interpretation:

- the working tree under review must include accepted base commit `9fbc989`
- changed implementation files must stay inside the reserved Today Review file set
- any drift against plain `dev` without the stacked base is a rejection condition

Focused backend validation after Team 00 promotion and Team07 implementation handoff:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
```

Required backend build after accepted implementation and resource check:

```powershell
cd backend
npm.cmd run build
```

Required frontend build after accepted implementation because the child includes feature-local UI files:

```powershell
cd frontend
npm.cmd run build
```

Required feature-local UI smoke after accepted UI implementation, startup plan, and one-Playwright-worker sequencing:

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

Required language scan after implementation:

```powershell
rg -n "R:R|reward/risk|profit target|price target|target price|synthetic target|buy now|sell now|must buy|must sell|guaranteed|financial advice|Trade Plan|trade-plan" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

Any scan hit must be explained in QA evidence. Compatibility identifiers or historical doc references are not an automatic failure, but visible rendered wording or trusted-behavior usage is a reject.

## UI Smoke Skipped-Check Policy

If the feature-local UI smoke is blocked during executable QA, record all four items exactly:

- `exact blocker`: for example missing Team07 stacked worktree, missing local startup plan, memory/resource gate, overlapping Playwright run, auth/bootstrap failure, or incorrect reserved-file handoff
- `skipped command`: `cd frontend` then `npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1`
- `risk`: user-visible list/detail health state consistency, downgrade visibility, and language-safety evidence remain incomplete
- `next owner`: `Team 07` if implementation/spec gaps caused the block, `Team 00` if sequencing/startup/resource gating caused the block, then return to `Team 04` for rerun

UI smoke is required for this child because list/detail rendering is in scope. Do not replace it with a heading-only check or backend-only pass.

## Acceptance Criteria

Accept executable QA only if all of the following are true:

- implementation is stacked on accepted base commit `9fbc989`
- changed files match the exact reserved Today Review file set
- focused backend test passes
- backend build passes
- frontend build passes
- Today Review UI smoke passes, or a blocked smoke is recorded with the exact skipped-check policy and Team 00 accepts the residual risk explicitly
- health states stay within the approved eight-state set
- missing-rule-evidence downgrade and DQ hard-block behavior are proven fail-closed
- legacy rows remain readable
- list/detail consistency is proven for at least one same-candidate path per affected state family
- no target/R:R/advice leakage appears on touched surfaces

## Rejection Criteria

Reject the packet immediately and return it to Team 00 / Architect if implementation:

- runs from plain `dev` or any base that does not include accepted commit `9fbc989`
- edits any file outside the eight reserved Today Review files
- needs repository/controller/router/validation/index, route, schema, generated-file, package, shared utility, shared UI, or upstream module edits
- emits `HEALTHY`, `WEAKENING`, `RISK_WARNING`, `EXIT_TRIGGERED`, `INVALIDATED`, or `EXPIRED` without visible documented evidence basis
- allows blocked/missing/unsupported/stale-hard-blocked DQ to produce `HEALTHY`
- fabricates health proof from price movement alone, target geometry, Trade Plan compatibility fields, or synthetic target logic
- breaks legacy row readability or list/detail consistency
- introduces target/R:R/advice wording on touched surfaces

These are first-child rejection conditions, not soft warnings.

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- truthful implementation requires scope outside the reserved Today Review files
- Team 07 cannot stack cleanly on accepted base `9fbc989`
- upstream evidence is insufficient and the implementation attempts to compensate with invented heuristics
- UI smoke cannot be executed because startup or environment sequencing was not planned

## Evidence Required Later

- exact Team07 branch/worktree under review and proof it stacks on commit `9fbc989`
- changed-file list proving scope stayed within the reserved Today Review file set
- scenario evidence for `ACTIVE`, `HEALTHY`, `WEAKENING`, `RISK_WARNING`, `EXIT_TRIGGERED`, `INVALIDATED`, `EXPIRED`, and `BLOCKED`
- explicit scenario evidence for missing-rule-evidence downgrade
- explicit scenario evidence for DQ hard-block behavior
- explicit scenario evidence for legacy snapshot compatibility
- same-candidate list/detail consistency evidence
- focused backend test output
- backend build output
- frontend build output
- feature-local UI smoke output, or the exact skipped-check record if blocked
- language-scan result or equivalent explicit assertion evidence
- explicit note that no forbidden scope, no plain-`dev` base drift, and no target/R:R/advice leakage occurred

No executable QA was run in this planning pass.
