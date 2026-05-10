# UX/UI Best Practices

These guidelines apply across the application. They are intentionally product-level and reusable, not specific to one module.

## Page Structure

- Start with the user's primary job on the first screen.
- Split crowded operational screens into clear modes using tabs, sidebars, or sections.
- Keep high-frequency actions visible; move rare or diagnostic actions into secondary panels.
- Use the shared `PageHeader` for title, short subtitle, and right-aligned primary actions where practical.
- Keep scope and context visible near the top, especially market region, asset type, portfolio, watchlist, or selected entity.
- Do not duplicate global scope controls inside module tables. If a page is already governed by the global market header, show the active scope as read-only context and let the header own region/asset changes.
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

## Status And Diagnostics

- Use status badges for scan-friendly state: healthy, stale, missing, unsupported, unknown, complete, partial.
- Do not hide missing or unknown data behind generic `N/A` when the user needs to understand why data is incomplete.
- Provide concise tooltips for unknown, unsupported, partial, or missing states.
- Distinguish source truth from provider support. Catalog presence does not guarantee provider history support.

## Forms And Actions

- Keep required fields obvious and optional diagnostics secondary.
- Prefer selectors/searchable pickers over raw ID entry.
- Use explicit labels for actions that fetch external/provider data, import catalog data, or run batch updates.
- Avoid dead-end disabled states; pair disabled actions with a clear setup hint or fallback path.

## Responsive Layout

- Filter bars and action panels must wrap inside the page container.
- Buttons must remain visible and clickable at smaller widths.
- Tables may scroll horizontally inside their own container.
- Avoid page-level horizontal overflow.

## UI Verification

- UI-facing changes must include repeatable smoke coverage when practical.
- Use the local Playwright suite in `frontend/tests/ui` for authenticated page-load, navigation, common error-state, filter/action, and route-regression checks.
- Add or update smoke cases for the exact user-visible issue fixed, especially broken routes, stale labels, overflowing controls, dead-end disabled actions, batch progress regressions, or missing primary headings.
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
- Prefer terms such as "candidate", "review", "watch", "risk level", "provider support", and "data health".
