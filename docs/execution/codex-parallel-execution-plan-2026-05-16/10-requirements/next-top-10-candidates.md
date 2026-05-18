# Next Top 10 Candidates

Date: 2026-05-18

Prepared by Team 02 Requirement Factory for the next direct-value requirement/ranking refresh after rechecking the live runtime queue, Ready queue, blocked queues, and recent Team 00 / Team 03 / Team 04 / Team 06 outboxes.

## Product Owner Priority Filter Still Applies

- keep direct investor/trader value first: market data reliability, Data Quality, signals, strategy trust, calibration, backtesting, historical context, market context, trade-plan research support, research evidence, reviewability, and explainability;
- keep admin/settings/auth/subscription/notification convenience low unless it blocks correctness, privacy, or user-data safety;
- treat alert work as lower priority unless it improves evidence quality or reviewability rather than inbox convenience.

## Dispatch Filter Refresh

The prior ranking became stale during the 2026-05-18 runtime cycle. Team 00 should exclude the following from the next unassigned pull:

- `CF-W1-BT-01A` is no longer unassigned. `12-ready-queue/ready-for-implementation.md` and `00-control/team-agent-runtime-queue.md` both show it promoted, stacked on accepted parked `CF-W1-BT-02`, and active in a Team 06 worktree.
- `CF-W1-STRAT-02B` is no longer the next unassigned requirement. Team 03 finished the proposal packet, Team 04 accepted the proposal QA review, and the packet is now explicitly blocked behind future consent-gated children `CF-W1-STRAT-02B1` and `CF-W1-STRAT-02B2`.
- `CF-W1-SQLAB-02A` already has Team 03 architecture and Team 04 QA planning. It is a sequencing decision for Team 00 after `CF-W1-SQLAB-01` clears shared `signal-quality-lab` files, not a fresh Team 02 discovery gap.
- `CF-W1-RH-01` already has Team 03 architecture and Team 04 QA planning and is a Team 00 Ready-evaluation candidate, not a new Team 02 requirement gap.
- `CF-W1-L3-TREV-02` already has Team 03 architecture and Team 04 QA planning and is a Team 00 Ready-evaluation candidate when the Today Review writer lane is safe.

## Next Unassigned Direct-Value Requirement

`CF-W1-STRAT-03` is now the next unassigned direct-value requirement.

Why it moves to the top:

- it closes a live reviewability gap in `strategy-decision-engine`, which is already a direct decision/research surface;
- it is still unassigned to Team 03/04 and does not depend on reopening any already-accepted packet;
- it is additive, decision-math-neutral, and likely backend-local in the first child;
- it improves explainability for downstream Research Hub, Today Review, and trade-plan review surfaces without requiring shared UI or schema work in the first pass.

## Re-Prioritized Top 10

| Rank | ID | Current state | Why it matters now | Next Team 00 action | Team 03 / 04 routing? | Parallel-safety note |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `CF-W1-STRAT-03` | Requirement exists; no Team 03 architecture packet yet | Makes Strategy Decision provenance explicit for framework-backed, legacy-fallback, and read-path-created rows; improves direct review trust with low first-child blast radius | Route to Team 03 for architecture/contract/work-packet prep | Yes: Team 03 now, then Team 04 QA planning | Safe now; distinct module from active Team 06 backtesting work |
| 2 | `CF-W1-RH-01` | Team 03 architecture ready; Team 04 QA plan ready | Replaces Research Hub actionability placeholders with source-backed evidence from stable upstream public outputs | Team 00 Ready evaluation for one bounded backend-only Research Hub child | No new Team 03/04 pass needed before Ready evaluation | Safe if implemented alone; do not widen into `RH-02A` in the same writer pass |
| 3 | `CF-W1-L3-TREV-02` | Team 03 architecture ready; Team 04 QA plan ready | Makes Today Review candidate detail auditable with publication-time provenance and compatibility labels | Team 00 Ready evaluation when Today Review writer sequencing is safe | No new Team 03/04 pass needed before Ready evaluation | Safe only if not parallelized with `CF-W1-L3-TREV-01` |
| 4 | `CF-W1-SQLAB-02A` | Team 03 architecture ready; Team 04 QA plan ready; sequencing-blocked | Adds bounded no-schema journal-preview learning value after measured signal outcomes | Team 00 sequencing decision after `CF-W1-SQLAB-01` clears shared files, then Ready evaluation | No new Team 03/04 pass needed unless packet changes | Not parallel-safe with `CF-W1-SQLAB-01`; safe after that gate clears |
| 5 | `CF-W1-STRAT-02B1` | Future child only; proposal packet says consent gate required | Durable strategy-definition history remains a real trust gap for old signals/backtests/reviews | Keep blocked until explicit schema/migration/generated/repository consent is granted | Later Team 03/04 only after consent | Not implementation-safe yet |
| 6 | `CF-W1-RH-02A` | Team 03 architecture ready; Team 04 QA plan ready | Fails Research Hub delta claims closed when no valid comparison basis exists | Sequence behind `CF-W1-RH-01` or intentionally combine into one Research Hub writer pass | No immediate Team 03/04 work needed | Must not run in parallel with `CF-W1-RH-01` |
| 7 | `CF-W1-L3-INTEL-03` | Requirement only | Adds explainable concentration review to portfolio intelligence once upstream trust layers are stronger | Keep in backlog; prep after current strategy/research review tranche | Later Team 03/04 | Safe later; lower immediate value than current review-evidence items |
| 8 | `CF-W1-L3-WATCH-01` | Requirement and QA prep exist | Improves watchlist review priority with deterministic reason summaries | Keep below upstream trust and review-evidence items | No immediate routing change | Safe if kept separate from `L3-PORT-01B` |
| 9 | `CF-W1-L3-INTEL-02` | Requirement and architecture packet exist | Improves portfolio review traceability after accepted readiness DTO groundwork | Keep behind concentration/research provenance items | No immediate routing change | Shares portfolio-intelligence files with other Lane 3 intelligence follow-ons |
| 10 | `CF-W1-L3-ALERT-03` | Requirement and architecture packet exist | Adds post-trigger follow-through traceability, but remains below direct core evidence surfaces | Keep behind current trust/review stack and active alert-file work | No immediate routing change | Must stay sequenced behind active alert-module writers |

## Top Parallel-Safe Candidates For Team 00 Now

These are the clearest next moves that do not collide with the currently active Team 06 `CF-W1-BT-01A` writer set and stay aligned with the Product Owner's direct-value order:

1. `CF-W1-STRAT-03`
   - route to Team 03 for new architecture prep now;
   - then route to Team 04 for QA planning;
   - this is the top unassigned direct-value requirement.

2. `CF-W1-RH-01`
   - route through Team 00 Ready evaluation now;
   - Team 03 and Team 04 prep already exist;
   - keep it backend-only and conservative on current-`dev` Signal Quality / Calibration caps.

3. `CF-W1-L3-TREV-02`
   - route through Team 00 Ready evaluation when Today Review writer sequencing is safe;
   - Team 03 and Team 04 prep already exist;
   - keep it mutually exclusive with `CF-W1-L3-TREV-01`.

4. `CF-W1-SQLAB-02A`
   - treat as a Team 00 sequencing/Ready candidate after `CF-W1-SQLAB-01`;
   - do not send it back through Team 03/04 unless the packet itself changes.

## Items That Should Not Be Misrouted

- Do not treat `CF-W1-STRAT-02B` itself as Ready. The current packet says the real implementation opening is `CF-W1-STRAT-02B1`, and that child needs explicit schema/migration/generated/repository consent.
- Do not keep presenting `CF-W1-BT-01A` as an unassigned candidate. It is already active implementation.
- Do not reopen `CF-W1-SQLAB-02` as a generic parent. The actionable near-term item is `CF-W1-SQLAB-02A`, while durable `02B` remains blocked.
- Do not send `CF-W1-RH-01` or `CF-W1-L3-TREV-02` back to Team 03/04 for duplicate prep; both already have architecture and QA packets.

## Team 02 Recommendation

For the next direct-value cycle, Team 00 should:

1. route `CF-W1-STRAT-03` to Team 03 as the next unassigned requirement-prep packet;
2. evaluate `CF-W1-RH-01` for Ready promotion without reopening requirement discovery;
3. evaluate `CF-W1-L3-TREV-02` for Ready promotion when Today Review writer sequencing is safe;
4. keep `CF-W1-SQLAB-02A` in sequencing control only;
5. keep `CF-W1-STRAT-02B1` blocked until the explicit schema/generated consent gate is intentionally opened.
