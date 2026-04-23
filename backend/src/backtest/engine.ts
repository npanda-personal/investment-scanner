import { PrismaClient } from '@prisma/client';
import * as ti from 'technicalindicators';
import defaultPrisma from '../db/prisma';
import { getTrend, getDecision, getSetupType, getRiskLevel, getEntryQuality } from '../scanners/ranking-engine';
import { Signal } from '../types/scanner-extended';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface BacktestConfigInput {
  startDate: Date;
  endDate: Date;
  initialCapital?: number;
  stopLoss?: number;          // e.g. 0.05 = 5%
  takeProfit?: number;        // e.g. 0.10 = 10%
  maxHoldingDays?: number;    // default 10
  positionSizeFraction?: number; // fraction of capital per position, default 1/N
  symbols: string[];
}

export interface TradeRecord {
  symbol: string;
  entryDate: Date;
  exitDate: Date;
  entryPrice: number;
  exitPrice: number;
  return: number;             // fractional return
  holdingDays: number;
  maxDrawdown: number;        // peak-to-trough during the trade (fraction)
  maxProfit: number;          // peak profit during the trade (fraction)
  exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'MAX_HOLDING' | 'SIGNAL_REVERSAL';
}

export interface EquityPoint {
  timestamp: Date;
  equity: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  totalTrades: number;
}

export interface BacktestOutput {
  tradeLedger: TradeRecord[];
  equityCurve: EquityPoint[];
  metrics: BacktestMetrics;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

interface OHLCVBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Compute Sharpe ratio from daily returns (annualized, risk-free = 0). */
function computeSharpe(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((acc, r) => acc + (r - mean) ** 2, 0) /
    (dailyReturns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  // Annualise: ~252 trading days
  return (mean / std) * Math.sqrt(252);
}

/** Compute max drawdown from an equity curve (fraction). */
function computeMaxDrawdown(equityCurve: EquityPoint[]): number {
  let peak = equityCurve[0]?.equity ?? 0;
  let maxDd = 0;
  for (const pt of equityCurve) {
    if (pt.equity > peak) peak = pt.equity;
    const dd = (peak - pt.equity) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

// ──────────────────────────────────────────────
// BacktestEngine
// ──────────────────────────────────────────────

export class BacktestEngine {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  // ── Public entry point ──────────────────────

  async run(config: BacktestConfigInput): Promise<BacktestOutput> {
    const {
      startDate,
      endDate,
      initialCapital = 10_000,
      stopLoss,
      takeProfit,
      maxHoldingDays = 10,
      positionSizeFraction,
      symbols,
    } = config;

    // 1. Load historical OHLCV for all symbols
    const marketData = await this.loadHistoricalData(symbols, startDate, endDate);

    // 2. Build a unified timeline of all trading days (sorted)
    const allDates = this.buildDateGrid(marketData);
    if (allDates.length < 2) {
      return {
        tradeLedger: [],
        equityCurve: [{ timestamp: startDate, equity: initialCapital }],
        metrics: {
          totalReturn: 0,
          winRate: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          profitFactor: 0,
          totalTrades: 0,
        },
      };
    }

    // 3. Pre-compute indicators for each symbol at each date
    const indicatorsCache = this.preComputeIndicators(marketData);

    // 4. Simulation state
    const tradeLedger: TradeRecord[] = [];
    const equityCurve: EquityPoint[] = [];
    let cash = initialCapital;
    // positions: Map<symbol, { entryDate, entryPrice, shares, highWaterMark }>
    const positions = new Map<string, {
      entryDate: Date;
      entryPrice: number;
      shares: number;
      highWaterMark: number;
      lowWaterMark: number;
    }>();

    // Daily portfolio value tracker for return series
    const dailyPortfolioValues: number[] = [];

    // 5. Walk through each trading day
    for (let dayIdx = 0; dayIdx < allDates.length; dayIdx++) {
      const currentDate = allDates[dayIdx];

      // ── 5a. Check exit conditions for open positions ──
      for (const [sym, pos] of positions) {
        const bar = marketData.get(sym)?.find(
          (b) => b.timestamp.getTime() === currentDate.getTime()
        );
        if (!bar) continue;

        const currentPrice = bar.close;
        const holdingDays =
          (currentDate.getTime() - pos.entryDate.getTime()) /
          (1000 * 60 * 60 * 24);

        // Update watermarks
        if (currentPrice > pos.highWaterMark) pos.highWaterMark = currentPrice;
        if (currentPrice < pos.lowWaterMark) pos.lowWaterMark = currentPrice;

        let exitReason: TradeRecord['exitReason'] | null = null;

        // Stop loss
        if (stopLoss !== undefined) {
          const lossPct = (currentPrice - pos.entryPrice) / pos.entryPrice;
          if (lossPct <= -stopLoss) exitReason = 'STOP_LOSS';
        }

        // Take profit
        if (exitReason === null && takeProfit !== undefined) {
          const gainPct = (currentPrice - pos.entryPrice) / pos.entryPrice;
          if (gainPct >= takeProfit) exitReason = 'TAKE_PROFIT';
        }

        // Max holding period
        if (exitReason === null && holdingDays >= maxHoldingDays) {
          exitReason = 'MAX_HOLDING';
        }

        // Signal reversal (re-evaluate ranking for this symbol)
        if (exitReason === null) {
          const indicators = indicatorsCache.get(sym)?.get(currentDate.getTime());
          if (indicators) {
            const decision = this.evaluateDecision(indicators, bar);
            if (decision === 'AVOID') {
              exitReason = 'SIGNAL_REVERSAL';
            }
          }
        }

        if (exitReason !== null) {
          // Close position
          const exitValue = pos.shares * currentPrice;
          cash += exitValue;

          const tradeReturn = (currentPrice - pos.entryPrice) / pos.entryPrice;
          const maxDrawdownTrade =
            pos.entryPrice > 0
              ? (pos.highWaterMark - pos.lowWaterMark) / pos.highWaterMark
              : 0;
          const maxProfitTrade =
            pos.entryPrice > 0
              ? (pos.highWaterMark - pos.entryPrice) / pos.entryPrice
              : 0;

          tradeLedger.push({
            symbol: sym,
            entryDate: pos.entryDate,
            exitDate: currentDate,
            entryPrice: pos.entryPrice,
            exitPrice: currentPrice,
            return: tradeReturn,
            holdingDays: Math.round(holdingDays),
            maxDrawdown: maxDrawdownTrade,
            maxProfit: maxProfitTrade,
            exitReason,
          });

          positions.delete(sym);
        }
      }

      // ── 5b. Generate signals & open new positions ──
      const signalsToday: Array<{ symbol: string; decision: string; price: number }> = [];

      for (const sym of symbols) {
        const indicators = indicatorsCache.get(sym)?.get(currentDate.getTime());
        const bar = marketData.get(sym)?.find(
          (b) => b.timestamp.getTime() === currentDate.getTime()
        );
        if (!indicators || !bar) continue;

        // Skip if we already hold this symbol
        if (positions.has(sym)) continue;

        const decision = this.evaluateDecision(indicators, bar);
        if (decision === 'BUY' || decision === 'ACCUMULATE') {
          signalsToday.push({ symbol: sym, decision, price: bar.close });
        }
      }

      // Open new positions (equal-weight sizing)
      if (signalsToday.length > 0 && cash > 0) {
        const fraction =
          positionSizeFraction ?? (1 / signalsToday.length);
        const totalAllocated = Math.min(cash, cash * fraction * signalsToday.length);
        const perPosition = totalAllocated / signalsToday.length;

        for (const sig of signalsToday) {
          if (cash <= 0) break;
          const allocated = Math.min(perPosition, cash);
          const shares = allocated / sig.price;
          cash -= allocated;

          positions.set(sig.symbol, {
            entryDate: currentDate,
            entryPrice: sig.price,
            shares,
            highWaterMark: sig.price,
            lowWaterMark: sig.price,
          });
        }
      }

      // ── 5c. Record portfolio equity ──
      let portfolioValue = cash;
      for (const [sym, pos] of positions) {
        const bar = marketData.get(sym)?.find(
          (b) => b.timestamp.getTime() === currentDate.getTime()
        );
        const price = bar?.close ?? pos.entryPrice;
        portfolioValue += pos.shares * price;
      }

      equityCurve.push({ timestamp: currentDate, equity: portfolioValue });

      if (dayIdx > 0) {
        const prevValue = equityCurve[equityCurve.length - 2]?.equity ?? initialCapital;
        dailyPortfolioValues.push((portfolioValue - prevValue) / prevValue);
      }
    }

    // ── 6. Compute final metrics ──
    const finalEquity = equityCurve[equityCurve.length - 1]?.equity ?? initialCapital;
    const totalReturn = (finalEquity - initialCapital) / initialCapital;

    const wins = tradeLedger.filter((t) => t.return > 0).length;
    const winRate = tradeLedger.length > 0 ? wins / tradeLedger.length : 0;

    const grossProfit = tradeLedger
      .filter((t) => t.return > 0)
      .reduce((sum, t) => sum + t.return, 0);
    const grossLoss = tradeLedger
      .filter((t) => t.return <= 0)
      .reduce((sum, t) => sum + Math.abs(t.return), 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const maxDrawdown = computeMaxDrawdown(equityCurve);
    const sharpeRatio = computeSharpe(dailyPortfolioValues);

    return {
      tradeLedger,
      equityCurve,
      metrics: {
        totalReturn,
        winRate,
        sharpeRatio,
        maxDrawdown,
        profitFactor,
        totalTrades: tradeLedger.length,
      },
    };
  }

  // ── Data loading ────────────────────────────

  private async loadHistoricalData(
    symbols: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Map<string, OHLCVBar[]>> {
    const map = new Map<string, OHLCVBar[]>();

    // Fetch price ticks from DB with a generous buffer for indicator calculation
    const bufferStart = new Date(startDate);
    bufferStart.setDate(bufferStart.getDate() - 200);

    for (const symbol of symbols) {
      const ticks = await this.prisma.priceTick.findMany({
        where: {
          symbol,
          timestamp: { gte: bufferStart, lte: endDate },
        },
        orderBy: { timestamp: 'asc' },
      });

      const bars: OHLCVBar[] = ticks.map((t) => ({
        timestamp: t.timestamp,
        open: Number(t.open),
        high: Number(t.high),
        low: Number(t.low),
        close: Number(t.close),
        volume: t.volume ? Number(t.volume) : 0,
      }));

      map.set(symbol, bars);
    }

    return map;
  }

  // ── Date grid ───────────────────────────────

  private buildDateGrid(marketData: Map<string, OHLCVBar[]>): Date[] {
    const dateSet = new Set<number>();
    for (const [, bars] of marketData) {
      for (const bar of bars) {
        dateSet.add(bar.timestamp.getTime());
      }
    }
    return Array.from(dateSet)
      .sort((a, b) => a - b)
      .map((ts) => new Date(ts));
  }

  // ── Indicator pre-computation ───────────────

  private preComputeIndicators(
    marketData: Map<string, OHLCVBar[]>
  ): Map<string, Map<number, Record<string, number>>> {
    // symbol -> (timestamp -> indicators)
    const cache = new Map<string, Map<number, Record<string, number>>>();

    for (const [symbol, bars] of marketData) {
      if (bars.length < 30) continue; // not enough data

      const closes = bars.map((b) => b.close);
      const highs = bars.map((b) => b.high);
      const lows = bars.map((b) => b.low);
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
      const atrValues = ti.ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });

      // Offsets: indicator arrays are shorter by (period - 1)
      const rsiOffset = closes.length - rsiValues.length;
      const macdOffset = closes.length - macdResult.length;
      const ema9Offset = closes.length - ema9.length;
      const ema20Offset = closes.length - ema20.length;
      const ema50Offset = closes.length - ema50.length;
      const atrOffset = closes.length - atrValues.length;

      const symbolCache = new Map<number, Record<string, number>>();

      for (let i = 0; i < bars.length; i++) {
        const ts = bars[i].timestamp.getTime();
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

        // ATR
        const atrIdx = i - atrOffset;
        if (atrIdx >= 0 && atrIdx < atrValues.length) {
          indicators.ATR = atrValues[atrIdx];
        }

        // Volume average (20-day)
        if (i >= 20) {
          const slice = volumes.slice(i - 20, i);
          indicators.VOLUME_AVG = slice.reduce((a, b) => a + b, 0) / slice.length;
        }

        // Price change (1-day)
        if (i > 0) {
          indicators.priceChange = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
        }

        symbolCache.set(ts, indicators);
      }

      cache.set(symbol, symbolCache);
    }

    return cache;
  }

  // ── Decision evaluation ─────────────────────

  private evaluateDecision(
    indicators: Record<string, number>,
    bar: OHLCVBar
  ): 'BUY' | 'ACCUMULATE' | 'WAIT' | 'AVOID' {
    // Build a minimal EnhancedMarketData-like structure for the RankingEngine
    const dailyTrend = getTrend(indicators);

    // Compute a simple price change for setup type
    const priceChange = indicators.priceChange ?? 0;

    const setupType = getSetupType(indicators, priceChange, dailyTrend);
    const riskLevel = getRiskLevel(
      // alignmentScore approximation using trend
      dailyTrend === 'BULLISH' ? 70 : dailyTrend === 'BEARISH' ? 30 : 50,
      dailyTrend // use daily as a proxy for weekly in backtest context
    );
    const entryQuality = getEntryQuality(indicators, undefined, setupType);

    // Build a ScoredOpportunity-like object for the ranking engine
    // We re-use the existing getDecision function directly
    const signals: Signal[] = this.buildSignals(indicators);

    // Compute conviction score using ranking engine's logic
    const convictionScore = this.computeConvictionScore(indicators, bar, dailyTrend);

    const alignmentScore =
      dailyTrend === 'BULLISH' ? 70 :
      dailyTrend === 'BEARISH' ? 30 : 50;

    const trendStrength: 'STRONG' | 'MODERATE' | 'WEAK' =
      convictionScore >= 70 ? 'STRONG' :
      convictionScore >= 40 ? 'MODERATE' : 'WEAK';

    return getDecision({
      convictionScore,
      alignmentScore,
      dailyTrend,
      weeklyTrend: dailyTrend, // backtest context: use daily as proxy
      monthlyTrend: dailyTrend,
      setupType,
      riskLevel,
      entryQuality,
      trendStrength,
      signals,
    });
  }

  private computeConvictionScore(
    indicators: Record<string, number>,
    bar: OHLCVBar,
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  ): number {
    let score = 50; // baseline

    // RSI contribution
    const rsi = indicators.RSI;
    if (rsi !== undefined) {
      if (rsi < 30) score += 20;       // oversold — bullish
      else if (rsi < 40) score += 10;  // near oversold
      else if (rsi > 70) score -= 15;  // overbought — risky
    }

    // MACD contribution
    const macd = indicators.MACD;
    if (macd !== undefined && macd > 0) score += 10;

    // EMA alignment
    const ema9 = indicators.ema9;
    const ema20 = indicators.ema20;
    const ema50 = indicators.ema50;
    if (ema9 && ema20 && ema9 > ema20) score += 10;
    if (ema20 && ema50 && ema20 > ema50) score += 10;

    // Volume confirmation
    const avgVol = indicators.VOLUME_AVG;
    if (avgVol && bar.volume > avgVol * 1.5) score += 10;

    // Trend penalty
    if (trend === 'BEARISH') score *= 0.6;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  private buildSignals(indicators: Record<string, number>): Signal[] {
    const signals: Signal[] = [];
    const now = new Date();

    const rsi = indicators.RSI;
    if (rsi !== undefined) {
      if (rsi < 30) {
        signals.push({
          type: 'RSI',
          name: 'RSI_OVERSOLD',
          direction: 'BULLISH',
          strength: Math.max(0, 1 - rsi / 30),
          timestamp: now,
          metadata: { rsiValue: rsi },
        });
      } else if (rsi > 70) {
        signals.push({
          type: 'RSI',
          name: 'RSI_OVERBOUGHT',
          direction: 'BEARISH',
          strength: Math.max(0, (rsi - 70) / 30),
          timestamp: now,
          metadata: { rsiValue: rsi },
        });
      }
    }

    const macd = indicators.MACD;
    const macdSignal = indicators.MACD_SIGNAL;
    if (macd !== undefined && macdSignal !== undefined) {
      if (macd > macdSignal) {
        signals.push({
          type: 'MACD',
          name: 'MACD_BULLISH_CROSSOVER',
          direction: 'BULLISH',
          strength: 0.7,
          timestamp: now,
          metadata: { macd, signal: macdSignal },
        });
      } else {
        signals.push({
          type: 'MACD',
          name: 'MACD_BEARISH_CROSSOVER',
          direction: 'BEARISH',
          strength: 0.7,
          timestamp: now,
          metadata: { macd, signal: macdSignal },
        });
      }
    }

    const ema9 = indicators.ema9;
    const ema20 = indicators.ema20;
    if (ema9 !== undefined && ema20 !== undefined) {
      if (ema9 > ema20) {
        signals.push({
          type: 'EMA',
          name: 'EMA_CROSSOVER_BULLISH',
          direction: 'BULLISH',
          strength: 0.7,
          timestamp: now,
          metadata: { ema9, ema20 },
        });
      } else {
        signals.push({
          type: 'EMA',
          name: 'EMA_CROSSOVER_BEARISH',
          direction: 'BEARISH',
          strength: 0.7,
          timestamp: now,
          metadata: { ema9, ema20 },
        });
      }
    }

    return signals;
  }
}
