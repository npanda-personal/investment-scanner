ALTER TABLE "signal_results"
  ADD COLUMN IF NOT EXISTS "modelVersion" TEXT NOT NULL DEFAULT 'signal-engine-v1';
