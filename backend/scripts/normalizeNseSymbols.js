require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function scalar(sql) {
  const rows = await prisma.$queryRawUnsafe(sql);
  return Number(rows[0]?.count || 0);
}

async function main() {
  const before = {
    stocksWithNs: await scalar(`SELECT COUNT(*)::int AS count FROM stocks WHERE region = 'IN' AND symbol ILIKE '%.NS'`),
    duplicateStocks: await scalar(`
      SELECT COUNT(*)::int AS count
      FROM stocks s
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND EXISTS (SELECT 1 FROM stocks b WHERE b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i'))
    `),
    duplicateProviderSuffixStocks: await scalar(`
      SELECT COUNT(*)::int AS count
      FROM stocks s
      WHERE s.region = 'IN'
        AND s.symbol ~* '\\.(NS|BO)$'
        AND EXISTS (
          SELECT 1
          FROM stocks b
          WHERE upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
            AND b.id <> s.id
        )
    `),
    priceRowsWithNs: await scalar(`SELECT COUNT(*)::int AS count FROM price_ticks WHERE symbol ILIKE '%.NS'`),
    latestRowsWithNs: await scalar(`SELECT COUNT(*)::int AS count FROM latest_prices WHERE symbol ILIKE '%.NS'`),
  };

  const result = await prisma.$transaction(async (tx) => {
    const duplicateMerge = await tx.$executeRawUnsafe(`
      UPDATE stocks b
      SET
        name = COALESCE(NULLIF(b.name, ''), s.name),
        exchange = COALESCE(NULLIF(b.exchange, ''), NULLIF(s.exchange, ''), 'NSE'),
        country = COALESCE(NULLIF(b.country, ''), NULLIF(s.country, '')),
        sector = COALESCE(NULLIF(b.sector, ''), NULLIF(s.sector, '')),
        industry = COALESCE(NULLIF(b.industry, ''), NULLIF(s.industry, '')),
        currency = COALESCE(NULLIF(b.currency, ''), NULLIF(s.currency, ''), 'INR'),
        "marketCap" = COALESCE(b."marketCap", s."marketCap"),
        "assetType" = COALESCE(NULLIF(b."assetType", ''), NULLIF(s."assetType", ''), 'STOCK'),
        "instrumentSegment" = COALESCE(NULLIF(b."instrumentSegment", ''), NULLIF(s."instrumentSegment", '')),
        "displaySymbol" = regexp_replace(s.symbol, '\\.NS$', '', 'i'),
        "providerSymbol" = COALESCE(NULLIF(b."providerSymbol", ''), NULLIF(s."providerSymbol", ''), s.symbol),
        "sourceSymbol" = regexp_replace(s.symbol, '\\.NS$', '', 'i'),
        "catalogSource" = COALESCE(NULLIF(b."catalogSource", ''), NULLIF(s."catalogSource", '')),
        "providerSupportStatus" = COALESCE(NULLIF(b."providerSupportStatus", ''), NULLIF(s."providerSupportStatus", '')),
        "providerError" = COALESCE(NULLIF(b."providerError", ''), NULLIF(s."providerError", '')),
        "derivativesEligible" = b."derivativesEligible" OR s."derivativesEligible",
        "lastSuccessfulDataLoadTimestamp" = GREATEST(b."lastSuccessfulDataLoadTimestamp", s."lastSuccessfulDataLoadTimestamp"),
        "updatedAt" = NOW()
      FROM stocks s
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
    `);

    const repairAttemptReassign = await tx.$executeRawUnsafe(`
      UPDATE market_data_repair_attempts a
      SET "stockId" = b.id, "updatedAt" = NOW()
      FROM stocks s
      INNER JOIN stocks b ON b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND b.id <> s.id
        AND a."stockId" = s.id
    `);

    const repairStateConflictDelete = await tx.$executeRawUnsafe(`
      DELETE FROM market_data_repair_states st
      USING market_data_repair_states existing, stocks s, stocks b
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
        AND b.id <> s.id
        AND st."stockId" = s.id
        AND existing."stockId" = b.id
        AND existing."repairType" = st."repairType"
    `);

    const repairStateReassign = await tx.$executeRawUnsafe(`
      UPDATE market_data_repair_states st
      SET "stockId" = b.id, "updatedAt" = NOW()
      FROM stocks s
      INNER JOIN stocks b ON b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND b.id <> s.id
        AND st."stockId" = s.id
    `);

    const fundamentalConflictDelete = await tx.$executeRawUnsafe(`
      DELETE FROM fundamentals f
      USING fundamentals existing, stocks s, stocks b
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
        AND b.id <> s.id
        AND f."stockId" = s.id
        AND existing."stockId" = b.id
        AND existing."periodType" = f."periodType"
        AND existing.source = f.source
    `);

    const fundamentalReassign = await tx.$executeRawUnsafe(`
      UPDATE fundamentals f
      SET "stockId" = b.id, "lastUpdatedTimestamp" = NOW()
      FROM stocks s
      INNER JOIN stocks b ON b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND b.id <> s.id
        AND f."stockId" = s.id
    `);

    const corporateActionConflictDelete = await tx.$executeRawUnsafe(`
      DELETE FROM corporate_actions ca
      USING corporate_actions existing, stocks s, stocks b
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
        AND b.id <> s.id
        AND ca."stockId" = s.id
        AND existing."stockId" = b.id
        AND existing."naturalKey" = replace(ca."naturalKey", s.id, b.id)
    `);

    const corporateActionReassign = await tx.$executeRawUnsafe(`
      UPDATE corporate_actions ca
      SET
        "stockId" = b.id,
        "naturalKey" = replace(ca."naturalKey", s.id, b.id),
        "lastUpdatedTimestamp" = NOW()
      FROM stocks s
      INNER JOIN stocks b ON b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND b.id <> s.id
        AND ca."stockId" = s.id
    `);

    const providerDuplicateRepairAttemptReassign = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      UPDATE market_data_repair_attempts a
      SET "stockId" = d.base_id, "updatedAt" = NOW()
      FROM dup d
      WHERE a."stockId" = d.suffix_id
    `);

    const providerDuplicateRepairStateConflictDelete = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      DELETE FROM market_data_repair_states st
      USING market_data_repair_states existing, dup d
      WHERE st."stockId" = d.suffix_id
        AND existing."stockId" = d.base_id
        AND existing."repairType" = st."repairType"
    `);

    const providerDuplicateRepairStateReassign = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      UPDATE market_data_repair_states st
      SET "stockId" = d.base_id, "updatedAt" = NOW()
      FROM dup d
      WHERE st."stockId" = d.suffix_id
    `);

    const providerDuplicateFundamentalConflictDelete = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      DELETE FROM fundamentals f
      USING fundamentals existing, dup d
      WHERE f."stockId" = d.suffix_id
        AND existing."stockId" = d.base_id
        AND existing."periodType" = f."periodType"
        AND existing.source = f.source
    `);

    const providerDuplicateFundamentalReassign = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      UPDATE fundamentals f
      SET "stockId" = d.base_id, "lastUpdatedTimestamp" = NOW()
      FROM dup d
      WHERE f."stockId" = d.suffix_id
    `);

    const providerDuplicateCorporateActionConflictDelete = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      DELETE FROM corporate_actions ca
      USING corporate_actions existing, dup d
      WHERE ca."stockId" = d.suffix_id
        AND existing."stockId" = d.base_id
        AND existing."naturalKey" = replace(ca."naturalKey", d.suffix_id, d.base_id)
    `);

    const providerDuplicateCorporateActionReassign = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      UPDATE corporate_actions ca
      SET
        "stockId" = d.base_id,
        "naturalKey" = replace(ca."naturalKey", d.suffix_id, d.base_id),
        "lastUpdatedTimestamp" = NOW()
      FROM dup d
      WHERE ca."stockId" = d.suffix_id
    `);

    const providerDuplicatePortfolioHoldingConflictDelete = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      DELETE FROM portfolio_holdings h
      USING portfolio_holdings existing, dup d
      WHERE h."instrumentId" = d.suffix_id
        AND existing."portfolioId" = h."portfolioId"
        AND existing."instrumentId" = d.base_id
    `);

    const providerDuplicatePortfolioHoldingReassign = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id, b.symbol AS base_symbol, b.name AS base_name
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      UPDATE portfolio_holdings h
      SET "instrumentId" = d.base_id, symbol = d.base_symbol, "companyName" = COALESCE(h."companyName", d.base_name), "updatedAt" = NOW()
      FROM dup d
      WHERE h."instrumentId" = d.suffix_id
    `);

    const providerDuplicatePortfolioTransactionReassign = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      UPDATE portfolio_transactions t
      SET "instrumentId" = d.base_id, "updatedAt" = NOW()
      FROM dup d
      WHERE t."instrumentId" = d.suffix_id
    `);

    const providerDuplicateWatchlistConflictDelete = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      DELETE FROM watchlist_items wi
      USING watchlist_items existing, dup d
      WHERE wi."instrumentId" = d.suffix_id
        AND existing."watchlistId" = wi."watchlistId"
        AND existing."instrumentId" = d.base_id
    `);

    const providerDuplicateWatchlistReassign = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id, b.symbol AS base_symbol, b.name AS base_name
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      UPDATE watchlist_items wi
      SET "instrumentId" = d.base_id, symbol = d.base_symbol, "companyName" = COALESCE(wi."companyName", d.base_name), "updatedAt" = NOW()
      FROM dup d
      WHERE wi."instrumentId" = d.suffix_id
    `);

    const providerDuplicateAlertRuleReassign = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      UPDATE alert_rules ar
      SET "instrumentId" = d.base_id, "updatedAt" = NOW()
      FROM dup d
      WHERE ar."instrumentId" = d.suffix_id
    `);

    const providerDuplicateAlertEventReassign = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, b.id AS base_id
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      UPDATE alert_events ae
      SET "instrumentId" = d.base_id
      FROM dup d
      WHERE ae."instrumentId" = d.suffix_id
    `);

    const providerDuplicatePriceDelete = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.symbol AS suffix_symbol
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      DELETE FROM price_ticks p
      USING dup d
      WHERE upper(p.symbol) = upper(d.suffix_symbol)
    `);

    const providerDuplicateLatestDelete = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.symbol AS suffix_symbol
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      DELETE FROM latest_prices p
      USING dup d
      WHERE upper(p.symbol) = upper(d.suffix_symbol)
    `);

    const providerDuplicateCalibrationDelete = await tx.$executeRawUnsafe(`
      WITH dup AS (
        SELECT s.id AS suffix_id, s.symbol AS suffix_symbol
        FROM stocks s
        JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        WHERE s.region = 'IN'
          AND s.symbol ~* '\\.(NS|BO)$'
          AND b.id <> s.id
      )
      DELETE FROM signal_calibration_results c
      USING dup d
      WHERE c."instrumentId" = d.suffix_id
        OR upper(c.symbol) = upper(d.suffix_symbol)
    `);

    const providerDuplicateDerivedDelete = [];
    for (const table of [
      'signal_position_ledger_entries',
      'trade_plan_results',
      'today_review_candidates',
      'strategy_decision_results',
      'smart_money_context_snapshots',
      'data_quality_snapshots',
      'data_quality_evaluations',
      'signal_results',
    ]) {
      const count = await tx.$executeRawUnsafe(`
        WITH dup AS (
          SELECT s.id AS suffix_id, s.symbol AS suffix_symbol
          FROM stocks s
          JOIN stocks b ON upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
          WHERE s.region = 'IN'
            AND s.symbol ~* '\\.(NS|BO)$'
            AND b.id <> s.id
        )
        DELETE FROM "${table}" x
        USING dup d
        WHERE x."instrumentId" = d.suffix_id
          OR upper(x.symbol) = upper(d.suffix_symbol)
      `);
      if (count > 0) providerDuplicateDerivedDelete.push({ table, count });
    }

    const providerDuplicateStockDelete = await tx.$executeRawUnsafe(`
      DELETE FROM stocks s
      USING stocks b
      WHERE s.region = 'IN'
        AND s.symbol ~* '\\.(NS|BO)$'
        AND upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
        AND b.id <> s.id
    `);

    const tradePlanOrphanConflictDelete = await tx.$executeRawUnsafe(`
      WITH orphan AS (
        SELECT t.*, by_symbol.id AS base_id
        FROM trade_plan_results t
        LEFT JOIN stocks by_id ON by_id.id = t."instrumentId"
        JOIN stocks by_symbol ON upper(by_symbol.symbol) = upper(t.symbol)
        WHERE t."instrumentId" IS NOT NULL
          AND by_id.id IS NULL
      )
      DELETE FROM trade_plan_results t
      USING orphan o, trade_plan_results existing
      WHERE t.id = o.id
        AND existing."instrumentId" = o.base_id
        AND existing.strategy = o.strategy
        AND existing."modelVersion" = o."modelVersion"
        AND existing."generatedDate" = o."generatedDate"
        AND existing.region IS NOT DISTINCT FROM o.region
        AND existing."assetType" IS NOT DISTINCT FROM o."assetType"
        AND existing."portfolioKey" = o."portfolioKey"
        AND existing.id <> o.id
    `);

    const tradePlanOrphanReassign = await tx.$executeRawUnsafe(`
      UPDATE trade_plan_results t
      SET "instrumentId" = by_symbol.id, symbol = by_symbol.symbol, "updatedAt" = NOW()
      FROM stocks by_symbol
      WHERE t."instrumentId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM stocks by_id WHERE by_id.id = t."instrumentId")
        AND upper(by_symbol.symbol) = upper(t.symbol)
    `);

    const calibrationOrphanDelete = await tx.$executeRawUnsafe(`
      DELETE FROM signal_calibration_results c
      WHERE NOT EXISTS (SELECT 1 FROM signal_results sr WHERE sr.id = c."signalResultId")
        OR NOT EXISTS (SELECT 1 FROM stocks s WHERE s.id = c."instrumentId")
    `);

    const duplicateStockDelete = await tx.$executeRawUnsafe(`
      DELETE FROM stocks s
      USING stocks b
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
        AND b.id <> s.id
    `);

    const conflictingPriceDelete = await tx.$executeRawUnsafe(`
      DELETE FROM price_ticks ns
      USING price_ticks base
      WHERE ns.symbol ILIKE '%.NS'
        AND base.symbol = regexp_replace(ns.symbol, '\\.NS$', '', 'i')
        AND base.timestamp = ns.timestamp
    `);

    const conflictingLatestDelete = await tx.$executeRawUnsafe(`
      DELETE FROM latest_prices ns
      USING latest_prices base
      WHERE ns.symbol ILIKE '%.NS'
        AND base.symbol = regexp_replace(ns.symbol, '\\.NS$', '', 'i')
    `);

    const stockNormalize = await tx.$executeRawUnsafe(`
      UPDATE stocks
      SET
        "providerSymbol" = COALESCE(NULLIF("providerSymbol", ''), symbol),
        "sourceSymbol" = regexp_replace(COALESCE(NULLIF("sourceSymbol", ''), symbol), '\\.NS$', '', 'i'),
        "displaySymbol" = regexp_replace(COALESCE(NULLIF("displaySymbol", ''), symbol), '\\.NS$', '', 'i'),
        exchange = COALESCE(NULLIF(exchange, ''), 'NSE'),
        symbol = regexp_replace(symbol, '\\.NS$', '', 'i'),
        "updatedAt" = NOW()
      WHERE region = 'IN'
        AND symbol ILIKE '%.NS'
    `);

    const priceNormalize = await tx.$executeRawUnsafe(`
      UPDATE price_ticks
      SET symbol = regexp_replace(symbol, '\\.NS$', '', 'i')
      WHERE symbol ILIKE '%.NS'
    `);

    const latestNormalize = await tx.$executeRawUnsafe(`
      UPDATE latest_prices
      SET symbol = regexp_replace(symbol, '\\.NS$', '', 'i')
      WHERE symbol ILIKE '%.NS'
    `);

    const ledgerKeyNormalize = await tx.$executeRawUnsafe(`
      UPDATE signal_position_ledger_entries
      SET
        "stockKey" = regexp_replace(symbol, '\\.(NS|BO)$', '', 'i'),
        "activeSlot" = CASE WHEN status = 'ACTIVE' THEN regexp_replace(symbol, '\\.(NS|BO)$', '', 'i') ELSE NULL END
      WHERE symbol ILIKE '%.NS'
        OR "stockKey" ILIKE '%.NS'
        OR "activeSlot" ILIKE '%.NS'
        OR COALESCE("stockKey", '') = ''
        OR (status = 'ACTIVE' AND "activeSlot" IS NULL)
    `);

    const symbolTables = [
      'data_quality_evaluations',
      'data_quality_snapshots',
      'portfolio_holdings',
      'signal_calibration_results',
      'signal_position_ledger_entries',
      'signal_results',
      'smart_money_context_snapshots',
      'strategy_decision_results',
      'today_review_candidates',
      'trade_plan_results',
      'watchlist_items',
    ];
    const symbolColumnUpdates = [];
    for (const tableName of symbolTables) {
      const table = tableName.replace(/"/g, '""');
      const count = await tx.$executeRawUnsafe(`
        UPDATE "${table}"
        SET symbol = regexp_replace(symbol, '\\.NS$', '', 'i')
        WHERE symbol ILIKE '%.NS'
      `);
      if (count > 0) symbolColumnUpdates.push({ table, column: 'symbol', count });
    }

    return {
      duplicateMerge,
      repairAttemptReassign,
      repairStateConflictDelete,
      repairStateReassign,
      fundamentalConflictDelete,
      fundamentalReassign,
      corporateActionConflictDelete,
      corporateActionReassign,
      providerDuplicateRepairAttemptReassign,
      providerDuplicateRepairStateConflictDelete,
      providerDuplicateRepairStateReassign,
      providerDuplicateFundamentalConflictDelete,
      providerDuplicateFundamentalReassign,
      providerDuplicateCorporateActionConflictDelete,
      providerDuplicateCorporateActionReassign,
      providerDuplicatePortfolioHoldingConflictDelete,
      providerDuplicatePortfolioHoldingReassign,
      providerDuplicatePortfolioTransactionReassign,
      providerDuplicateWatchlistConflictDelete,
      providerDuplicateWatchlistReassign,
      providerDuplicateAlertRuleReassign,
      providerDuplicateAlertEventReassign,
      providerDuplicatePriceDelete,
      providerDuplicateLatestDelete,
      providerDuplicateCalibrationDelete,
      providerDuplicateDerivedDelete,
      providerDuplicateStockDelete,
      tradePlanOrphanConflictDelete,
      tradePlanOrphanReassign,
      calibrationOrphanDelete,
      duplicateStockDelete,
      conflictingPriceDelete,
      conflictingLatestDelete,
      stockNormalize,
      priceNormalize,
      latestNormalize,
      ledgerKeyNormalize,
      symbolColumnUpdates,
    };
  }, {
    maxWait: 30000,
    timeout: 600000,
  });

  const after = {
    stocksWithNs: await scalar(`SELECT COUNT(*)::int AS count FROM stocks WHERE region = 'IN' AND symbol ILIKE '%.NS'`),
    duplicateStocks: await scalar(`
      SELECT COUNT(*)::int AS count
      FROM stocks s
      WHERE s.region = 'IN'
        AND s.symbol ILIKE '%.NS'
        AND EXISTS (SELECT 1 FROM stocks b WHERE b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i'))
    `),
    duplicateProviderSuffixStocks: await scalar(`
      SELECT COUNT(*)::int AS count
      FROM stocks s
      WHERE s.region = 'IN'
        AND s.symbol ~* '\\.(NS|BO)$'
        AND EXISTS (
          SELECT 1
          FROM stocks b
          WHERE upper(b.symbol) = upper(regexp_replace(s.symbol, '\\.(NS|BO)$', '', 'i'))
            AND b.id <> s.id
        )
    `),
    priceRowsWithNs: await scalar(`SELECT COUNT(*)::int AS count FROM price_ticks WHERE symbol ILIKE '%.NS'`),
    latestRowsWithNs: await scalar(`SELECT COUNT(*)::int AS count FROM latest_prices WHERE symbol ILIKE '%.NS'`),
  };

  console.log(JSON.stringify({ before, result, after }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
