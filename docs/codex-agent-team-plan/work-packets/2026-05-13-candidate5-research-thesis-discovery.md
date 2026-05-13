# Candidate 5 Discovery - Research Thesis And Evidence Checklist

Date: 2026-05-13  
Mode: Discovery only  
Owner: Lane 3 Developer Agent  
Roadmap source: `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-13.md#candidate-5---research-thesis-and-evidence-checklist`

## Scope Reviewed

- `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-13.md`
- `docs/codex-agent-team-plan/codex-agent-team.md`
- `docs/codex-agent-team-plan/team-operating-model.md`
- `docs/codex-agent-team-plan/active-work-board.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/module-verification-register.md`
- `backend/src/modules/research-hub/*`
- `backend/src/modules/stock-research-workbench/*`
- `backend/src/modules/today-trade-review/*`
- `backend/src/modules/watchlist-management/*`
- `backend/src/modules/portfolio-management/*`
- matching frontend feature surfaces where relevant

No source, tests, active board, QA evidence, architecture contracts, or existing work packets were edited.

## Product Read

Candidate 5 asks for a local/private way to document:

- bull case
- bear case / counter-evidence
- invalidation
- catalyst
- evidence checklist
- decision reason
- review status such as watch, active research, invalidated, deferred, or archived

The workflow should turn candidate discovery into disciplined research capture. It must not imply execution, advice, broker workflow, or order placement.

## Likely Owning Module

Recommended owner: `stock-research-workbench`.

Reasoning:

- `stock-research-workbench` already exists and owns the investor-facing per-stock research workflow at `/research/stocks/:id`.
- Its backend route is already mounted under `/api/v1/research/stocks/:instrumentId/*`.
- It already aggregates stock overview, price history, performance, fundamentals, valuation, peers, corporate actions, signals, strategy decision widgets, watchlist CTA, and alert CTA.
- Thesis capture is instrument-centered first. Research Hub, Today Review, Watchlists, and Portfolio can link into the stock-level thesis later.

Secondary consumer: `research-hub`.

- Research Hub should eventually surface thesis status for top review candidates and next actions, but it should not own note persistence.

Deferred link consumers:

- `today-trade-review`: link candidate detail to an existing thesis or prefill a new thesis after candidate-level explainability stabilizes.
- `watchlist-management`: show thesis status beside tracked instruments after the first stock-level slice exists.
- `portfolio-management`: show thesis status for holdings later, without turning thesis status into transaction guidance.

## New Module Needed?

No new module is recommended for the first slice.

`stock-research-workbench` is a better boundary than a new `research-thesis` module because the first useful workflow is stock-local thesis capture. A separate module may become worthwhile later only if thesis notes evolve into cross-object notebooks, versioned research journals, attachment management, or reusable evidence templates across instruments, candidates, watchlists, and portfolios.

## Dependencies On Current Top 5

Hard or strong dependencies:

- Brief 4 / WP-04A actionability: thesis checklist should use the same conservative status vocabulary and must not treat market health as setup readiness.
- Brief 5 trade-plan paper-readiness proof chain: thesis evidence checklist should reference stable paper-readiness labels only after they settle.

Useful dependencies:

- Brief 1 review-universe readiness: checklist can reference whether the stock is in a trusted review universe.
- Brief 2 signal evidence usability: checklist can reference `USABLE`, `LIMITED`, or `UNAVAILABLE` signal evidence rather than raw score alone.
- Brief 3 calibration readiness: checklist can reference whether calibrated evidence should influence research.

Sequencing recommendation:

- First implementation can proceed after WP-04A and before full Today Review/Watchlist/Portfolio integration if it keeps checklist evidence read-only, conservative, and scoped to Stock Research Workbench.
- Links from Today Review should wait for Candidate 4 or stable Today Review candidate explainability fields.
- Trade-plan readiness checklist rows should wait for Brief 5 output stability or be displayed as `Not wired yet`.

## Proposed First Vertical Slice

Build an authenticated, user-owned stock thesis panel inside Stock Research Workbench.

Backend:

- Add a `ResearchThesis` persistence model keyed by authenticated `userId` and `instrumentId`.
- Support one active thesis per user/instrument for the first slice.
- Store structured thesis fields:
  - `status`: `WATCH`, `ACTIVE_RESEARCH`, `INVALIDATED`, `DEFERRED`, `ARCHIVED`
  - `bullCase`
  - `bearCase`
  - `invalidation`
  - `catalyst`
  - `decisionReason`
  - `checklist`
  - optional evidence snapshot metadata
- Add stock-scoped thesis endpoints under the existing module route:
  - `GET /api/v1/research/stocks/:instrumentId/thesis`
  - `PUT /api/v1/research/stocks/:instrumentId/thesis`
  - optional `PATCH /api/v1/research/stocks/:instrumentId/thesis/status`
- Protect thesis endpoints with `requireAuth`. Existing public workbench endpoints do not need to change in the first slice.

Frontend:

- Add a "Research Thesis" panel to `/research/stocks/:id`.
- Include editable fields for bull case, bear case, invalidation, catalyst, decision reason, and status.
- Include an evidence checklist section with current-state rows such as data readiness, signal evidence, calibration readiness, strategy proof, and trade-plan readiness.
- For rows whose upstream contract is not stable, display conservative `Not wired yet`, `Limited`, or `Insufficient Data` wording.
- Use save/update interactions only. Do not add advice, execution, broker, or order language.

Verification:

- Backend tests for user ownership, create/update/get, validation, and status transitions.
- Frontend build.
- UI smoke for authenticated page load, thesis fields, save path, and research-only language.
- Authenticated local-data check showing one instrument thesis persists for `codex.po@example.com` or the future accepted test persona without exposing another user's notes.

## Exact Future Write Reservations

Small first implementation packet:

- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.router.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.validation.test.ts`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

Schema/shared reservations that require Architect and Orchestrator ownership:

- `backend/prisma/schema.prisma`
- generated Prisma client artifacts, if generated files are part of the accepted project workflow

Optional only if the implementation creates a separate child component:

- `frontend/src/features/stock-research-workbench/components/ResearchThesisPanel.tsx`

Do not reserve for the first slice:

- `backend/src/modules/research-hub/*`
- `frontend/src/features/research-hub/*`
- `backend/src/modules/today-trade-review/*`
- `frontend/src/features/today-trade-review/*`
- `backend/src/modules/watchlist-management/*`
- `frontend/src/features/watchlist-management/*`
- `backend/src/modules/portfolio-management/*`
- `frontend/src/features/portfolio-management/*`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/NavigationLayout.tsx`
- `backend/src/api/routes.ts`
- shared frontend/backend folders

Later integration packets can reserve Research Hub, Today Review, Watchlist, and Portfolio files after the stock-level thesis contract is stable.

## Risks

- User ownership/privacy: thesis notes must be private to the authenticated user. Existing stock workbench endpoints are not auth-protected, so thesis subroutes need explicit auth without changing unrelated public read endpoints unintentionally.
- Schema churn: a new Prisma model is likely required. This needs Architect review and Orchestrator reservation.
- Evidence snapshot semantics: storing live evidence snapshots can become stale. First slice should either store lightweight snapshot metadata with timestamps or keep checklist rows live/read-only and clearly dated.
- Cross-module temptation: adding links from Today Review, Watchlists, Portfolio, and Research Hub in the first pass would create broad write conflicts and couple the feature to unsettled current Top 5 outputs.
- Terminology risk: thesis status must not be confused with trade readiness. Use `active research`, `watch`, `deferred`, `invalidated`, and `archived`, not buy/sell/execute language.
- Checklist reliability: signal quality, calibration, and trade-plan readiness labels are still settling. Missing evidence must remain `LIMITED`, `INSUFFICIENT_DATA`, or `Not wired yet`.
- Auth test data: future PO acceptance persona is `codex.po@example.com`, but the local password must not be recorded in docs or evidence.

## Recommended Architecture Questions

1. Should thesis persistence be one active thesis per `userId + instrumentId`, or should users be able to keep historical thesis versions?
2. Should checklist items be stored as JSON for flexibility, or normalized rows for query/filter support?
3. Should the first slice store evidence snapshots at save time, render live evidence only, or support both with explicit timestamps?
4. Should thesis endpoints be the first auth-protected routes inside `stock-research-workbench`, while existing read-only stock research endpoints remain public?
5. Should thesis notes link to a Today Review candidate, watchlist item, or portfolio holding in v1, or should those links be deferred until each consumer has stable contracts?
6. Which status vocabulary should PO approve: `WATCH`, `ACTIVE_RESEARCH`, `INVALIDATED`, `DEFERRED`, `ARCHIVED`, or an Architect-approved equivalent?
7. Is `ResearchThesis` allowed to reference nullable legacy user ownership during migration, or must every thesis require a real `AppUser`?
8. What is the retention/deletion policy when an instrument, watchlist item, portfolio holding, or user is deleted?
9. Should thesis checklist templates be fixed in code for v1, or user-editable later?
10. Should Research Hub surface a thesis count/status in a later packet, and if so should that use a Stock Research Workbench summary endpoint instead of direct repository access?

## Recommended Next Step

Ask Architect to produce a narrow architecture contract for a Stock Research Workbench-owned `ResearchThesis` model and authenticated thesis subroutes. The first work packet should reserve only Stock Research Workbench backend/frontend/tests/docs plus the Prisma schema, and should defer Research Hub, Today Review, Watchlist, and Portfolio integration until the thesis API is stable.
