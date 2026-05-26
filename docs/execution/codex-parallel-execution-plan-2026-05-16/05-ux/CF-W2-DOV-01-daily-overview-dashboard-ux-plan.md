# CF-W2-DOV-01 - Daily Overview Dashboard UX Plan

Date: 2026-05-26

Owner: Team 08 - UX / Research / Copilot

Status: Investor/trader-first reframe complete. Docs-only UX plan. Not implementation approval.

## UX Verdict

The Daily Overview should stop behaving like a system-monitoring home page.

The first viewport should feel like a daily investor/trader briefing:

1. what the current market backdrop looks like,
2. which review candidates deserve attention,
3. which setups are watch-only or blocked,
4. which expected market-wide signals are not available yet,
5. and only then what evidence caveats may limit confidence.

`Data Trust and Pipeline Health`, `Signal and Evidence Health`, and `Drilldown Strip` are no longer first-viewport identity sections. They move into compact caveats and supporting navigation below the main briefing slices.

## Product Owner Direction Applied

- Prioritize market overview and review opportunities in the first viewport.
- Keep market-wide movers as `Coming soon - Market Movers` unless a truthful stored-data source is confirmed.
- Keep FII/DII as `Coming soon - FII/DII Activity` unless a truthful local source is confirmed.
- Reuse Today Review and Research Hub for bullish, bearish, exit-risk, watch, blocked, and limited-evidence candidate framing.
- Keep evidence, data-quality, and pipeline caveats compact and secondary.
- Use research-support language only.

## Source Truth Map For Slice 1

| Section | Slice 1 status | Truth basis |
| --- | --- | --- |
| Market Pulse | Ship now, but clearly limited | Today Review reviewability + Research Overview market-readiness + Market Context region-level backdrop |
| High-Priority Review Candidates | Ship now | Today Review candidate groups; Research Hub priorities as supporting context |
| Watch And Blocked | Ship now | Today Review watch-only, blocked, insufficient-data, unproven, and reason summaries |
| Market Movers | Placeholder only | No truthful market-wide movers source confirmed on current base |
| Institutional Flow | Placeholder only | No truthful FII/DII source confirmed on current base |
| Evidence Caveats | Ship now as compact secondary surface | Data Quality, review-readiness, pipeline status, signal/proof caveats already surfaced elsewhere |
| Supporting Navigation | Ship now | Today Review, Research, Market Context, Data Quality, Signals, Calibration, Smart Money, Backtests, Pipeline Ops |

## Scope And Guardrails

- This plan applies to the `/` Daily Overview redesign only.
- This is a docs-only UX pass. No source, schema, route, shared UI, or package approval is implied.
- Slice 1 must prefer honest placeholders over invented investor/trader summaries.
- Market-wide claims must stay narrow and truthful to the active `region / assetType`.
- Market Context must be labeled as region-level context where asset-type specificity is not proven.

## Primary User Goal

When the user opens `/`, they should quickly understand whether the current market scope is reviewable, which bullish or bearish/exit-risk candidates deserve inspection, which setups are blocked or only worth watching, and what important market-wide context is still unavailable.

## Primary User Journey

1. Open `/`.
2. Confirm the active `region / assetType` and that this is a research-support overview.
3. Read `Market Pulse` for today's backdrop and reviewability posture.
4. Scan `High-Priority Review Candidates` for bullish and bearish/exit-risk names that deserve review.
5. Check `Watch And Blocked` to avoid over-reading weak or constrained setups.
6. Notice `Coming soon` placeholders for `Market Movers` and `FII/DII Activity` instead of assuming those views already exist.
7. Read compact `Evidence Caveats` only as needed.
8. Drill into Today Review, Research, Market Context, Data Quality, or other owner pages for detail.

## Information Hierarchy

1. Header rail with scope, timestamp, refresh, and research-support disclaimer
2. `Market Pulse`
3. `High-Priority Review Candidates`
4. `Market Movers` and `Institutional Flow` placeholders
5. `Watch And Blocked`
6. compact `Evidence Caveats`
7. supporting drilldowns and lower-page evidence/detail surfaces

## First Viewport Layout

### Desktop

Use a dense 12-column dashboard layout.

- Row 1: header rail, full width
- Row 2:
  - `Market Pulse` - 4 cols
  - `High-Priority Review Candidates` - 8 cols
- Row 3:
  - `Market Movers` - 3 cols
  - `Institutional Flow` - 3 cols
  - `Watch And Blocked` - 4 cols
  - `Evidence Caveats` - 2 cols

This keeps the first viewport investor/trader-facing even when two sections are still placeholder-only.

### Mobile

Stack in this order:

1. header rail
2. `Market Pulse`
3. `High-Priority Review Candidates`
4. `Market Movers`
5. `Institutional Flow`
6. `Watch And Blocked`
7. `Evidence Caveats`

### First-Viewport Rules

- `Market Pulse` and `High-Priority Review Candidates` must be visible without scrolling on desktop.
- `Evidence Caveats` must stay compact and visually quieter than opportunity sections.
- No first-viewport launch cards.
- No first-viewport pipeline-health identity.
- No first-viewport developer monitoring tone.

## Section Definitions

### 1. Header Rail

Must show:

- page title `Daily Overview`
- active `region / assetType`
- latest available loaded timestamp
- refresh action
- compact research-support disclaimer

Should also show:

- one compact reviewability chip such as `Review supported`, `Review limited`, or `Review blocked`

Must not show:

- launch-card navigation grid
- marketing hero copy
- portfolio-performance framing

### 2. Market Pulse

Purpose:

- give the page its investor/trader identity
- summarize the market backdrop plus whether review work is supported today

Must summarize:

- reviewability state from Today Review / review-readiness
- region-level regime or market-tone summary
- breadth or participation cue where available
- sector leadership / weakness where available
- strongest caution signal or contradiction
- next best review action

Preferred presentation:

- one lead sentence
- 4-6 compact stat chips
- one caution line if evidence is mixed or limited

Copy examples:

- `Review supported with mixed sector confirmation`
- `Review limited by incomplete market evidence`
- `Caution: backdrop is mixed and several candidates remain blocked`

UX note:

The prior standalone `Daily Pulse` becomes part of `Market Pulse`. It is no longer the whole page identity by itself.

### 3. High-Priority Review Candidates

Purpose:

- surface the setups that deserve immediate review attention

Must include:

- bullish review candidates
- bearish / exit-risk review candidates
- reason summaries
- source-owned ordering only

Recommended structure:

- top summary chips:
  - `Bullish review`
  - `Bearish / exit-risk review`
  - `Watch only`
  - `Blocked`
- primary split view:
  - left lane `Bullish review`
  - right lane `Bearish / exit-risk review`

Row content should prefer:

- symbol
- trigger or candidate type
- reason summary
- freshness or status label if truthful
- drill action to Today Review or Research

Must not include:

- target price
- reward/risk
- direct action language
- synthetic cross-module ranking

### 4. Market Movers

Slice 1 state:

- `Coming soon - Market Movers`

Reason:

- no truthful public market-wide movers source is confirmed on the current base

Placeholder rules:

- explain that market-wide gainers/losers are not yet backed by a safe stored-data source
- do not substitute watchlist movers and label them as market-wide movers
- do not show fake counts, empty heatmaps, or placeholder rows

### 5. Institutional Flow

Slice 1 state:

- `Coming soon - FII/DII Activity`

Reason:

- no truthful FII/DII source is confirmed on the current base

Placeholder rules:

- say this slice is waiting for a reliable local source
- do not relabel Smart Money as FII/DII
- do not show guessed inflow/outflow values

### 6. Watch And Blocked

Purpose:

- help the user avoid over-reading low-quality or constrained setups

Must summarize:

- watch-only candidates
- blocked candidates
- insufficient-data or limited-evidence candidates
- invalidated / unproven setups when present
- top blocker reasons

Recommended presentation:

- grouped list or accordion by state
- one compact reason-summary line per item
- blocker reasons visible before encouraging copy

This section belongs in the first viewport because it actively protects the user from false confidence.

### 7. Evidence Caveats

Purpose:

- keep trust issues visible without turning the page into an admin console

Must remain compact.

May summarize:

- DQ limited / blocked status
- stale or missing data warnings
- pipeline run caveat when it changes interpretation materially
- missing calibration aggregate
- missing measured outcome follow-through

Should route to:

- Data Quality
- Pipeline Ops
- Signals
- Calibration

Must not become:

- a full diagnostic section
- the dominant visual block on the page
- a replacement for the user-facing overview

## Secondary Below-The-Fold Areas

After the first viewport, the page may expand into supporting sections such as:

- deeper market context
- signal and proof caveats
- supporting navigation / drilldowns
- clearly tagged future-value placeholders

These are supporting surfaces, not the primary identity of the Daily Overview.

## Primary Data Shown

- current scope
- market backdrop / reviewability statement
- bullish review candidates
- bearish / exit-risk review candidates
- watch-only / blocked / limited-evidence candidates
- compact missing-evidence warnings

## Secondary Data Shown

- timestamps
- route shortcuts
- deeper evidence caveats
- region-level market context qualifiers
- placeholder explanations for unavailable market-wide slices

## Interaction Model

### Filters And Scope

- inherit the existing app-level `region / assetType` scope
- do not create a second page scope system
- all sections refetch on scope change
- unsupported scope states must show explicit limited wording

### Candidate Interaction

- allow tab or segmented switching inside `High-Priority Review Candidates`
- recommended tabs:
  - `Bullish review`
  - `Bearish / exit-risk`
  - `Watch only`
  - `Blocked`
- default tab should be the most reviewable trustworthy group, not simply the largest count

### Drilldowns

- `Market Pulse` -> Today Review or Market Context depending on the dominant caveat
- `High-Priority Review Candidates` -> Today Review / Research
- `Watch And Blocked` -> Today Review
- `Evidence Caveats` -> Data Quality / Pipeline Ops / Signals / Calibration

### Refresh

- one header-level refresh
- no fake percentage progress
- show section-local loading states when appropriate

## Empty, Loading, And Error States

### Loading

- show skeletons for header, `Market Pulse`, and candidate lanes
- placeholders for `Market Movers` and `Institutional Flow` should still render immediately as `Coming soon`

### Empty

- no candidates: explain that no current review candidates are published for the active scope
- no watch/blocked items: explain that no constrained setups are currently flagged
- no market context: label `Market Pulse` as limited and keep the reviewability summary visible if available

### Error / Partial

- one section failing must not blank the full page
- partial states must say `Limited` or `Unavailable`
- contradictory source signals must be labeled `Mixed evidence`

## Trust-Building Rules

- show missing market-wide slices honestly with `Coming soon`
- warnings must appear before optimistic interpretation when evidence is limited
- do not invent a dashboard-wide confidence number
- do not hide cross-source disagreement
- do not use green-positive styling to imply actionability
- keep admin/diagnostic depth behind caveats or drilldowns

## Accessibility / Basic Usability

- section headings must be short and plain
- chips and tabs must have clear text labels, not color-only meaning
- compact caveat text must still remain readable on mobile
- first-viewport content must preserve scanning order on small screens

## Required Product Language

Prefer:

- `Market Pulse`
- `High-Priority Review Candidates`
- `bullish review`
- `bearish / exit-risk review`
- `watch only`
- `blocked`
- `limited evidence`
- `mixed evidence`
- `reason summary`
- `consider review`

Avoid:

- `buy`
- `sell`
- `target`
- `profit target`
- `R:R`
- `best trade`
- `high conviction trade`
- `must buy`
- `must sell`

## Acceptance Criteria For Downstream Teams

- `/` reads like an investor/trader dashboard, not a monitoring console.
- The first viewport prioritizes `Market Pulse` and `High-Priority Review Candidates`.
- `Market Movers` is explicitly `Coming soon - Market Movers` unless a truthful source is confirmed.
- `Institutional Flow` is explicitly `Coming soon - FII/DII Activity` unless a truthful source is confirmed.
- `Watch And Blocked` is visible in the main overview, not buried below diagnostics.
- `Evidence Caveats` is compact and secondary.
- Admin/diagnostic surfaces move to secondary caveats or supporting navigation.
- All copy remains research-support only.

## QA Scenarios

1. First viewport shows `Market Pulse`, `High-Priority Review Candidates`, `Market Movers`, `Institutional Flow`, `Watch And Blocked`, and compact `Evidence Caveats` in the expected order.
2. `Market Movers` renders as `Coming soon - Market Movers` with no fake rows when no truthful source is present.
3. `Institutional Flow` renders as `Coming soon - FII/DII Activity` with no Smart Money relabeling.
4. `High-Priority Review Candidates` shows bullish and bearish/exit-risk review lanes using source-owned ordering.
5. `Watch And Blocked` explains why candidates are blocked or limited.
6. `Evidence Caveats` stays compact and links outward instead of taking over the page.
7. Mixed or contradictory evidence is visible as `Mixed evidence`.
8. No prohibited financial-advice or target/risk-reward language appears on the page.

## Architecture Questions Raised By This UX Reframe

1. Can `Market Pulse` safely combine Today Review reviewability plus region-level Market Context without implying asset-type precision that the source does not prove?
2. Can `High-Priority Review Candidates` show bullish and bearish/exit-risk lanes from Today Review alone in slice 1, with Research Hub used only as supporting context?
3. Should `Watch And Blocked` live off Today Review groups only, or is there another current public source that improves blocker reasons without widening scope?
4. Is there any safe stored-data source for scoped market-wide movers on the current base, or should `Market Movers` remain placeholder-only until a later requirement?
5. Is there any truthful local FII/DII path at all, or should `Institutional Flow` stay placeholder-only for the foreseeable slice?
6. What is the smallest summary payload needed for compact `Evidence Caveats` so the caveat area stays secondary and does not reintroduce the old admin-style layout?
