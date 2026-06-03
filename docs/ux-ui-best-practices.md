# UX/UI Best Practices

These guidelines apply across the application. They are intentionally product-level and reusable, not specific to one module.

## Page Structure

- Start with the user's primary job on the first screen.
- Split crowded operational screens into clear modes using tabs, sidebars, or sections.
- Keep high-frequency actions visible; move rare or diagnostic actions into secondary panels.
- Use the shared `PageHeader` for title, short subtitle, and right-aligned primary actions where practical.
- Keep scope and context visible near the top, especially market region, asset type, portfolio, watchlist, or selected entity.
- Do not duplicate global scope controls inside module tables. If a page is already governed by the global market header, show the active scope as read-only context and let the header own region/asset changes.
- Historical or persisted data pages should pass the global scope to list, coverage, generate, and lookup calls and show the scope in generated-data confirmations when the same date can exist for multiple markets.
- Header action groups must wrap within the page container. Long action labels should wrap or move to the next row rather than creating page-level horizontal overflow.

## Tables And Dense Data

- Default tables should show the fields needed for scanning and decision-making.
- Move low-frequency metadata, raw diagnostics, provider errors, and internal IDs into a row detail drawer or detail page.
- Row click should inspect the row when users are comparing data; use explicit buttons for navigation or destructive actions.
- Keep horizontal scrolling limited to the table container, not the whole page.
- Use shared `DataTable` behavior for pagination, sorting, loading, errors, and empty states where practical.

## Filters

- Keep the main filter bar compact.
- Prefer preset chips for common workflows such as "Needs validation", "Missing data", "F&O eligible", or "Recently updated".
- Put advanced or rarely used filters behind an advanced section, drawer, or saved view instead of always showing every possible field.
- Changing any filter must reset pagination to the first page.
- Reset should clear local filters but preserve global scope.
- Empty states should name the active filters and explain domain-specific zero-result cases.

## Batch Workflows

- Long-running workflows should be bounded on the backend and orchestrated by the frontend unless a worker/job system owns the workflow.
- When a bounded backend batch supports internal parallel workers, keep worker counts and provider-facing throttles server-owned unless they are a genuine expert-user decision for that page.
- Prefer module-owned config constants for operational batch size and worker counts when values are not true user decisions. Use names that include the module name, such as `signal_generation_engine_workers_count`, so each page can evolve independently.
- Show determinate progress when total count is known.
- Disable duplicate run buttons while the operation is active.
- Keep progress, warnings, and final summary in the same visual container as the action that started the work.
- After each batch or final completion, refresh the visible data if the operation changes what the user is looking at.
- Keep progress count labels semantically distinct. For example, do not roll missing prerequisites, skipped records, failed records, and "not yet evaluable" records into one generic skipped/unevaluated count.
- Data repair workflows should show the size of each repair queue before action and send bounded requests with visible `batchSize`/cursor semantics. For mutating queues, the UI should follow the backend cursor contract instead of advancing offsets over a queue that shrinks as rows are repaired. For stable source-list workflows such as manual metadata CSV import, the UI must persist and send the backend `nextOffset`, show progress, and offer a restart-from-zero action. A repair button should not imply the universe is fixed until the refreshed health metrics improve.
- Provider validation repair must show fresh unknown providers separately from retry-failed providers. The default validation button should validate only the `UNKNOWN_FIRST` queue; retry failures need a separate `Retry failed providers` action and warning treatment so a small retry-failed queue cannot hide or block a large unknown queue.
- Operational repair runs should show dry-run estimates before mutation and before/after evidence after mutation, including review-ready count, provider-supported count, metadata coverage, price-ready count, remaining blockers, exact next action, and whether dependent workflows remain blocked. A run is green only when `status=COMPLETED`, `anotherRunNeeded=false`, final universe trust is `OK`, and `universeSignoff.status=PASS`. A `PARTIAL`, `PARTIAL_BLOCKED`, or `PARTIAL_MANUAL_REQUIRED` run, a run with more requested batches, or a run that leaves trust/signoff failing should render warning/error treatment, not success styling.
- Repair summaries should distinguish updated rows from partial, no-op, skipped, failed, provider-not-found, retry-blocked, and manual-required rows. Do not use a green/success result when a batch only produced partial fills, no-ops, or manual follow-up.
- Market-data metadata repair should separate deterministic catalog identity repair, provider business metadata enrichment, and manual curated metadata import. A generic metadata button is not enough when each source has different trust, cursor, and fallback behavior. Provider-business repair results should render green only when rows were actually updated and fully resolved; partial, no-op, provider-not-found, retry-blocked, or manual-required batches are warnings/neutral states with visible remaining auto-repairable, retry-eligible, retry-blocked, and manual-required counts.
- Manual metadata UI should describe the fallback as business metadata when readiness requires sector, industry, and market cap. Do not label the primary manual workflow as sector/industry-only once market cap is required for resolution; helper text should say that sector, industry, and positive numeric market cap are required before a row can resolve. Provide an exportable manual metadata template for unresolved rows when bulk curation is expected.

## Status And Diagnostics

- Use status badges for scan-friendly state: healthy, stale, missing, unsupported, unknown, complete, partial.
- Do not hide missing or unknown data behind generic `N/A` when the user needs to understand why data is incomplete.
- Provide concise tooltips for unknown, unsupported, partial, or missing states.
- Distinguish source truth from provider support. Catalog presence does not guarantee provider history support.
- For market-data foundations, show catalog size separately from review-ready universe size. Provider unknowns, missing latest price, stale price, market-calendar uncertainty, inadequate history, missing volume, and missing sector/industry should be quantified as blockers; do not let a generic `PARTIAL` status imply the universe is usable.
- For market-data foundations, show Universe Signoff separately from operational run status. A completed repair run can still leave signoff failed; downstream-allowed messaging must remain negative until signoff passes.
- When a product workflow uses a trusted subset instead of full catalog health, label the subset explicitly. Show the strict full-catalog gate and the user-facing trusted review universe as separate panels, and state when missing metadata is a context gap instead of a hard blocker.
- Use the persisted market/instrument currency for money values. If the row lacks a currency, use a documented scope fallback such as `INR` for `IN` and `USD` otherwise. Do not hardcode `$` on scoped market pages.
- If persisted business math is stale or unreconciled, repair it on read when the source inputs are sufficient; otherwise clearly mark it as legacy invalid and withhold the stale metric. Do not keep showing unreconciled capital, return, readiness, or risk values because new records are now fixed.
- For geometry-sensitive workflows, warnings and blocker text must name the relationship that failed, such as a long-plan stop sitting inside the entry zone. A `VALID` status must not coexist with a visible hard geometry violation.
- Positive readiness/proof reason chips should render only when the item is actually ready and has no active hard blockers. If blockers exist, show blocker chips and keep proof facts in their own proof/snapshot section.
- If the same hard blocker appears in multiple API-owned diagnostic arrays, the page should render that blocker once in the visible blocker list while preserving the richer API contract for downstream consumers.
- Market breadth and context cards must label the denominator used for displayed percentages. A visible sample count of `0` must not sit beside non-zero breadth percentages unless the UI explicitly distinguishes the samples.
- Metadata buckets such as `Unknown` can be shown as missing-metadata diagnostics, but should not be ranked as leading/weak sectors or equivalent business entities.
- Deep-linked diagnostic pages must render their page shell immediately and settle into content, a domain-specific empty/insufficient-data state, or an actionable error with Retry. They must not remain indefinitely on a generic progress indicator.
- Daily shortlist pages should make the composed answer visible before diagnostics. Show candidate state, entry trigger context, exit condition, invalidation condition, proof, data quality, market alignment, and blocker reasons as the primary scan fields; keep raw signal counts as supporting evidence only.
- Daily shortlist pages that run in limited coverage mode must show review mode, review session, required data-through, stored data-through, trusted universe count, catalog count, coverage warnings, trusted membership load status, scan completeness, outside-trusted-universe exclusions, and scan funnel counts. Membership `LOAD_FAILED` must be shown as `NO_REVIEW` with the failure reason and zero candidates; configured partial scans must show scanned/skipped counts and ordering. Do not show an unexplained zero-candidate state when trusted instruments were scanned or when the trusted universe is unavailable.

## Forms And Actions

- Keep required fields obvious and optional diagnostics secondary.
- Prefer selectors/searchable pickers over raw ID entry.
- Use explicit labels for actions that fetch external/provider data, import catalog data, or run batch updates.
- Avoid dead-end disabled states; pair disabled actions with a clear setup hint or fallback path.
- CSV repair/import forms should show required columns and validate null-equivalent business values before submission. Values such as `Unknown`, `N/A`, `NA`, `None`, `Null`, or blank should remain diagnostics, not curated sector/industry metadata.

## Responsive Layout

- Filter bars and action panels must wrap inside the page container.
- Buttons must remain visible and clickable at smaller widths.
- Tables may scroll horizontally inside their own container.
- Avoid page-level horizontal overflow.

## UI Verification

- UI-facing changes must include repeatable smoke coverage when practical.
- Use the local Playwright suite in `frontend/tests/ui` for authenticated page-load, navigation, common error-state, filter/action, and route-regression checks.
- Add or update smoke cases for the exact user-visible issue fixed, especially broken routes, stale labels, overflowing controls, dead-end disabled actions, batch progress regressions, or missing primary headings.
- When a bug was reported against a persisted record or exact route, UI and browser validation must cover that same route/example after the fix. A newly generated happy-path record is not enough evidence.
- Smoke tests must exercise meaningful module behavior, not only headings. Assert critical buttons, filters, tabs, table columns, route targets, progress states, and domain-specific empty states.
- Data-bearing pages must either show scoped data or a clear explanation of why data is absent. Generic `No records found` is not enough when the absence could mean stale snapshots, missing provider support, neutral-only results, failed auth, or an unrun batch job.
- Do not rely only on backend/unit tests when the change affects visible UI behavior.
- Keep UI verification free and local. Do not add paid hosted browser testing, paid visual regression tools, or paid monitoring services.
- Organize UI tests by module, matching the source structure. Use one spec per feature/module in `frontend/tests/ui` and shared helpers in `frontend/tests/ui/support`; avoid one large all-modules spec file.
- Run authenticated smoke tests deterministically when they share the local test user. Use a single Playwright worker unless worker-isolated users/storage state are added. Keep protected-route navigation/auth setup in shared UI test helpers so module specs stay focused on module behavior.
- Verify real bulk data-load and calculation flows manually in the browser when their visible behavior changes. Keep the regular UI smoke suite focused on non-destructive coverage: controls, disabled/progress/summary states, request parameters, filter/range behavior, and empty states. Avoid running large catalog imports, full provider syncs, or full-universe calculations in every UI test run.

Required sequence for UI fixes:

1. Add or update the UI test that should catch the issue.
2. Run the UI test and confirm it fails or covers the target behavior.
3. Implement the UI/API fix.
4. Run relevant backend tests for changed backend behavior.
5. Rerun the UI test suite and confirm it passes.

## Product Language

- Use practical research-support language.
- Avoid financial advice wording such as "buy", "sell", "guaranteed", or "execute".
- Prefer terms such as "review candidate", "watch", "risk level", "provider support", and "data health".
- For Today Trade Review and other shortlist workflows, use product-safe states such as "long review candidate", "short review candidate", "exit-risk review", "watch only", "avoid", "blocked", "invalidation condition", "research review", and "research support".
- Preserve API enum or field names such as `TRADE_CANDIDATE` and `tradeCandidates` only where they are needed for diagnostics or developer-facing compatibility. User-facing Strategy Decision, Research Hub, and Trade Plan copy should describe these as review candidates.
