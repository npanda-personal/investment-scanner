-- CB-8: add benchmark (^NSEI) return and alpha columns to signal_outcomes
-- benchmarkReturnPercent: same-horizon Nifty 50 return from T+1 entry date
-- alphaPercent: forwardReturnPercent - benchmarkReturnPercent (signal alpha over benchmark)
ALTER TABLE "signal_outcomes"
  ADD COLUMN IF NOT EXISTS "benchmarkReturnPercent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "alphaPercent"           DOUBLE PRECISION;
