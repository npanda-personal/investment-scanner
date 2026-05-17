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

- Do not wait for implementation teams to finish before preparing the next batch.
- Move items to Ready only when all ready criteria pass.
- Create Decision Packets for ambiguous product policy.
- Do not implement application code.
