# Hard Constraints

- Use 100% free/open-source or already-local tools only.
- Do not add paid UI libraries, paid charting libraries, paid market-data providers, paid AI services, or paid testing services.
- The app and its verification flow must run locally without any paid service.
- Browser/UI tests must use local/free tooling. The current standard is Playwright under `frontend/tests/ui`.
- Browser/UI tests must be modular: keep module scenarios in module-named spec files and reusable setup/assertions under `frontend/tests/ui/support`.
- Do not put large bulk imports, provider syncs, or full-universe calculations into the regular UI smoke suite. Verify those manually in the browser and cover their non-bulk UI behavior with Playwright.
- Do not replace local UI smoke tests with paid hosted visual testing, paid cloud browsers, or SaaS monitoring unless explicitly approved.
