/**
 * Instrument Context Snapshot Service — persisted-read only.
 *
 * Assembles the stock's CURRENT context from already-persisted read models.
 * No data production, no network calls, no generation on GET.
 *
 * Fields assembled:
 *   - marketRegime      : latest persisted MarketContextSnapshot (RISK_ON/NEUTRAL/RISK_OFF + score)
 *   - sector            : stock's sector from the instrument catalog
 *   - sectorStrength    : from latest persisted SectorSnapshot for that sector
 *   - relativeStrength  : stock return vs ^NSEI 63-bar return (from persisted prices)
 *   - smartMoneyStatus  : from latest persisted SmartMoneyContextSnapshot (3M range)
 *   - fnoBan            : is the symbol in the latest fno_ban_list?
 *   - latestSignal      : latest persisted SignalResult for this instrument
 */

import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface InstrumentContextField<T = string | null> {
  value: T;
  source: string;
  asOf: string | null;
  absent: boolean;
}

export interface InstrumentContextSnapshotDto {
  instrumentId: string;
  symbol: string;
  sector: string | null;
  assembledAt: string;

  /** Market regime from latest persisted MarketContextSnapshot */
  marketRegime: InstrumentContextField<{
    regime: string;
    score: number;
    explanation: string;
  } | null>;

  /** This stock's sector + classification from latest SectorSnapshot */
  sectorStrength: InstrumentContextField<{
    sector: string;
    classification: string;
    sectorScore: number | null;
    return1W: number | null;
    return1M: number | null;
    return3M: number | null;
  } | null>;

  /** Stock 63-bar return vs ^NSEI 63-bar return from persisted prices */
  relativeStrength: InstrumentContextField<{
    stockReturn63d: number | null;
    benchmarkReturn63d: number | null;
    relativeReturn63d: number | null;
    rsPercentile: number | null;
  } | null>;

  /** Smart-money accumulation/distribution from latest persisted snapshot */
  smartMoney: InstrumentContextField<{
    status: string;
    score: number;
    confidence: string;
  } | null>;

  /** F&O ban flag from latest persisted fno_ban_list */
  fnoBan: InstrumentContextField<{
    banned: boolean;
    banDate: string | null;
  } | null>;

  /** Latest persisted signal direction + score */
  latestSignal: InstrumentContextField<{
    direction: string;
    score: number;
    confidence: string;
    generatedDate: string | null;
  } | null>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function absent<T>(source: string): InstrumentContextField<T | null> {
  return { value: null, source, asOf: null, absent: true };
}

function present<T>(value: T, source: string, asOf: string | null): InstrumentContextField<T> {
  return { value, source, asOf, absent: false };
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

// ---------------------------------------------------------------------------
// Market regime — read from persisted MarketContextSnapshot
// ---------------------------------------------------------------------------

async function loadMarketRegime(): Promise<InstrumentContextField<{ regime: string; score: number; explanation: string } | null>> {
  try {
    const row = await prisma.marketContextSnapshot.findFirst({
      where: { region: 'GLOBAL' },
      orderBy: [{ snapshotDate: 'desc' }, { updatedAt: 'desc' }],
      select: { regime: true, regimeScore: true, explanation: true, snapshotDate: true },
    });
    if (!row) return absent('MarketContextSnapshot (no rows for region=GLOBAL)');
    return present(
      {
        regime: row.regime,
        score: row.regimeScore ?? 0,
        explanation: row.explanation ?? '',
      },
      'MarketContextSnapshot',
      toIsoDate(row.snapshotDate),
    );
  } catch {
    return absent('MarketContextSnapshot (read error)');
  }
}

// ---------------------------------------------------------------------------
// Sector strength — read from latest persisted SectorSnapshot for this sector
// ---------------------------------------------------------------------------

async function loadSectorStrength(sector: string | null): Promise<InstrumentContextField<{
  sector: string;
  classification: string;
  sectorScore: number | null;
  return1W: number | null;
  return1M: number | null;
  return3M: number | null;
} | null>> {
  if (!sector) return absent('SectorSnapshot (instrument has no sector)');
  try {
    const row = await (prisma as any).sectorSnapshot.findFirst({
      where: { sector },
      orderBy: [{ snapshotDate: 'desc' }],
      select: {
        sector: true,
        classification: true,
        sectorScore: true,
        return1W: true,
        return1M: true,
        return3M: true,
        snapshotDate: true,
      },
    }).catch(() => null);
    if (!row) return absent(`SectorSnapshot (no rows for sector="${sector}")`);
    return present(
      {
        sector: row.sector,
        classification: row.classification ?? 'UNKNOWN',
        sectorScore: row.sectorScore !== undefined ? row.sectorScore : null,
        return1W: row.return1W !== undefined ? row.return1W : null,
        return1M: row.return1M !== undefined ? row.return1M : null,
        return3M: row.return3M !== undefined ? row.return3M : null,
      },
      'SectorSnapshot',
      toIsoDate(row.snapshotDate),
    );
  } catch {
    return absent('SectorSnapshot (read error)');
  }
}

// ---------------------------------------------------------------------------
// Relative strength — from persisted price_ticks / latest_prices
// ---------------------------------------------------------------------------

async function loadRelativeStrength(_instrumentId: string, symbol: string): Promise<InstrumentContextField<{
  stockReturn63d: number | null;
  benchmarkReturn63d: number | null;
  relativeReturn63d: number | null;
  rsPercentile: number | null;
} | null>> {
  const LOOKBACK = 64; // 63-bar return needs 64 prices
  const NSEI_SYMBOL = '^NSEI';

  try {
    const [stockPrices, nseiPrices] = await Promise.all([
      // Stock prices from price_ticks (adjustedClose preferred, else close)
      prisma.priceTick.findMany({
        where: { symbol },
        orderBy: { timestamp: 'desc' },
        take: LOOKBACK,
        select: { adjustedClose: true, close: true, timestamp: true },
      }),
      // ^NSEI prices
      prisma.priceTick.findMany({
        where: { symbol: NSEI_SYMBOL },
        orderBy: { timestamp: 'desc' },
        take: LOOKBACK,
        select: { adjustedClose: true, close: true, timestamp: true },
      }),
    ]);

    // Use adjustedClose consistently when at least half the rows have it,
    // otherwise fall back to raw close. Never mix them across rows — mixing
    // produces nonsensical returns when only recent bars have adjustedClose.
    const toClose = (rows: Array<{ adjustedClose: any; close: any }>) => {
      const adjCount = rows.filter((r) => r.adjustedClose !== null && r.adjustedClose !== undefined).length;
      const useAdj = adjCount >= rows.length / 2 && adjCount > 0;
      return rows
        .map((r) => useAdj ? Number(r.adjustedClose) : Number(r.close))
        .filter((v) => Number.isFinite(v) && v > 0);
    };

    const stockCloses = toClose(stockPrices);
    const nseiCloses = toClose(nseiPrices);

    const stockReturn63d =
      stockCloses.length >= 64
        ? (stockCloses[0] - stockCloses[63]) / stockCloses[63]
        : stockCloses.length >= 2
          ? (stockCloses[0] - stockCloses[stockCloses.length - 1]) / stockCloses[stockCloses.length - 1]
          : null;

    const benchmarkReturn63d =
      nseiCloses.length >= 64
        ? (nseiCloses[0] - nseiCloses[63]) / nseiCloses[63]
        : nseiCloses.length >= 2
          ? (nseiCloses[0] - nseiCloses[nseiCloses.length - 1]) / nseiCloses[nseiCloses.length - 1]
          : null;

    const relativeReturn63d =
      stockReturn63d !== null && benchmarkReturn63d !== null
        ? stockReturn63d - benchmarkReturn63d
        : null;

    if (stockReturn63d === null) {
      return absent('PriceTick (insufficient price history for instrument)');
    }

    const asOf = stockPrices[0]?.timestamp ? toIsoDate(stockPrices[0].timestamp) : null;

    return present(
      { stockReturn63d, benchmarkReturn63d, relativeReturn63d, rsPercentile: null },
      'PriceTick (63-bar return vs ^NSEI)',
      asOf,
    );
  } catch {
    return absent('PriceTick (read error)');
  }
}

// ---------------------------------------------------------------------------
// Smart money — from latest persisted SmartMoneyContextSnapshot
// ---------------------------------------------------------------------------

async function loadSmartMoney(instrumentId: string): Promise<InstrumentContextField<{
  status: string;
  score: number;
  confidence: string;
} | null>> {
  try {
    const row = await prisma.smartMoneyContextSnapshot.findFirst({
      where: { instrumentId, range: '3M' },
      orderBy: [{ snapshotDate: 'desc' }, { updatedAt: 'desc' }],
      select: { status: true, smartMoneyScore: true, confidence: true, snapshotDate: true },
    });
    if (!row) return absent('SmartMoneyContextSnapshot (no 3M snapshot for this instrument)');
    if (row.status === 'INSUFFICIENT_DATA') {
      return absent('SmartMoneyContextSnapshot (status=INSUFFICIENT_DATA)');
    }
    return present(
      {
        status: row.status,
        score: row.smartMoneyScore,
        confidence: row.confidence,
      },
      'SmartMoneyContextSnapshot',
      toIsoDate(row.snapshotDate),
    );
  } catch {
    return absent('SmartMoneyContextSnapshot (read error)');
  }
}

// ---------------------------------------------------------------------------
// F&O ban — from latest persisted fno_ban_list
// ---------------------------------------------------------------------------

async function loadFnoBan(symbol: string): Promise<InstrumentContextField<{
  banned: boolean;
  banDate: string | null;
} | null>> {
  try {
    const dateRows = await prisma.$queryRaw<Array<{ ban_date: Date }>>(
      Prisma.sql`SELECT ban_date FROM fno_ban_list ORDER BY ban_date DESC LIMIT 1`,
    );
    if (dateRows.length === 0) {
      return absent('fno_ban_list (no rows — run POST /api/v1/smart-money/fno-ban/ingest)');
    }
    const latestDate = dateRows[0].ban_date;
    const symbolRows = await prisma.$queryRaw<Array<{ symbol: string }>>(
      Prisma.sql`SELECT symbol FROM fno_ban_list WHERE ban_date = ${latestDate} AND symbol = ${symbol.toUpperCase()} LIMIT 1`,
    );
    const banned = symbolRows.length > 0;
    const banDateStr = latestDate.toISOString().slice(0, 10);
    return present({ banned, banDate: banDateStr }, 'fno_ban_list', banDateStr);
  } catch {
    return absent('fno_ban_list (table missing or read error — run ingest first)');
  }
}

// ---------------------------------------------------------------------------
// Latest signal — from persisted SignalResult
// ---------------------------------------------------------------------------

async function loadLatestSignal(instrumentId: string): Promise<InstrumentContextField<{
  direction: string;
  score: number;
  confidence: string;
  generatedDate: string | null;
} | null>> {
  try {
    const row = await prisma.signalResult.findFirst({
      where: { instrumentId },
      orderBy: { generatedAt: 'desc' },
      select: { direction: true, score: true, confidence: true, generatedAt: true, generatedDate: true },
    });
    if (!row) return absent('SignalResult (no signal for this instrument)');
    return present(
      {
        direction: row.direction,
        score: row.score,
        confidence: row.confidence,
        generatedDate: toIsoDate(row.generatedAt),
      },
      'SignalResult',
      toIsoDate(row.generatedAt),
    );
  } catch {
    return absent('SignalResult (read error)');
  }
}

// ---------------------------------------------------------------------------
// Main assembler
// ---------------------------------------------------------------------------

export async function assembleInstrumentContext(instrumentId: string): Promise<InstrumentContextSnapshotDto | null> {
  // Look up the instrument to get symbol and sector
  const instrument = await prisma.stock.findUnique({
    where: { id: instrumentId },
    select: { id: true, symbol: true, sector: true },
  });
  if (!instrument) return null;

  const [marketRegime, sectorStrength, relativeStrength, smartMoney, fnoBan, latestSignal] =
    await Promise.all([
      loadMarketRegime(),
      loadSectorStrength(instrument.sector ?? null),
      loadRelativeStrength(instrumentId, instrument.symbol),
      loadSmartMoney(instrumentId),
      loadFnoBan(instrument.symbol),
      loadLatestSignal(instrumentId),
    ]);

  return {
    instrumentId,
    symbol: instrument.symbol,
    sector: instrument.sector ?? null,
    assembledAt: new Date().toISOString(),
    marketRegime,
    sectorStrength,
    relativeStrength,
    smartMoney,
    fnoBan,
    latestSignal,
  };
}
