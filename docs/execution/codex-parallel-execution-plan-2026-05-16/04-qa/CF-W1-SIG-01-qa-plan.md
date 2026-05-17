# CF-W1-SIG-01 QA Plan

Date: 2026-05-17

Status: Draft QA plan. Not approved to run.

## Test Scope

Focused backend tests only:

```text
cd backend
npm test -- signal-generation-engine
```

or narrower file patterns after implementation.

## Required Coverage

- Default trusted run blocks missing DQ.
- DQ filter unavailable blocks trusted generation.
- `LIMITED` does not become trusted output.
- `NOT_READY`, `UNUSABLE`, stale, manual-required, unsupported, and missing-evaluation instruments are excluded.
- Research-only/non-filtered behavior is explicitly marked untrusted if preserved.
- Existing strict DQ invariant test still passes.
- No target-price fields or advice language introduced.
- No Angel One, live provider, startup, frontend, Prisma, route, shared utility, or package changes.

## Stop Conditions

- Test requires live provider.
- Test requires source outside approved module files.
- DQ policy ambiguity remains.
- Existing accepted invariant tests regress.
- Source changes require schema, route, shared utility, package, startup, or provider edits.

