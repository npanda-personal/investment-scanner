# Hard Constraints

- This application is for personal/local usage first. Do not optimize toward paid SaaS infrastructure, enterprise deployment, or hosted services.
- Use 100% free/open-source or already-local tools only.
- Do not add paid UI libraries, paid charting libraries, paid market-data providers, paid AI services, or paid testing services.
- The app and its verification flow must run locally without any paid service.
- The Product Owner can change requirements, roadmap, module priorities, and acceptance criteria. Treat the latest Product Owner direction as authoritative over older planning docs, and update docs when requirements change.
- The Solution Architect can revise technical design for scalability, robustness, modularity, and maintainability, but must stay inside the personal/local-first and free/open-source constraints.
- Follow `docs/codex-agent-team-plan/sdlc-operating-model.md` for SDLC states, quality gates, evidence, decision records, release/rollback, data/security governance, blockers, technical debt, and retrospectives.
- Use `docs/codex-agent-team-plan/active-work-board.md` as the live tracker for current work state, owner, operating mode, reserved files, blockers, priority changes, and GitHub check-in evidence.
- Browser/UI tests must use local/free tooling. The current standard is Playwright under `frontend/tests/ui`.
- Browser/UI tests must be modular: keep module scenarios in module-named spec files and reusable setup/assertions under `frontend/tests/ui/support`.
- Do not put large bulk imports, provider syncs, or full-universe calculations into the regular UI smoke suite. Verify those manually in the browser and cover their non-bulk UI behavior with Playwright.
- Do not replace local UI smoke tests with paid hosted visual testing, paid cloud browsers, or SaaS monitoring.
