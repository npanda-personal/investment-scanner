You are working inside my existing full-stack TypeScript project.

Goal:
Refactor this project into a modular monolith architecture where each module is independently organized and changes in one module are unlikely to break another.

Context:
The project has:
- Backend: Node.js / Express / TypeScript / Prisma
- Frontend: React / Vite / TypeScript
- Features: auth, users, stocks, market data, scanner, real-time scanner, backtester, watchlists, smart money, portfolio, alerts

Tasks:
1. Analyze the current folder structure.
2. Identify all dependent files before moving code, including routes, services, tests, workers, queues, frontend imports, docs, and compatibility shims.
3. Propose and then implement a module-based structure.
4. Move backend code into `backend/src/modules/{module-name}`.
5. Each backend module should contain:
   - `{module}.module.ts`
   - `{module}.router.ts`
   - `{module}.controller.ts`
   - `{module}.service.ts`
   - `{module}.repository.ts`
   - `{module}.validation.ts`
   - `{module}.types.ts`
   - `index.ts`
6. Backend module files should be flat in `backend/src/modules/{module-name}` by default. Do not create nested `routes/`, `services/`, `repositories/`, `types/`, `validation/`, `providers/`, `queue/`, or `workers/` folders unless the user explicitly asks for that structure or the module is genuinely too large and the exception is documented.
7. Move shared backend code into:
   - `backend/src/shared`
   - `backend/src/config`
8. Move frontend feature code into:
   - `frontend/src/features/{feature-name}`
9. Each frontend feature should contain:
   - `api/`
   - `components/`
   - `hooks/`
   - `types.ts`
   - `routes.tsx`
   - `index.ts`
10. Remove or reorganize duplicate service files, compatibility exports, empty legacy directories, and old feature aliases once callers have been migrated.
11. Keep public module exports limited to `index.ts`.
12. Do not change business logic unless required for imports to work.
13. Update all broken imports.
14. Keep API behavior unchanged.
15. Do not delete working code unless it is clearly duplicated or unused.
16. After changes, run typecheck/tests/build if available.
17. Provide a summary of:
   - files moved
   - files removed
   - imports updated
   - modules created
   - any files that need manual review

Architecture rules:
- Controllers call services.
- Services call repositories.
- Repositories call Prisma.
- Modules must not import another module's repository directly.
- Cross-module access must happen through public services exported from that module's `index.ts`.
- Backend callers outside a module should import from `backend/src/modules/{module-name}` only, not from the module's internal controller/service/repository/provider paths.
- Frontend callers outside a feature should import from `frontend/src/features/{feature-name}` only, not from the feature's internal `api/`, `components/`, or `types.ts` paths.
- Avoid long-lived compatibility shims such as `frontend/src/services/{feature}Service.ts`, old `frontend/src/features/{old-name}`, `backend/src/api/{old-route}`, `backend/src/workers`, or `backend/src/queue` when the code now belongs to a module.
- Preserve legacy API URLs by mounting module routers directly in the app-level route registry when needed. Do not keep old route files just to preserve URL behavior.
- Shared utilities should go in `shared`, not inside feature modules.
- Keep frontend shared UI components in `frontend/src/shared/components`.
- Keep frontend feature-specific components inside their own feature folder.
- Feature-owned DTOs/types should live in the feature/module `types.ts` file and be re-exported from `index.ts`.
- Module-owned workers, queues, and external providers should live inside the owning backend module if they are not shared by multiple modules.
- Module-owned workers, queues, and external providers should use flat filenames such as `{module}.worker.ts`, `{module}.queue.ts`, and `{module}.provider.ts` when they are part of a backend module.
- If another module needs market data or another feature's behavior, consume the owning module's public service or provider export via `index.ts`; never reach into its repository.

Important:
Make small, safe changes in stages.
Do not rewrite the entire app at once.
Preserve existing functionality.
Prefer moving files and fixing imports over rewriting logic.
After deleting duplicate files, search for stale imports and verify deleted paths no longer exist.
If removing empty directories fails due to filesystem permissions, retry only after verifying the exact paths are obsolete and empty.
Keep documentation in sync with the final module shape, especially when compatibility shims are removed.
