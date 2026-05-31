CREATE TABLE "source_file_imports" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "segment" TEXT NOT NULL,
  "tradingDate" TIMESTAMP(3) NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT,
  "fileHash" TEXT NOT NULL,
  "fileSize" INTEGER,
  "status" TEXT NOT NULL,
  "rowsRaw" INTEGER NOT NULL DEFAULT 0,
  "rowsAccepted" INTEGER NOT NULL DEFAULT 0,
  "rowsRejected" INTEGER NOT NULL DEFAULT 0,
  "parserVersion" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "source_file_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instrument_exchange_identities" (
  "id" TEXT NOT NULL,
  "stockId" TEXT NOT NULL,
  "exchange" TEXT NOT NULL,
  "isin" TEXT,
  "exchangeSymbol" TEXT NOT NULL,
  "securityCode" TEXT,
  "securityId" TEXT,
  "series" TEXT,
  "status" TEXT NOT NULL,
  "sourceFileImportId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instrument_exchange_identities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "price_ticks" ADD COLUMN "sourceFileImportId" TEXT;

CREATE UNIQUE INDEX "source_file_imports_source_segment_tradingDate_fileHash_key"
  ON "source_file_imports"("source", "segment", "tradingDate", "fileHash");
CREATE INDEX "source_file_imports_source_segment_tradingDate_status_idx"
  ON "source_file_imports"("source", "segment", "tradingDate", "status");

CREATE UNIQUE INDEX "instrument_exchange_identities_stockId_exchange_exchangeSymbol_key"
  ON "instrument_exchange_identities"("stockId", "exchange", "exchangeSymbol");
CREATE INDEX "instrument_exchange_identities_exchange_exchangeSymbol_idx"
  ON "instrument_exchange_identities"("exchange", "exchangeSymbol");
CREATE INDEX "instrument_exchange_identities_exchange_isin_idx"
  ON "instrument_exchange_identities"("exchange", "isin");
CREATE INDEX "instrument_exchange_identities_sourceFileImportId_idx"
  ON "instrument_exchange_identities"("sourceFileImportId");

CREATE INDEX "price_ticks_sourceFileImportId_idx"
  ON "price_ticks"("sourceFileImportId");

ALTER TABLE "price_ticks"
  ADD CONSTRAINT "price_ticks_sourceFileImportId_fkey"
  FOREIGN KEY ("sourceFileImportId") REFERENCES "source_file_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "instrument_exchange_identities"
  ADD CONSTRAINT "instrument_exchange_identities_stockId_fkey"
  FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "instrument_exchange_identities"
  ADD CONSTRAINT "instrument_exchange_identities_sourceFileImportId_fkey"
  FOREIGN KEY ("sourceFileImportId") REFERENCES "source_file_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
