# docs/AGENTS.md Neutralization Proposal

## Current Status

- `docs/AGENTS.md` is tracked historically by git.
- It is currently deleted in the working tree.
- It was not restored or modified during Sprint 0 artifact creation.
- Root `AGENTS.md` is the only authoritative AGENTS instruction file.

## Problem

If `docs/AGENTS.md` is restored unchanged, Codex may treat it as a nested instruction file. That creates a risk of conflicting authority, stale operating rules, and accidental reuse of old planning assumptions.

## Options

### Option A: Keep Deleted

Use root `AGENTS.md` as the only AGENTS instruction file.

- Pros: simplest authority model.
- Cons: historical guidance is less discoverable.
- Requires: Product Owner approval before staging deletion.

### Option B: Replace With Pointer-Only File

Replace `docs/AGENTS.md` with a short file that says it is not authoritative and points to root `AGENTS.md`.

- Pros: prevents accidental nested-instruction drift while keeping a visible pointer.
- Cons: still leaves a nested AGENTS filename present.
- Requires: Product Owner approval.

### Option C: Archive Under Historical Docs

Move old content to a non-AGENTS historical name.

- Pros: preserves history without nested instruction loading risk.
- Cons: requires careful source-control handling.
- Requires: Product Owner approval.

## Recommendation

Choose Option B if a visible pointer is useful. Choose Option A if the Product Owner wants the cleanest instruction model.

Do not restore or modify `docs/AGENTS.md` until explicitly approved.
