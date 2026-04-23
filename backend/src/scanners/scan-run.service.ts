import { PrismaClient, Prisma } from '@prisma/client';
import * as ti from 'technicalindicators';
import defaultPrisma from '../db/prisma';

export interface ScanResultDTO {
  id: string;
  symbol: string;
  signalType: string;
  strength: number;
  description: string;
  explanation: string;
  stocks: string[];
  timestamp: string;
}

export interface ScanRunDTO {
  id: string;
  userId: string;
  createdAt: string;
  results: ScanResultDTO[];
}

/** Minimum number of price ticks required to compute indicators. */
const MIN_TICKS = 30;

/** Number of recent trading days to load for each stock. */
const LOOKBACK_DAYS = 90;

// ── Signal type definitions ────────────────────

interface SignalGroup {
  symbol: string;          // signal identifier (e.g. 'VOLUME_SPIKE')
  signalType: string;      // 'positive' | 'warning' | 'neutral'
  strength: number;        // 0..1
  description: string;     // template with {count} placeholder
  explanation: string;     // template with {count} placeholder
  match: (indicators: Record<string, number>, bar: OHLCVBar) => boolean;
}

interface OHLCVBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** All signal definitions the scanner checks against every stock. */
const SIGNAL_DEFINITIONS: SignalGroup[] = [
  {
    symbol: 'VOLUME_SPIKE',
    signalType: 'positive',
    strength: 0.8,
    description: 'Unusually high volume detected in {count} stock(s) suggesting institutional interest',
    explanation: 'Volume > 2x 20-day average with positive price change indicates accumulation',
    match: (ind, bar) => {
      const avgVol = ind.VOLUME_AVG;
      const change = ind.priceChange ?? 0;
      return !!avgVol && bar.volume > avgVol * 2 && change > 0;
    },
  },
  {
    symbol: 'ACCUMULATION',
    signalType: 'positive',
    strength: 0.7,
    description: 'Price up + volume up pattern in {count} stock(s)',
    explanation: 'Consistent buying pressure with above-average volume suggests smart money accumulation',
    match: (ind, bar) => {
      const avgVol = ind.VOLUME_AVG;
      const change = ind.priceChange ?? 0;
      return !!avgVol && bar.volume > avgVol * 1.3 && change > 2;
    },
  },
  {
    symbol: 'DISTRIBUTION',
    signalType: 'warning',
    strength: 0.6,
    description: 'Price down with high volume in {count} stock(s)',
    explanation: 'Selling pressure with elevated volume may indicate distribution',
    match: (ind, bar) => {
      const avgVol = ind.VOLUME_AVG;
      const change = ind.priceChange ?? 0;
      return !!avgVol && bar.volume > avgVol * 1.5 && change < -2;
    },
  },
  {
    symbol: 'RSI_OVERSOLD',
    signalType: 'positive',
    strength: 0.7,
    description: 'RSI oversold bounce opportunity in {count} stock(s)',
    explanation: 'RSI below 30 suggests stock is oversold and may reverse upward',
    match: (ind) => ind.RSI !== undefined && ind.RSI < 30,
  },
  {
    symbol: 'RSI_OVERBOUGHT',
    signalType: 'warning',
    strength: 0.6,
    description: 'RSI overbought in {count} stock(s) — caution advised',
    explanation: 'RSI above 70 suggests stock is overbought and may reverse downward',
    match: (ind) => ind.RSI !== undefined && ind.RSI > 70,
  },
  {
    symbol: 'EMA_CROSSOVER_BULLISH',
    signalType: 'positive',
    strength: 0.75,
    description: 'Bullish EMA crossover in {count} stock(s)',
    explanation: 'EMA9 crossed above EMA20 — short-term momentum turning bullish',
    match: (ind) => {
      if (ind.ema9 === undefined || ind.ema20 === undefined) return false;
      return ind.ema9 > ind.ema20;
    },
  },
  {
    symbol: 'EMA_CROSSOVER_BEARISH',
    signalType: 'warning',
    strength: 0.65,
    description: 'Bearish EMA crossover in {count} stock(s)',
    explanation: 'EMA9 crossed below EMA20 — short-term momentum turning bearish',
    match: (ind) => {
      if (ind.ema9 === undefined || ind.ema20 === undefined) return false;
      return ind.ema9 < ind.ema20;
    },
  },
  {
    symbol: 'MACD_BULLISH',
    signalType: 'positive',
    strength: 0.7,
    description: 'MACD bullish in {count} stock(s)',
    explanation: 'MACD above signal line indicates bullish momentum',
    match: (ind) => {
      if (ind.MACD === undefined || ind.MACD_SIGNAL === undefined) return false;
      return ind.MACD > ind.MACD_SIGNAL;
    },
  },
  {
    symbol: 'MOMENTUM_SHIFT',
    signalType: 'neutral',
    strength: 0.5,
    description: 'Momentum shift detected in {count} stock(s)',
    explanation: 'Price change > 4% with above-average volume suggests momentum shift',
    match: (ind, bar) => {
      const avgVol = ind.VOLUME_AVG;
      const change = ind.priceChange ?? 0;
      return !!avgVol && bar.volume > avgVol * 1.2 && Math.abs(change) > 4;
    },
  },
  {
    symbol: 'PRICE_SURGE',
    signalType: 'positive',
    strength: 0.6,
    description: 'Price surge in {count} stock(s)',
    explanation: 'Price increased more than 5% in a single session',
    match: (ind) => {
      const change = ind.priceChange ?? 0;
      return change > 5;
    },
  },
  {
    symbol: 'PRICE_DECLINE',
    signalType: 'warning',
    strength: 0.55,
    description: 'Price decline in {count} stock(s)',
    explanation: 'Price dropped more than 5% in a single session',
    match: (ind) => {
      const change = ind.priceChange ?? 0;
      return change < -5;
    },
  },
];

export class ScanRunService {
  public prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  /**
   * Run a scan: fetch stocks from DB, compute indicators, detect signals,
   * persist ScanRun + ScanResults, return DTO.
   */
  async runScan(userId: string): Promise<ScanRunDTO> {
    // 1. Fetch all active stocks from the database
    const stocks = await this.prisma.stock.findMany({
      where: { isActive: true },
      select: { symbol: true },
    });

    if (stocks.length === 0) {
      // No stocks to scan — create an empty scan run
      const scanRun = await this.prisma.$transaction(async (tx) => {
        const run = await tx.scanRun.create({
          data: {
            userId,
            strategyConfig: {
              type: 'smart-money',
              description: 'Price + Volume pattern detection',
            } as Prisma.InputJsonValue,
          },
        });
        return run;
      });
      return this.getScanRun(scanRun.id);
    }

    const symbols = stocks.map((s) => s.symbol);

    // 2. Load recent price data for all stocks
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - LOOKBACK_DAYS);

    const allTicks = await this.prisma.priceTick.findMany({
      where: {
        symbol: { in: symbols },
        timestamp: { gte: lookbackDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group ticks by symbol
    const ticksBySymbol = new Map<string, typeof allTicks>();
    for (const tick of allTicks) {
      const arr = ticksBySymbol.get(tick.symbol);
      if (arr) {
        arr.push(tick);
      } else {
        ticksBySymbol.set(tick.symbol, [tick]);
      }
    }

    // 3. Compute indicators for each stock and detect signals
    //    Map<signalSymbol, Set<stockSymbol>>
    const signalStockMap = new Map<string, Set<string>>();

    for (const symbol of symbols) {
      const ticks = ticksBySymbol.get(symbol);
      if (!ticks || ticks.length < MIN_TICKS) continue;

      const bars: OHLCVBar[] = ticks.map((t) => ({
        timestamp: t.timestamp,
        open: Number(t.open),
        high: Number(t.high),
        low: Number(t.low),
        close: Number(t.close),
        volume: Number(t.volume),
      }));

      const indicators = this.computeIndicators(bars);
      if (!indicators) continue;

      // Get the latest bar for volume-based checks
      const latestBar = bars[bars.length - 1];

      // Check each signal definition
      for (const def of SIGNAL_DEFINITIONS) {
        if (def.match(indicators, latestBar)) {
          let stocks = signalStockMap.get(def.symbol);
          if (!stocks) {
            stocks = new Set<string>();
            signalStockMap.set(def.symbol, stocks);
          }
          stocks.add(symbol);
        }
      }
    }

    // 4. Build signal results from the map
    const signals: Array<{
      symbol: string;
      signalType: string;
      strength: number;
      description: string;
      explanation: string;
      stocks: string[];
    }> = [];

    for (const def of SIGNAL_DEFINITIONS) {
      const matchedStocks = signalStockMap.get(def.symbol);
      if (!matchedStocks || matchedStocks.size === 0) continue;

      const stockList = Array.from(matchedStocks).sort();
      signals.push({
        symbol: def.symbol,
        signalType: def.signalType,
        strength: def.strength,
        description: def.description.replace('{count}', String(stockList.length)),
        explanation: def.explanation,
        stocks: stockList,
      });
    }

    // 5. Persist ScanRun + ScanResults in a transaction
    const scanRun = await this.prisma.$transaction(async (tx) => {
      const run = await tx.scanRun.create({
        data: {
          userId,
          strategyConfig: {
            type: 'smart-money',
            description: 'Price + Volume pattern detection',
          } as Prisma.InputJsonValue,
        },
      });

      for (const signal of signals) {
        await tx.scanResult.create({
          data: {
            scanRunId: run.id,
            symbol: signal.symbol,
            signalType: signal.signalType,
            strength: signal.strength,
            metadata: {
              description: signal.description,
              explanation: signal.explanation,
              stocks: signal.stocks,
            } as Prisma.InputJsonValue,
          },
        });
      }

      return run;
    });

    return this.getScanRun(scanRun.id);
  }

  /**
   * Fetch a ScanRun by ID with all its results.
   */
  async getScanRun(scanRunId: string): Promise<ScanRunDTO> {
    const run = await this.prisma.scanRun.findUnique({
      where: { id: scanRunId },
      include: { results: { orderBy: { timestamp: 'desc' } } },
    });

    if (!run) {
      throw new Error('ScanRun not found');
    }

    return this.toDTO(run);
  }

  // ── Private helpers ───────────────────────────

  /**
   * Compute technical indicators for a sorted array of OHLCV bars.
   * Returns the indicators for the LAST bar, or null if insufficient data.
   */
  private computeIndicators(bars: OHLCVBar[]): Record<string, number> | null {
    if (bars.length < MIN_TICKS) return null;

    const closes = bars.map((b) => b.close);
    const volumes = bars.map((b) => b.volume);

    // Compute full indicator series
    const rsiValues = ti.RSI.calculate({ values: closes, period: 14 });
    const macdResult = ti.MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const ema9 = ti.EMA.calculate({ values: closes, period: 9 });
    const ema20 = ti.EMA.calculate({ values: closes, period: 20 });
    const ema50 = ti.EMA.calculate({ values: closes, period: 50 });

    // Offsets: indicator arrays are shorter by (period - 1)
    const rsiOffset = closes.length - rsiValues.length;
    const macdOffset = closes.length - macdResult.length;
    const ema9Offset = closes.length - ema9.length;
    const ema20Offset = closes.length - ema20.length;
    const ema50Offset = closes.length - ema50.length;

    const i = bars.length - 1; // last bar index
    const indicators: Record<string, number> = {};

    // RSI
    const rsiIdx = i - rsiOffset;
    if (rsiIdx >= 0 && rsiIdx < rsiValues.length) {
      indicators.RSI = rsiValues[rsiIdx];
    }

    // MACD
    const macdIdx = i - macdOffset;
    if (macdIdx >= 0 && macdIdx < macdResult.length) {
      indicators.MACD = macdResult[macdIdx].MACD ?? 0;
      indicators.MACD_SIGNAL = macdResult[macdIdx].signal ?? 0;
      indicators.MACD_HISTOGRAM = macdResult[macdIdx].histogram ?? 0;
    }

    // EMAs
    const ema9Idx = i - ema9Offset;
    if (ema9Idx >= 0 && ema9Idx < ema9.length) indicators.ema9 = ema9[ema9Idx];
    const ema20Idx = i - ema20Offset;
    if (ema20Idx >= 0 && ema20Idx < ema20.length) indicators.ema20 = ema20[ema20Idx];
    const ema50Idx = i - ema50Offset;
    if (ema50Idx >= 0 && ema50Idx < ema50.length) indicators.ema50 = ema50[ema50Idx];

    // Volume average (20-day)
    if (i >= 20) {
      const slice = volumes.slice(i - 20, i);
      indicators.VOLUME_AVG = slice.reduce((a, b) => a + b, 0) / slice.length;
    }

    // Price change (1-day)
    if (i > 0) {
      indicators.priceChange = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
    }

    return indicators;
  }

  private toDTO(run: any): ScanRunDTO {
    return {
      id: run.id,
      userId: run.userId,
      createdAt: run.createdAt.toISOString(),
      results: run.results.map((r: any) => ({
        id: r.id,
        symbol: r.symbol,
        signalType: r.signalType,
        strength: r.strength,
        description: (r.metadata as any)?.description ?? '',
        explanation: (r.metadata as any)?.explanation ?? '',
        stocks: (r.metadata as any)?.stocks ?? [],
        timestamp: r.timestamp.toISOString(),
      })),
    };
  }
}
