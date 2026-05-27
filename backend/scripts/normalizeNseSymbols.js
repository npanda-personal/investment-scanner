require('dotenv').config({ path: '.env' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function scalar(sql) {
  const rows = await prisma.$queryRawUnsafe(sql);
  return Number(rows[0]?.count || 0);
}

async function main() {
  const before = {
    stocksWithNs: await scalar(`SELECT COUNT(*)::int AS count FROM stocks WHERE region = 'IN' AND "assetType" = 'STOCK' AND symbol ILIKE '%.NS'`),
    duplicateStocks: await scalar(`
      SELECT COUNT(*)::int AS count
      FROM stocks s
      WHERE s.region = 'IN'
        AND s."assetType" = 'STOCK'
        AND s.symbol ILIKE '%.NS'
        AND EXISTS (SELECT 1 FROM stocks b WHERE b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i'))
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
        AND s."assetType" = 'STOCK'
        AND s.symbol ILIKE '%.NS'
        AND b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
    `);

    const repairAttemptReassign = await tx.$executeRawUnsafe(`
      UPDATE market_data_repair_attempts a
      SET "stockId" = b.id, "updatedAt" = NOW()
      FROM stocks s
      INNER JOIN stocks b ON b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
      WHERE s.region = 'IN'
        AND s."assetType" = 'STOCK'
        AND s.symbol ILIKE '%.NS'
        AND b.id <> s.id
        AND a."stockId" = s.id
    `);

    const repairStateConflictDelete = await tx.$executeRawUnsafe(`
      DELETE FROM market_data_repair_states st
      USING market_data_repair_states existing, stocks s, stocks b
      WHERE s.region = 'IN'
        AND s."assetType" = 'STOCK'
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
        AND s."assetType" = 'STOCK'
        AND s.symbol ILIKE '%.NS'
        AND b.id <> s.id
        AND st."stockId" = s.id
    `);

    const fundamentalConflictDelete = await tx.$executeRawUnsafe(`
      DELETE FROM fundamentals f
      USING fundamentals existing, stocks s, stocks b
      WHERE s.region = 'IN'
        AND s."assetType" = 'STOCK'
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
        AND s."assetType" = 'STOCK'
        AND s.symbol ILIKE '%.NS'
        AND b.id <> s.id
        AND f."stockId" = s.id
    `);

    const corporateActionConflictDelete = await tx.$executeRawUnsafe(`
      DELETE FROM corporate_actions ca
      USING corporate_actions existing, stocks s, stocks b
      WHERE s.region = 'IN'
        AND s."assetType" = 'STOCK'
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
        AND s."assetType" = 'STOCK'
        AND s.symbol ILIKE '%.NS'
        AND b.id <> s.id
        AND ca."stockId" = s.id
    `);

    const duplicateStockDelete = await tx.$executeRawUnsafe(`
      DELETE FROM stocks s
      USING stocks b
      WHERE s.region = 'IN'
        AND s."assetType" = 'STOCK'
        AND s.symbol ILIKE '%.NS'
        AND b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i')
        AND b.id <> s.id
    `);

    const conflictingPriceDelete = await tx.$executeRawUnsafe(`
      DELETE FROM price_ticks base
      USING price_ticks ns
      WHERE ns.symbol ILIKE '%.NS'
        AND base.symbol = regexp_replace(ns.symbol, '\\.NS$', '', 'i')
        AND base.timestamp = ns.timestamp
    `);

    const conflictingLatestDelete = await tx.$executeRawUnsafe(`
      DELETE FROM latest_prices base
      USING latest_prices ns
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
        AND "assetType" = 'STOCK'
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

    const symbolColumns = await tx.$queryRawUnsafe(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'symbol'
        AND data_type IN ('text', 'character varying')
        AND table_name NOT IN ('stocks', 'price_ticks', 'latest_prices')
      ORDER BY table_name
    `);

    const symbolColumnUpdates = [];
    for (const row of symbolColumns) {
      const table = String(row.table_name).replace(/"/g, '""');
      const column = String(row.column_name).replace(/"/g, '""');
      const count = await tx.$executeRawUnsafe(`
        UPDATE "${table}"
        SET "${column}" = regexp_replace("${column}", '\\.NS$', '', 'i')
        WHERE "${column}" ILIKE '%.NS'
      `);
      if (count > 0) symbolColumnUpdates.push({ table, column, count });
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
      duplicateStockDelete,
      conflictingPriceDelete,
      conflictingLatestDelete,
      stockNormalize,
      priceNormalize,
      latestNormalize,
      symbolColumnUpdates,
    };
  }, {
    maxWait: 30000,
    timeout: 600000,
  });

  const after = {
    stocksWithNs: await scalar(`SELECT COUNT(*)::int AS count FROM stocks WHERE region = 'IN' AND "assetType" = 'STOCK' AND symbol ILIKE '%.NS'`),
    duplicateStocks: await scalar(`
      SELECT COUNT(*)::int AS count
      FROM stocks s
      WHERE s.region = 'IN'
        AND s."assetType" = 'STOCK'
        AND s.symbol ILIKE '%.NS'
        AND EXISTS (SELECT 1 FROM stocks b WHERE b.symbol = regexp_replace(s.symbol, '\\.NS$', '', 'i'))
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
