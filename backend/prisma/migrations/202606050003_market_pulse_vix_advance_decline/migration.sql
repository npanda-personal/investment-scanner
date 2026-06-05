-- NR-22/NR-23: India VIX summary + Advance/Decline summary columns on Market Pulse snapshot
ALTER TABLE "market_pulse_snapshots"
  ADD COLUMN IF NOT EXISTS "vixSummaryJson" JSONB,
  ADD COLUMN IF NOT EXISTS "advanceDeclineJson" JSONB;
