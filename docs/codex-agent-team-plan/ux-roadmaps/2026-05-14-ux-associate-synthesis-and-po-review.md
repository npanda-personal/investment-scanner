# UX Associate Synthesis And Lead PO Review

Date: 2026-05-14
Mode: Lead UX Synthesis / PO Acceptance Mode
Owners: Lead UX Designer, Lead Product Owner, Senior Fullstack Lead / Orchestrator
Status: UX redesign direction approved for architecture and work-packet planning, not yet for runtime implementation

## Source Artifacts

- Lead UX roadmap: [Lead UX redesign roadmap](2026-05-14-lead-ux-redesign-roadmap.md)
- Navigation/IA audit: [Associate UX navigation audit](../ux-audits/2026-05-14-associate-ux-navigation-ia-audit.md)
- Decision workflow audit: [Associate UX decision workflow audit](../ux-audits/2026-05-14-associate-ux-decision-workflows-audit.md)
- Data operations audit: [Associate UX data operations audit](../ux-audits/2026-05-14-associate-ux-data-operations-audit.md)
- Visual system audit: [Associate UX visual system audit](../ux-audits/2026-05-14-associate-ux-visual-system-audit.md)

## Consolidated UX Decision

The current app should not receive a cosmetic redesign first. The UX direction is to reorganize the product around daily decision flow, trusted data, and reviewable actionability.

Lead PO approves the UX direction only under these product constraints:

- screens must answer useful trader/investor questions, not just look cleaner,
- diagnostics stay available but must not bury the primary answer,
- UI copy remains research-support oriented and must not imply trading advice or broker automation,
- workflow order must reflect product truth: trusted data, Data Quality, signal/strategy proof, decision review, then trade-plan or portfolio action,
- UX implementation must not relax backend gates to make pages look healthier.

## Synthesis Across Associate UX Inputs

### Navigation and IA

Adopt workflow-first navigation:

1. Daily Work
2. Foundation
3. Signal Chain
4. Decision and Proof
5. Portfolio Ops
6. Account and Support

The first implementation slice should fix labels, route-family shell titles, home launch targets, and deep-page back-flow before larger screen rewrites.

### Decision workflows

Decision pages need one answer rail:

- market permission,
- review mode,
- candidate counts,
- exit-risk counts,
- blockers,
- next best action.

Today Review and Research Hub are the highest-value decision surfaces to simplify first after the shell/IA work.

### Data operations

Market Data and Data Quality must become gate-first operational pages:

- one trust/signoff/readiness gate,
- one bounded repair action area,
- one blocker-first diagnostics model,
- progress that separates processed, evaluated, skipped, failed, and out-of-scope records.

### Visual system

The app needs compact operational design rules:

- shared `PageHeader` as the standard page title pattern,
- compact typography and 8px spacing rhythm,
- fewer card grids for routine state,
- no page-wide horizontal overflow or `100vw` layout hacks,
- dark-mode tokens for contrast and scan speed,
- visible encoding defects removed.

## Approved UX Implementation Sequence

### UX-01 - Shell, route context, labels, and home launch targets

State: `Ready for Architecture`
Owner lane: frontend UX / navigation

Focus:

- route-family title resolution,
- workflow-first nav labels,
- `Today Review` encoding cleanup,
- Research Command Center naming consistency,
- home cards linking to real primary workflows,
- predictable deep-route back targets.

### UX-02 - Data operations gate-first UX

State: `Ready for Architecture after Phase 0 Market Data/DQ contracts stabilize`
Owner lane: frontend data operations

Focus:

- Market Data trust/signoff header,
- bounded repair run visibility,
- Data Quality tier display,
- blocker-first diagnostics,
- batch progress semantics.

### UX-03 - Daily decision surfaces

State: `Ready for Architecture after Phase 0 tier contract and UX-01`
Owner lane: frontend decision workflows

Focus:

- Today Review candidate-board simplification,
- Research Queue / Research Command Center relationship,
- decision rail with permission, candidates, exits, blockers, and next action.

### UX-04 - Visual system hardening

State: `Ready for Architecture`
Owner lane: frontend shared UI

Focus:

- theme tokens,
- typography/density scale,
- shared table/filter/action-row patterns,
- dark-mode contrast,
- removal of layout hacks.

## Lead PO Review Verdict

Verdict: approved for architecture and QA planning.

Implementation is not yet authorized until each UX packet has:

- architecture contract,
- QA plan,
- reserved frontend write scope,
- single developer owner,
- focused UI validation plan,
- Lead PO acceptance criteria tied to user value.

The first UX implementation packet should be `UX-01` because it improves orientation and navigation without depending on Phase 0 backend contracts.
