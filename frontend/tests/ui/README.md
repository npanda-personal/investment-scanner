# UI Smoke Test Structure

The UI suite mirrors the frontend feature/module layout.

- Put one spec file per touched module, for example `market-data-foundation.spec.ts`.
- Keep shared setup in `support/`, such as authenticated session fixtures and common page assertions.
- Add user-visible regression checks to the module spec that owns the workflow.
- Avoid creating a single catch-all smoke file as the suite grows.

Run from `frontend/`:

```bash
npm run test:ui
```

The suite uses local Playwright only. Do not add paid hosted browser or visual testing tools.

The configured smoke suite uses the shared `visitModule` helper for protected routes. It opens the target route first, lets the app redirect to login when needed, signs in with the local test user, and returns through the app's own route state. Keep this flow centralized so each module spec stays focused on module behavior.

The configured smoke suite runs with one worker. These tests share a local test account and exercise real authenticated routes, so deterministic sequential execution is preferred over faster but flaky parallel runs.

For UI-facing changes, use this loop:

1. Write or update the module-owned UI test for the changed workflow.
2. Run `npm run test:ui` and let failures expose real UI/API gaps.
3. Implement the fix.
4. Run the relevant backend tests when backend/API behavior changed.
5. Run `npm run test:ui` again after the fix.

When a regression still needs manual browser verification, use `frontend/tests/regression-todo.md` as the repeatable checklist. Record the browser evidence in the task summary and convert repeated manual checks into module-owned Playwright tests.

Bulk workflows such as catalog import, data-quality evaluation, signal generation, signal quality recalculation, strategy evaluation, and smart-money refresh should not run real full-universe/provider-heavy jobs inside the regular smoke suite. In Playwright, stub the bulk POST and assert the visible controls, request payload, disabled/progress/final states, and domain-specific empty states. When the visible behavior of the real bulk job changes, verify that actual run manually in the browser and record the result in the final task summary.

Every data-bearing smoke test should prove one of two outcomes: scoped data is visible, or a domain-specific empty state explains why data is absent and what action can refresh or fix it. Avoid generic heading-only checks and generic `No records found` assertions.
