# Test-First QA Gate Policy

Date: 2026-05-29

## Purpose

All new application-code changes must follow a test-first gate. Test cases are designed by the QA Factory before implementation starts.

This policy applies to bug fixes, review-comment fixes, refactors, UX-visible changes, backend behavior changes, pipeline changes, strategy/rule changes, and cross-module integration changes.

## Ownership

- Team 04 owns test-case design.
- Implementation teams may not self-author the primary acceptance test plan.
- Implementation teams may add implementation-adjacent unit tests only after Team 04 has defined the expected behavior and regression matrix.
- Team 00 owns enforcement during Ready promotion and file reservation.
- Team 10 verifies that the implementation satisfies the QA-authored tests and does not replace them with weaker coverage.

## Required Flow

1. Requirement or review finding is recorded.
2. Team 04 creates or updates the QA test plan before dev starts.
3. The QA plan names:
   - expected failing behavior,
   - exact test files to add or update,
   - test intent,
   - focused commands,
   - data fixtures or mocks,
   - acceptance assertions,
   - regression risks.
4. Team 00 promotes the item to Ready only after the QA test plan exists.
5. The implementation team writes or updates the QA-specified tests first.
6. The implementation team runs the focused tests and records the initial failing evidence when practical.
7. Production code changes start only after the failing test evidence exists, unless Team 04 explicitly marks the case as compile-time/type-only or impossible to fail before code changes.
8. Final handoff must include:
   - QA-authored test plan reference,
   - failing-test evidence or approved exception,
   - passing focused tests,
   - build/typecheck where relevant,
   - changed test files,
   - changed production files.

## Ready Promotion Rule

An implementation item is not Ready when it lacks a QA-authored test plan.

Team 00 must keep the item in refinement or QA-prep if:

- no QA plan exists,
- test ownership is unclear,
- acceptance assertions are too vague,
- tests would require forbidden scope,
- fixtures or data setup are unsafe,
- QA has not accepted the test-first plan.

## Exceptions

Exceptions are allowed only when Team 04 records why a pre-dev failing test is not practical. Acceptable exceptions include:

- docs-only changes,
- pure comment updates,
- test harness repair where the harness itself cannot compile,
- type-only changes where the failing evidence is `tsc`,
- emergency revert or rollback under Team 00 control.

The exception must be written into the QA plan and implementation handoff.

## Review-Comment Fixes

For review comments, QA must convert each accepted finding into one of:

- a failing regression test,
- a focused static/type assertion,
- a documented non-testable risk with manual verification steps,
- a follow-up requirement if the finding exceeds current scope.

Developers must not skip directly to production fixes for review comments.

## Parallel Work

QA planning may run in parallel with architecture and requirement refinement. Implementation may run in parallel only after each item has its own QA-authored test plan and isolated file reservations.
