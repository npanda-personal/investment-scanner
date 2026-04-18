import { PrismaClient } from '@prisma/client';
import defaultPrisma from '../db/prisma';
import * as ti from 'technicalindicators';

export type LogicalOperator = 'and' | 'or' | 'not';

export interface PriceCondition {
  type: 'price';
  field: 'open' | 'high' | 'low' | 'close' | 'volume';
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: number;
}

export interface IndicatorCondition {
  type: 'indicator';
  name: 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BB' | 'STOCH' | 'ADX' | 'ATR' | 'OBV' | 'WILLR' | 'CCI' | 'ROC';
  parameters: Record<string, any>;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: number;
}

export interface ChangeCondition {
  type: 'change';
  period: '1d' | '1w' | '1m';
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: number;
}

export interface FundamentalCondition {
  type: 'fundamental';
  field: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: number;
}

export type PrimitiveCondition = PriceCondition | IndicatorCondition | ChangeCondition | FundamentalCondition;

export interface LogicalCondition {
  operator: LogicalOperator;
  conditions: ConditionNode[];
}

export type ConditionNode = PrimitiveCondition | LogicalCondition;

export function isLogicalCondition(node: ConditionNode): node is LogicalCondition {
  return 'operator' in node && 'conditions' in node;
}

export interface MarketData {
  symbol: string;
  latestPrice?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    timestamp: Date;
  };
  historicalPrices?: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    timestamp: Date;
  }>;
}

export class ConditionEvaluator {
  private _prisma: PrismaClient;

  constructor(_prisma?: PrismaClient) {
    this._prisma = _prisma || defaultPrisma;
  }

  /**
   * Fetch market data for a symbol (latest price + historical prices).
   */
  async fetchMarketData(symbol: string): Promise<MarketData> {
    // Fetch latest price tick
    const latest = await this._prisma.priceTick.findFirst({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
    });
    if (!latest) {
      throw new Error(`No price data found for symbol ${symbol}`);
    }

    // Fetch historical price ticks (last 200 days) for indicator calculations
    const historicalCutoff = new Date();
    historicalCutoff.setDate(historicalCutoff.getDate() - 200);
    const historical = await this._prisma.priceTick.findMany({
      where: {
        symbol,
        timestamp: { gte: historicalCutoff },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Convert Decimal fields to numbers
    const decimalToNumber = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val);
      // Assume it's a Decimal with toNumber method
      return val.toNumber ? val.toNumber() : parseFloat(val.toString());
    };

    const marketData: MarketData = {
      symbol,
      latestPrice: {
        open: decimalToNumber(latest.open),
        high: decimalToNumber(latest.high),
        low: decimalToNumber(latest.low),
        close: decimalToNumber(latest.close),
        volume: latest.volume ? decimalToNumber(latest.volume) : undefined,
        timestamp: latest.timestamp,
      },
      historicalPrices: historical.map(tick => ({
        open: decimalToNumber(tick.open),
        high: decimalToNumber(tick.high),
        low: decimalToNumber(tick.low),
        close: decimalToNumber(tick.close),
        volume: tick.volume ? decimalToNumber(tick.volume) : undefined,
        timestamp: tick.timestamp,
      })),
    };
    return marketData;
  }

  /**
   * Evaluate a condition node against given market data.
   */
  evaluate(node: ConditionNode, data: MarketData): boolean {
    // Legacy condition shape detection (expression tree with left/right/operator)
    const legacyNode = node as any;
    if (legacyNode.left && legacyNode.right && legacyNode.operator && !legacyNode.type && !legacyNode.conditions) {
      // Convert to a price condition
      const left = legacyNode.left;
      const right = legacyNode.right;
      if (left.type === 'field' && left.value === 'price' && right.type === 'literal') {
        const priceCondition: PriceCondition = {
          type: 'price',
          field: 'close', // map generic price field to close price
          operator: legacyNode.operator as '>' | '>=' | '<' | '<=' | '==' | '!=',
          value: right.value
        };
        return this.evaluatePrimitive(priceCondition, data);
      }
      // Could support other fields, but for now fallback to error
      throw new Error(`Unsupported legacy condition shape: ${JSON.stringify(node)}`);
    }
    if (isLogicalCondition(node)) {
      return this.evaluateLogical(node, data);
    } else {
      return this.evaluatePrimitive(node, data);
    }
  }

  private evaluateLogical(node: LogicalCondition, data: MarketData): boolean {
    switch (node.operator) {
      case 'and':
        return node.conditions.every(cond => this.evaluate(cond, data));
      case 'or':
        return node.conditions.some(cond => this.evaluate(cond, data));
      case 'not':
        // Expect exactly one condition
        return !this.evaluate(node.conditions[0], data);
      default:
        throw new Error(`Unknown logical operator: ${node.operator}`);
    }
  }

  private evaluatePrimitive(condition: PrimitiveCondition, data: MarketData): boolean {
    console.log('[ConditionEvaluator] Evaluating primitive condition:', JSON.stringify(condition));
    switch (condition.type) {
      case 'price':
        return this.evaluatePrice(condition, data);
      case 'indicator':
        return this.evaluateIndicator(condition, data);
      case 'change':
        return this.evaluateChange(condition, data);
      case 'fundamental':
        // TODO: implement when fundamental data is available
        return false;
      default:
        throw new Error(`Unknown primitive condition type: ${(condition as any).type}`);
    }
  }

  private evaluatePrice(condition: PriceCondition, data: MarketData): boolean {
    const price = data.latestPrice;
    if (!price) {
      throw new Error('No latest price data available');
    }
    const fieldValue = price[condition.field];
    if (fieldValue === undefined) {
      throw new Error(`Price field ${condition.field} not available`);
    }
    return this.compare(fieldValue, condition.operator, condition.value);
  }

  private evaluateIndicator(condition: IndicatorCondition, data: MarketData): boolean {
    if (!data.historicalPrices || data.historicalPrices.length === 0) {
      throw new Error('No historical price data available for indicator calculation');
    }
    // Convert historical prices to arrays
    const closes = data.historicalPrices.map(p => p.close);
    const highs = data.historicalPrices.map(p => p.high);
    const lows = data.historicalPrices.map(p => p.low);
    const volumes = data.historicalPrices.map(p => p.volume || 0);
    let indicatorValue: number;
    switch (condition.name) {
      case 'RSI':
        indicatorValue = this.calculateRSI(closes, condition.parameters.period || 14);
        break;
      case 'SMA':
        indicatorValue = this.calculateSMA(closes, condition.parameters.period || 20);
        break;
      case 'EMA':
        indicatorValue = this.calculateEMA(closes, condition.parameters.period || 20);
        break;
      case 'MACD':
        const macd = this.calculateMACD(closes, condition.parameters);
        // Use MACD histogram or signal line? For simplicity, use histogram.
        const lastMACD = macd[macd.length - 1];
        indicatorValue = lastMACD.histogram!;
        break;
      case 'BB':
        const bb = this.calculateBB(closes, condition.parameters);
        const lastBB = bb[bb.length - 1];
        indicatorValue = lastBB.middle!;
        break;
      case 'STOCH':
        indicatorValue = this.calculateSTOCH(highs, lows, closes, condition.parameters);
        break;
      case 'ADX':
        indicatorValue = this.calculateADX(highs, lows, closes, condition.parameters);
        break;
      case 'ATR':
        indicatorValue = this.calculateATR(highs, lows, closes, condition.parameters);
        break;
      case 'OBV':
        indicatorValue = this.calculateOBV(closes, volumes, condition.parameters);
        break;
      case 'WILLR':
        indicatorValue = this.calculateWILLR(highs, lows, closes, condition.parameters);
        break;
      case 'CCI':
        indicatorValue = this.calculateCCI(highs, lows, closes, condition.parameters);
        break;
      case 'ROC':
        indicatorValue = this.calculateROC(closes, condition.parameters);
        break;
      default:
        throw new Error(`Unsupported indicator: ${condition.name}`);
    }
    return this.compare(indicatorValue, condition.operator, condition.value);
  }

  private evaluateChange(condition: ChangeCondition, data: MarketData): boolean {
    if (!data.historicalPrices || data.historicalPrices.length < 2) {
      throw new Error('Insufficient historical data for change calculation');
    }
    // Determine lookback based on period (simplified)
    let lookback = 1;
    if (condition.period === '1w') lookback = 5;
    if (condition.period === '1m') lookback = 20;
    if (data.historicalPrices.length < lookback + 1) {
      throw new Error(`Not enough data for ${condition.period} change`);
    }
    const recent = data.historicalPrices.slice(-lookback - 1);
    const oldClose = recent[0].close;
    const newClose = recent[recent.length - 1].close;
    const percentChange = (newClose - oldClose) / oldClose;
    return this.compare(percentChange, condition.operator, condition.value);
  }

  private compare(a: number, operator: string, b: number): boolean {
    switch (operator) {
      case '>': return a > b;
      case '>=': return a >= b;
      case '<': return a < b;
      case '<=': return a <= b;
      case '==': return Math.abs(a - b) < 1e-9;
      case '!=': return Math.abs(a - b) >= 1e-9;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  // Indicator calculation wrappers using technicalindicators library
  private calculateRSI(closes: number[], period: number): number {
    const rsi = ti.RSI.calculate({ values: closes, period });
    return rsi[rsi.length - 1];
  }

  private calculateSMA(closes: number[], period: number): number {
    const sma = ti.SMA.calculate({ values: closes, period });
    return sma[sma.length - 1];
  }

  private calculateEMA(closes: number[], period: number): number {
    const ema = ti.EMA.calculate({ values: closes, period });
    return ema[ema.length - 1];
  }

  private calculateMACD(closes: number[], params: any) {
    const defaultParams = { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
    const merged = { ...defaultParams, ...params };
    return ti.MACD.calculate({
      values: closes,
      fastPeriod: merged.fastPeriod,
      slowPeriod: merged.slowPeriod,
      signalPeriod: merged.signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
  }

  private calculateBB(closes: number[], params: any) {
    const defaultParams = { period: 20, stdDev: 2 };
    const merged = { ...defaultParams, ...params };
    return ti.BollingerBands.calculate({
      values: closes,
      period: merged.period,
      stdDev: merged.stdDev,
    });
  }

  private calculateSTOCH(highs: number[], lows: number[], closes: number[], params: any): number {
    const defaultParams = { period: 14, signalPeriod: 3 };
    const merged = { ...defaultParams, ...params };
    const result = ti.Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: merged.period,
      signalPeriod: merged.signalPeriod,
    });
    // Return %K (fast stochastic)
    return result[result.length - 1].k;
  }

  private calculateADX(highs: number[], lows: number[], closes: number[], params: any): number {
    const defaultParams = { period: 14 };
    const merged = { ...defaultParams, ...params };
    const result = ti.ADX.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: merged.period,
    });
    return result[result.length - 1].adx;
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], params: any): number {
    const defaultParams = { period: 14 };
    const merged = { ...defaultParams, ...params };
    const result = ti.ATR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: merged.period,
    });
    return result[result.length - 1];
  }

  private calculateOBV(closes: number[], volumes: number[], _params: any): number {
    // OBV does not have parameters
    const result = ti.OBV.calculate({
      close: closes,
      volume: volumes,
    });
    return result[result.length - 1];
  }

  private calculateWILLR(highs: number[], lows: number[], closes: number[], params: any): number {
    const defaultParams = { period: 14 };
    const merged = { ...defaultParams, ...params };
    const result = ti.WilliamsR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: merged.period,
    });
    return result[result.length - 1];
  }

  private calculateCCI(highs: number[], lows: number[], closes: number[], params: any): number {
    const defaultParams = { period: 20 };
    const merged = { ...defaultParams, ...params };
    const result = ti.CCI.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: merged.period,
    });
    return result[result.length - 1];
  }

  private calculateROC(closes: number[], params: any): number {
    const defaultParams = { period: 12 };
    const merged = { ...defaultParams, ...params };
    const result = ti.ROC.calculate({
      values: closes,
      period: merged.period,
    });
    return result[result.length - 1];
  }
}