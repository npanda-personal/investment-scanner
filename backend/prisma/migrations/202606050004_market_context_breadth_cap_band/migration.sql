-- NR-5: stratified breadth by market-cap band on the market-context snapshot.
ALTER TABLE "market_context_snapshots" ADD COLUMN IF NOT EXISTS "breadthByCapBand" JSONB;
