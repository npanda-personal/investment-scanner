CREATE INDEX IF NOT EXISTS "price_ticks_symbol_timestamp_desc_cover_idx"
  ON "price_ticks"("symbol", "timestamp" DESC)
  INCLUDE ("volume", "adjustedClose", "close");

CREATE INDEX IF NOT EXISTS "stocks_region_assetType_symbol_idx"
  ON "stocks"("region", "assetType", "symbol");

CREATE INDEX IF NOT EXISTS "stocks_region_assetType_providerSupport_active_delisted_idx"
  ON "stocks"("region", "assetType", "providerSupportStatus", "isActive", "isDelisted");
