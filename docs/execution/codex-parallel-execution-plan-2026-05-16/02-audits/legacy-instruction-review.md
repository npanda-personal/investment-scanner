# Legacy Instruction Review

## Scope

`docs/AGENTS.md` is historically tracked but currently deleted from the working tree. It was not restored or modified during Sprint 0 artifact creation.

## Current Status

- Git-tracked path: `docs/AGENTS.md`
- Working-tree status: deleted
- Authority status: none
- Current rule: root `AGENTS.md` is the only authoritative AGENTS instruction file.

## Risk If Restored Unchanged

- Codex may load it as a nested instruction source.
- It may conflict with the root `AGENTS.md`.
- It may reintroduce old team/process assumptions.
- It may blur the distinction between historical guidance and active instructions.

## Useful Legacy Ideas To Preserve Elsewhere

Only if independently confirmed against root `AGENTS.md` and current repo state:

- Module-boundary discipline.
- Batch/progress UX standards.
- Data-bearing live validation expectations.
- Single-writer shared-file controls.
- Local/free tooling constraints.

## Recommendation

Replace with a pointer-only neutral file after Product Owner approval, or keep it deleted if the Product Owner decides the root `AGENTS.md` should be the only AGENTS file on disk.

No action was taken in Sprint 0.
