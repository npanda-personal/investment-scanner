# Requirement Factory

Date: 2026-05-17

## Purpose

Requirement Factory runs continuously. It converts audit findings into requirements, acceptance criteria, non-goals, and ready candidates while implementation teams work.

## Inputs

- module audits,
- risk register,
- active board,
- decision inbox,
- completed work summaries,
- source/test evidence from audits.

## Outputs

- `requirements-backlog.md`
- `top-10-ready-candidates.md`
- `next-top-10-candidates.md`
- `refinement-queue.md`
- ready/blocked queue updates,
- Decision Packets for product ambiguity.

## Requirement Record Fields

Each candidate should include:

- requirement id,
- title,
- user/product value,
- module/team,
- lane,
- severity,
- dependencies,
- allowed files,
- forbidden files,
- shared-file risk,
- architecture contract needed,
- QA plan needed,
- parallel safety,
- stop conditions,
- acceptance criteria,
- recommended model/reasoning,
- status.

## Operating Rules

- Requirement Factory must not run only once per master cycle.
- Requirement Factory should run repeatedly.
- Requirement Factory should process new audit reports as they appear.
- Requirement Factory should refine existing backlog items even when no new audits appear.
- Requirement Factory should update top-10 candidates and ready queue candidates frequently.
- Do not wait for implementation teams to finish before preparing the next batch.
- Move items to Ready only when all ready criteria pass.
- Create Decision Packets only for true product policy blockers.
- Do not implement application code.
