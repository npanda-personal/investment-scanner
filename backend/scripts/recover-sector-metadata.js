const crypto = require('crypto');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const SOURCE_NAME = 'NSE_OFFICIAL_QUOTE_EQUITY';
const REPAIR_TYPE = 'PROVIDER_BUSINESS_METADATA';
const INVALID_TEXT_VALUES = new Set(['UNKNOWN', 'N/A', 'NA', 'NONE', 'NULL', '-', '--']);

function parseArgs(argv) {
  const options = {
    execute: false,
    selfTest: false,
    region: 'IN',
    assetType: 'STOCK',
    batchSize: 25,
    maxBatches: 1,
    limit: null,
    offset: 0,
    delayMs: 750,
    symbols: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];
    if (arg === '--execute') options.execute = true;
    else if (arg === '--self-test') options.selfTest = true;
    else if (arg === '--region') options.region = String(next() || options.region).toUpperCase();
    else if (arg === '--asset-type') options.assetType = String(next() || options.assetType).toUpperCase();
    else if (arg === '--batch-size') options.batchSize = positiveInt(next(), options.batchSize, 1, 100);
    else if (arg === '--max-batches') options.maxBatches = positiveInt(next(), options.maxBatches, 1, 100);
    else if (arg === '--limit') options.limit = positiveInt(next(), 0, 0, 100000);
    else if (arg === '--offset') options.offset = positiveInt(next(), options.offset, 0, 100000);
    else if (arg === '--delay-ms') options.delayMs = positiveInt(next(), options.delayMs, 0, 60000);
    else if (arg === '--symbols') {
      options.symbols = String(next() || '')
        .split(',')
        .map((value) => baseSymbol(value))
        .filter(Boolean);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function positiveInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function hasValidText(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return Boolean(trimmed) && !INVALID_TEXT_VALUES.has(trimmed.toUpperCase());
}

function firstValidText(...values) {
  for (const value of values) {
    if (hasValidText(value)) return value.trim();
  }
  return null;
}

function positiveNumber(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function baseSymbol(value) {
  return String(value || '')
    .trim()
    .replace(/\.(NS|BO)$/i, '')
    .toUpperCase();
}

function sleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function extractNseMetadata(payload) {
  const industryInfo = objectOrEmpty(payload && payload.industryInfo);
  const info = objectOrEmpty(payload && payload.info);
  const metadata = objectOrEmpty(payload && payload.metadata);
  const securityInfo = objectOrEmpty(payload && payload.securityInfo);
  const tradeInfo = objectOrEmpty(objectOrEmpty(payload && payload.marketDeptOrderBook).tradeInfo);

  const sector = firstValidText(industryInfo.sector, metadata.sector);
  const industry = firstValidText(
    industryInfo.industry,
    info.industry,
    metadata.industry,
    industryInfo.basicIndustry
  );
  const basicIndustry = firstValidText(industryInfo.basicIndustry);
  const macroSector = firstValidText(industryInfo.macro);
  const isin = firstValidText(info.isin, metadata.isin, securityInfo.isin);
  const companyName = firstValidText(info.companyName, metadata.companyName);
  const marketCap = positiveNumber(tradeInfo.totalMarketCap);

  return {
    sector,
    industry,
    basicIndustry,
    macroSector,
    isin,
    companyName,
    marketCap,
    sourceStatus: firstValidText(info.isSuspended === true ? 'SUSPENDED' : null, info.isDelisted === true ? 'DELISTED' : null, 'ACTIVE'),
    responseFingerprint: stableHash({ industryInfo, info: { symbol: info.symbol, isin: info.isin }, metadata }),
  };
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function missingSectorWherePrisma(scope) {
  return {
    region: scope.region,
    assetType: scope.assetType,
    isActive: true,
    isDelisted: false,
  };
}

async function missingSectorStocks(prisma, options) {
  const rows = await prisma.stock.findMany({
    where: missingSectorWherePrisma(options),
    select: {
      id: true,
      symbol: true,
      name: true,
      region: true,
      assetType: true,
      exchange: true,
      sector: true,
      industry: true,
      marketCap: true,
      isin: true,
      providerSymbol: true,
      sourceSymbol: true,
      displaySymbol: true,
      catalogSource: true,
      providerSupportStatus: true,
    },
    orderBy: [{ catalogSource: 'asc' }, { symbol: 'asc' }],
  });

  const symbolFilter = options.symbols ? new Set(options.symbols.map(baseSymbol)) : null;
  return rows
    .filter((stock) => !hasValidText(stock.sector))
    .filter((stock) => !symbolFilter || symbolFilter.has(baseSymbol(stock.symbol)))
    .slice(options.offset, options.limit === null ? undefined : options.offset + options.limit);
}

function fieldUpdateForStock(stock, source) {
  const data = {};
  const fieldsFilled = {};

  if (!hasValidText(stock.sector) && hasValidText(source.sector)) {
    data.sector = source.sector;
    fieldsFilled.sector = 1;
  }
  if (!hasValidText(stock.industry) && hasValidText(source.industry)) {
    data.industry = source.industry;
    fieldsFilled.industry = 1;
  }
  if (!hasValidText(stock.isin) && hasValidText(source.isin)) {
    data.isin = source.isin;
    fieldsFilled.isin = 1;
  }
  if ((stock.marketCap === null || stock.marketCap === undefined || Number(stock.marketCap) <= 0) && source.marketCap) {
    data.marketCap = source.marketCap;
    fieldsFilled.marketCap = 1;
  }

  return { data, fieldsFilled };
}

function businessMetadataState(stock, data) {
  const after = { ...stock, ...data };
  const missing = [];
  if (!hasValidText(after.sector)) missing.push('sector');
  if (!hasValidText(after.industry)) missing.push('industry');
  if (after.marketCap === null || after.marketCap === undefined || Number(after.marketCap) <= 0) missing.push('marketCap');
  return {
    status: missing.length === 0 ? 'RESOLVED' : 'MANUAL_REQUIRED',
    attemptStatus: missing.length === 0 ? 'SUCCESS' : Object.keys(data).length > 0 ? 'PARTIAL_SUCCESS' : 'NO_FIELDS_FILLED',
    missing,
  };
}

async function recordRepair(prisma, stock, scope, result) {
  const state = businessMetadataState(stock, result.data);
  const manualRequiredReason = state.missing.length > 0
    ? `Missing business metadata after ${SOURCE_NAME}: ${state.missing.join(', ')}`
    : null;
  const attempt = await prisma.marketDataRepairAttempt.create({
    data: {
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: REPAIR_TYPE,
      status: result.error ? 'FAILED' : state.attemptStatus,
      provider: SOURCE_NAME,
      completedAt: new Date(),
      fieldsFilledJson: result.fieldsFilled,
      error: result.error || null,
      manualRequiredReason,
    },
  });

  await prisma.marketDataRepairState.upsert({
    where: {
      stockId_repairType: {
        stockId: stock.id,
        repairType: REPAIR_TYPE,
      },
    },
    create: {
      stockId: stock.id,
      region: scope.region,
      assetType: scope.assetType,
      repairType: REPAIR_TYPE,
      status: result.error ? 'FAILED_RETRYABLE' : state.status,
      provider: SOURCE_NAME,
      lastAttemptId: attempt.id,
      fieldsFilledJson: result.fieldsFilled,
      error: result.error || null,
      manualRequiredReason,
      lastAttemptedAt: new Date(),
      nextRetryAt: result.error ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      resolvedAt: !result.error && state.status === 'RESOLVED' ? new Date() : null,
    },
    update: {
      region: scope.region,
      assetType: scope.assetType,
      status: result.error ? 'FAILED_RETRYABLE' : state.status,
      provider: SOURCE_NAME,
      lastAttemptId: attempt.id,
      fieldsFilledJson: result.fieldsFilled,
      error: result.error || null,
      manualRequiredReason,
      lastAttemptedAt: new Date(),
      nextRetryAt: result.error ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      resolvedAt: !result.error && state.status === 'RESOLVED' ? new Date() : null,
    },
  });
}

class NseOfficialClient {
  constructor(delayMs) {
    this.delayMs = delayMs;
    this.cookie = '';
    this.warmed = false;
  }

  async warm(symbol) {
    const response = await fetch(`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`, {
      headers: this.headers(),
    });
    this.captureCookie(response);
    this.warmed = response.ok;
  }

  async quote(symbol) {
    if (!this.warmed) await this.warm(symbol);
    await sleep(this.delayMs);
    let response = await fetch(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`, {
      headers: this.headers(symbol),
    });
    if ((response.status === 401 || response.status === 403) && this.warmed) {
      this.warmed = false;
      await this.warm(symbol);
      await sleep(this.delayMs);
      response = await fetch(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`, {
        headers: this.headers(symbol),
      });
    }
    this.captureCookie(response);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`NSE quote-equity ${response.status}: ${text.slice(0, 160)}`);
    }
    return response.json();
  }

  headers(symbol) {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: symbol
        ? `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`
        : 'https://www.nseindia.com/',
      Cookie: this.cookie,
    };
  }

  captureCookie(response) {
    const cookies = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : String(response.headers.get('set-cookie') || '').split(/,(?=[^;]+?=)/);
    const parts = cookies
      .map((cookie) => String(cookie || '').split(';')[0].trim())
      .filter(Boolean);
    if (parts.length > 0) this.cookie = parts.join('; ');
  }
}

async function runSelfTest() {
  const parsed = extractNseMetadata({
    industryInfo: {
      macro: 'Financial Services',
      sector: 'Financial Services',
      industry: 'Finance',
      basicIndustry: 'Non Banking Financial Company',
    },
    info: {
      companyName: 'Example Finance Limited',
      industry: 'FINANCE',
      isin: 'INE000A01000',
      symbol: 'EXAMPLE',
    },
    marketDeptOrderBook: {
      tradeInfo: {
        totalMarketCap: '12345.67',
      },
    },
  });

  const failures = [];
  if (parsed.sector !== 'Financial Services') failures.push('sector');
  if (parsed.industry !== 'Finance') failures.push('industry');
  if (parsed.isin !== 'INE000A01000') failures.push('isin');
  if (parsed.marketCap !== 12345.67) failures.push('marketCap');
  if (failures.length > 0) {
    throw new Error(`Self-test failed for fields: ${failures.join(', ')}`);
  }
  console.log(JSON.stringify({ selfTest: 'PASS', mappingSource: SOURCE_NAME }, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) {
    await runSelfTest();
    return;
  }

  const prisma = new PrismaClient();
  const scope = { region: options.region, assetType: options.assetType };
  const startedAt = new Date();
  const summary = {
    mode: options.execute ? 'EXECUTE' : 'DRY_RUN',
    mappingSource: SOURCE_NAME,
    startedAt: startedAt.toISOString(),
    region: scope.region,
    assetType: scope.assetType,
    beforeMissingSector: 0,
    afterMissingSector: null,
    eligibleCount: 0,
    processedCount: 0,
    updatedCount: 0,
    noSectorFromSourceCount: 0,
    failedCount: 0,
    batchSize: options.batchSize,
    maxBatches: options.maxBatches,
    fieldsFilled: {},
    unmappedSymbols: [],
    failures: [],
  };

  try {
    const beforeRows = await missingSectorStocks(prisma, { ...options, offset: 0, limit: null, symbols: null });
    summary.beforeMissingSector = beforeRows.length;
    const candidates = await missingSectorStocks(prisma, options);
    summary.eligibleCount = candidates.length;
    const page = candidates.slice(0, options.batchSize * options.maxBatches);
    const client = new NseOfficialClient(options.delayMs);

    for (const stock of page) {
      summary.processedCount += 1;
      const symbol = baseSymbol(stock.sourceSymbol || stock.displaySymbol || stock.symbol);
      try {
        const payload = await client.quote(symbol);
        const source = extractNseMetadata(payload);
        const { data, fieldsFilled } = fieldUpdateForStock(stock, source);
        if (!hasValidText(source.sector)) {
          summary.noSectorFromSourceCount += 1;
          summary.unmappedSymbols.push({
            symbol: stock.symbol,
            reason: 'NSE response did not include a valid sector',
            sourceFingerprint: source.responseFingerprint,
          });
        }
        if (Object.keys(data).length > 0) {
          if (options.execute) {
            await prisma.stock.update({ where: { id: stock.id }, data });
            await recordRepair(prisma, stock, scope, { data, fieldsFilled });
          }
          summary.updatedCount += 1;
          for (const [field, count] of Object.entries(fieldsFilled)) {
            summary.fieldsFilled[field] = (summary.fieldsFilled[field] || 0) + count;
          }
        } else if (options.execute) {
          await recordRepair(prisma, stock, scope, { data: {}, fieldsFilled });
        }
      } catch (error) {
        summary.failedCount += 1;
        const message = error instanceof Error ? error.message : 'unknown recovery failure';
        summary.failures.push({ symbol: stock.symbol, error: message });
        if (options.execute) {
          await recordRepair(prisma, stock, scope, { data: {}, fieldsFilled: {}, error: message });
        }
      }
    }

    const afterRows = await missingSectorStocks(prisma, { ...options, offset: 0, limit: null, symbols: null });
    summary.afterMissingSector = afterRows.length;
    summary.completedAt = new Date().toISOString();
    summary.durationMs = Date.now() - startedAt.getTime();
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
