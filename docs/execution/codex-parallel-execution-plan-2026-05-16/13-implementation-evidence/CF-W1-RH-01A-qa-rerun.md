# CF-W1-RH-01A QA Rerun

Date: 2026-05-26
Owner: Team 04 - QA Factory
Work item: `CF-W1-RH-01A - Research Hub actionability evidence-date wiring`
Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-RH-01A`
Branch: `codex/team08-research/CF-W1-RH-01A`
Verdict: `ACCEPT`
Next gate: Code review / lead validation

## Scope Status

Allowed changed application files remained bounded to the reserved five-file packet:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

Observed reporting-doc delta stayed inside active execution docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-01A-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-RH-01A-qa-verification-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W1-RH-01A-implementation-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-RH-01A-developer-handoff.md`

Forbidden scope audit: no diff entries under route registries, API/client/type contracts, shared UI, shared backend utilities, upstream modules, Prisma/schema/migrations/generated files, package manifests, `frontend/src/app/HomePage.tsx`, `frontend/src/features/daily-overview-dashboard/**`, or `backend/src/modules/signal-position-ledger/**`.

Playwright generated output was created only for the required rerun command and then removed after verification so it did not remain in the worktree delta.

## QA Findings

### 1. Deterministic auth bootstrap works and no real login is required

Verified in `frontend/tests/ui/research-hub.spec.ts`:

- `mockAuthenticatedUser(page)` seeds `investment_scanner_auth_token` and mocks `**/api/v1/auth/me` and `**/api/v1/auth/logout` at lines 4-21.
- The Playwright rerun passed 2/2 against the Research Hub worktree Vite server at `http://127.0.0.1:5175`.
- The previous auth-bootstrap blocker did not recur. The tests reached and passed the Research Hub assertions without a real login flow.

### 2. Evidence date renders only when present

Verified in source and runtime:

- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` renders the evidence-date line only when `dimension.evidenceDate` is truthy at lines 234-236.
- `frontend/tests/ui/research-hub.spec.ts` asserts the specific visible date string and asserts only one `Evidence date:` line is rendered at lines 152-153.
- The UI rerun passed those assertions against the worktree Vite server, proving the visible-date path for `marketEnvironment` and null suppression for the remaining mocked dimensions.

### 3. Conservative states do not upgrade to READY from date presence alone

Verified in service wiring and focused backend tests:

- `backend/src/modules/research-hub/research-hub.service.ts` wires only dimension-specific truthful dates at lines 167-170.
- `dataReadiness` and `strategyProof` remain `evidenceDate: null` at lines 323-378.
- `unstableDimension(...)` accepts the existing conservative status and applies the optional date without promoting readiness at lines 383-397.
- Focused backend tests passed 10/10, covering truthful-date mapping, null preservation, and conservative-state behavior.

### 4. Original RH acceptance criteria remain satisfied

Verified by command suite and assertions:

- backend build passed
- focused backend Research Hub tests passed
- frontend build passed
- Research Hub UI smoke passed 2/2 against this worktree server
- scoped request assertion still proved `region=IN` and `assetType=STOCK` in `frontend/tests/ui/research-hub.spec.ts` line 165

### 5. Language guard remained clean

Command reviewed only false positives:

- `border*` style tokens in `ResearchOverviewPage.tsx`
- `automationEligibility` fixture/test text in `research-hub.service.test.ts`
- an existing negative regex assertion guarding against forbidden wording in `research-hub.service.test.ts`

No new advice-like, target-like, broker, order, execution, or reward/risk wording was introduced in the changed packet.

## Validation Run

Memory guard:

```powershell
Get-Counter '\Memory\% Committed Bytes In Use'
```

Result: `69.78%` before build/test/server work.

Commands run:

```powershell
cd backend
npm.cmd run build
```

Result: PASS

```powershell
cd backend
npm.cmd test -- research-hub --runInBand
```

Result: PASS (`1` suite, `10` tests)

```powershell
cd frontend
npm.cmd run build
```

Result: PASS

Worktree Vite runtime used for Playwright:

```powershell
cd frontend
npm.cmd run dev -- --host 127.0.0.1
```

Runtime result: worktree Vite server started on `http://127.0.0.1:5175` after `5173` and `5174` were already occupied.

```powershell
cd frontend
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5175'
npm.cmd run test:ui -- research-hub.spec.ts --workers=1 --output=test-results-team04-rh-rerun
```

Result: PASS (`2` passed)

Language guard:

```powershell
rg -n "buy now|sell now|must buy|must sell|price target|profit target|reward/risk|risk:reward|R:R|guaranteed|broker|order|execute|automation" backend/src/modules/research-hub backend/tests/modules/research-hub frontend/src/features/research-hub frontend/tests/ui/research-hub.spec.ts
```

Result: reviewed false positives only; no forbidden user-facing wording introduced.

## Risks / Assumptions / Notes

- Assumption: the truthful upstream/public date fields consumed by Research Hub remain stable as currently exposed.
- Residual risk: the backend Jest run logs expected negative-path `console.error` output from mocked failure scenarios; the suite still passed and this does not indicate a packet defect.
- Note: sandboxed Playwright/Vite worker spawning required escalated local execution for the rerun, but the validated target remained localhost-only and bound to this exact worktree.

## QA Recommendation

`ACCEPT`

The original Research Hub acceptance criteria and evidence-date behavior were verified on the correct worktree runtime. Deterministic auth bootstrap removed the real-login blocker, evidence dates render only when present, null dates stay suppressed, and conservative actionability states were not upgraded to `READY`.
