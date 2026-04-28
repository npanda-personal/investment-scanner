import YahooFinance from 'yahoo-finance2';
import type { PrismaClient } from '@prisma/client';
import { setTimeout } from 'timers/promises';
import type {
  CorporateAction,
  CoreFundamentals,
  HistoricalPrice,
  RegionInfo,
  SearchResult,
} from './market-data-foundation.types';
import { partitionHistoricalPrices } from './market-data-foundation.validation';

export type {
  CorporateAction,
  CoreFundamentals,
  HistoricalPrice,
  RegionInfo,
  SearchResult,
} from './market-data-foundation.types';

export class YahooFinanceIngestionService {
  private batchDelayMs: number;
  private yahooFinance: any;

  constructor(private readonly prisma?: PrismaClient, batchDelayMs: number = 1000) {
    this.batchDelayMs = batchDelayMs;
    this.yahooFinance = new YahooFinance();
  }

  private toNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  /**
   * Infer region and exchange from symbol (basic heuristic).
   * This can be extended with a proper mapping.
   */
  inferRegion(symbol: string): RegionInfo {
    // Simple mapping based on suffix or prefix
    if (symbol.endsWith('.DE')) return { region: 'EU', exchange: 'XETRA' };
    if (symbol.endsWith('.L')) return { region: 'UK', exchange: 'LSE' };
    if (symbol.endsWith('.TO')) return { region: 'CA', exchange: 'TSX' };
    if (symbol.endsWith('.V')) return { region: 'CA', exchange: 'TSXV' };
    if (symbol.endsWith('.AS')) return { region: 'EU', exchange: 'Euronext' };
    if (symbol.endsWith('.PA')) return { region: 'EU', exchange: 'Euronext' };
    if (symbol.endsWith('.MI')) return { region: 'EU', exchange: 'Borsa Italiana' };
    // Indian exchanges
    if (symbol.endsWith('.NS')) return { region: 'IN', exchange: 'NSE' };
    if (symbol.endsWith('.BO')) return { region: 'IN', exchange: 'BSE' };
    if (symbol.includes('.')) {
      // Generic fallback: assume US with exchange suffix
      const parts = symbol.split('.');
      return { region: 'US', exchange: parts[1] };
    }
    // Default assumption: US stock
    return { region: 'US', exchange: 'NASDAQ' };
  }

  /**
   * Search for symbols using Yahoo Finance search.
   */
  async search(query: string): Promise<SearchResult[]> {
    try {
      const response = await this.yahooFinance.search(query);
      // The yahoo-finance2 search returns an object with a 'quotes' array
      const quotes = Array.isArray(response) ? response : response.quotes || [];
      const results: SearchResult[] = [];
      for (const item of quotes) {
        if (!item.symbol) continue;
        try {
          const region = this.inferRegion(item.symbol).region;
          results.push({
            symbol: item.symbol,
            name: item.name || '',
            type: item.type || '',
            exchange: item.exchange || '',
            region,
          });
        } catch (err) {
          // skip items with region inference errors
          continue;
        }
      }
      return results;
    } catch (error) {
      console.error(`Failed to search for "${query}":`, error);
      throw error;
    }
  }

  /**
   * Fetch historical daily data for a symbol from Yahoo Finance.
   * @param symbol Yahoo Finance symbol (e.g., 'AAPL', 'VOW.DE')
   * @param startDate start date (default: 30 days ago)
   * @param endDate end date (default: today)
   */
  async fetchHistorical(
    symbol: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<HistoricalPrice[]> {
    const queryOptions = {
      period1: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      period2: endDate || new Date(),
      interval: '1d' as const,
    };

    try {
      // yahooFinance.historical returns an array of historical quotes
      const result = (await this.yahooFinance.historical(symbol, queryOptions)) as any[];
      const prices = result.map((item: any) => ({
        symbol,
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      }));
      const validation = partitionHistoricalPrices(prices);
      if (validation.invalid.length > 0) {
        console.warn(
          `Skipped ${validation.invalid.length} malformed historical price rows for ${symbol}`
        );
      }
      return validation.valid;
    } catch (error) {
      console.error(`Failed to fetch historical data for ${symbol}:`, error);
      throw error;
    }
  }

  async fetchCoreFundamentals(symbol: string): Promise<CoreFundamentals> {
    try {
      const summary = await this.yahooFinance.quoteSummary(symbol, {
        modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail'],
      });

      const financialData = summary?.financialData || {};
      const keyStats = summary?.defaultKeyStatistics || {};
      const summaryDetail = summary?.summaryDetail || {};

      return {
        symbol,
        revenue: this.toNumber(financialData.totalRevenue),
        earnings: this.toNumber(financialData.netIncomeToCommon),
        ratios: {
          trailingPe: this.toNumber(summaryDetail.trailingPE),
          forwardPe: this.toNumber(summaryDetail.forwardPE),
          priceToBook: this.toNumber(keyStats.priceToBook),
          profitMargins: this.toNumber(financialData.profitMargins),
          returnOnEquity: this.toNumber(financialData.returnOnEquity),
          debtToEquity: this.toNumber(financialData.debtToEquity),
        },
        source: 'yahoo',
        asOf: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to fetch fundamentals for ${symbol}:`, error);
      return {
        symbol,
        revenue: null,
        earnings: null,
        ratios: {
          trailingPe: null,
          forwardPe: null,
          priceToBook: null,
          profitMargins: null,
          returnOnEquity: null,
          debtToEquity: null,
        },
        source: 'yahoo',
        asOf: new Date().toISOString(),
      };
    }
  }

  async fetchCorporateActions(symbol: string): Promise<CorporateAction[]> {
    try {
      const rows = (await this.yahooFinance.historical(symbol, {
        period1: new Date('1970-01-01'),
        period2: new Date(),
        events: 'dividends|splits',
      })) as any[];

      return rows.flatMap((row) => {
        const date = row.date instanceof Date ? row.date.toISOString() : new Date(row.date).toISOString();
        const actions: CorporateAction[] = [];

        if (this.toNumber(row.dividends) !== null) {
          actions.push({
            symbol,
            type: 'dividend',
            date,
            value: row.dividends,
            source: 'yahoo',
          });
        }
        if (row.stockSplits !== undefined && row.stockSplits !== null) {
          actions.push({
            symbol,
            type: 'split',
            date,
            value: row.stockSplits,
            source: 'yahoo',
          });
        }

        return actions;
      });
    } catch (error) {
      console.error(`Failed to fetch corporate actions for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Store a list of historical prices into PriceTick table.
   * Also updates the LatestPrice table.
   */
  async storeHistorical(prices: HistoricalPrice[]): Promise<void> {
    const { MarketDataFoundationRepository } = await import('./market-data-foundation.repository');
    const repository = new MarketDataFoundationRepository(this.prisma);
    await repository.storeHistorical(prices, this.inferRegion.bind(this));
  }

  /**
   * Fetch and store historical data for a single symbol with delay.
   * Uses incremental loading based on lastSuccessfulDataLoadTimestamp.
   */
  async ingestSymbol(
    symbol: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    const { MarketDataFoundationRepository } = await import('./market-data-foundation.repository');
    const { MarketDataFoundationService } = await import('./market-data-foundation.service');
    const repository = new MarketDataFoundationRepository(this.prisma);
    const service = new MarketDataFoundationService(repository, this);
    await service.ingestSymbol(symbol, startDate, endDate);
  }

  /**
   * Batch ingestion for multiple symbols with rate limiting.
   */
  async ingestSymbols(
    symbols: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    for (const symbol of symbols) {
      try {
        await this.ingestSymbol(symbol, startDate, endDate);
        await setTimeout(this.batchDelayMs); // respect rate limits
      } catch (error) {
        console.error(`Ingestion failed for ${symbol}:`, error);
        // Continue with next symbol
      }
    }
  }

  /**
   * Close the Prisma client (call when service is no longer needed).
   */
  async disconnect(): Promise<void> {
    await this.prisma?.$disconnect();
  }
}
