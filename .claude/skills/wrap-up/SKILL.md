---
name: wrap-up
description: The Post-Work Protocol - run after any source-code change, before declaring work done (the Stop hook enforces this). Scoped QA pass, snapshot re-materialization when relevant, cleanup of spawned processes, and a Done Report with proof.
---

# Wrap Up (Post-Work Protocol)

Run this after source-code changes, before ending the turn. It satisfies the `.claude/.pending-wrapup` Stop-hook gate.

## Steps

1. **Scoped QA pass, looped until clean** — follow `/qa-pass`, scoping jest/playwright to the modules actually touched (`git status` tells you). Full gates for cross-cutting changes. If any gate fails: fix the issue, re-run the failed gates, and repeat until QA passes with NO new issues. "Done" exists only after a fully clean pass — never report done with known red gates.
2. **Snapshot re-materialization (conditional)** — if anything snapshot-producing changed (snapshot-assembler, earnings/sector/market/stock-interest intelligence, market scans, signal text generation), follow `/refresh-snapshots` for a narrow scope (one symbol) and prove the fix surfaces. Skip with a stated reason if nothing snapshot-related changed.
3. **Process cleanup** — find processes spawned during this session: check listeners with `Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 5181,5182,5183 }` and any background shells/dev instances you started beyond the defaults. Stop ONLY what you spawned. **NEVER stop**: backend 3000, frontend 5173, Docker services — those stay up (standing owner instruction).
4. **Done Report** — final message must contain:
   - What changed (files + one-line why each, or grouped pattern)
   - QA table from step 1 (real command results)
   - Proof the change works (test output, endpoint response, or refreshed-snapshot evidence — not "should work")
   - Anything skipped, with the reason
   - Items pending (in-scope but unfinished, with blocker)
   - Backlog candidates: next-priority items discovered during the work but out of scope — the owner prioritizes these

If the session made *no* source changes (docs/config only), steps 1–2 reduce to whatever validates the actual change (e.g. JSON parses, links resolve) — say so explicitly.
