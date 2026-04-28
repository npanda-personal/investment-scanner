import YahooFinance from 'yahoo-finance2';
import type { PrismaClient } from '@prisma/client';
import { setTimeout } from 'timers/promises';
import type {
  CorporateAction,
  CompanyMasterData,
  CoreFundamentals,
  FxRateInput,
  HistoricalPrice,
  RegionInfo,
  SearchResult,
} from './market-data-foundation.types';
import { partitionHistoricalPrices } from './market-data-foundation.validation';

export type {
  CorporateAction,
  CompanyMasterData,
  CoreFundamentals,
  FxRateInput,
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

  private toSplitRatio(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parts = value.split(':').map((part) => Number(part));
      if (parts.length === 2 && parts.every((part) => Number.isFinite(part)) && parts[1] !== 0) {
        return parts[0] / parts[1];
      }
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
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
        adjustedClose: item.adjClose ?? item.adjclose ?? item.adjustedClose ?? null,
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
        modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail', 'price'],
      });

      const financialData = summary?.financialData || {};
      const keyStats = summary?.defaultKeyStatistics || {};
      const summaryDetail = summary?.summaryDetail || {};
      const price = summary?.price || {};

      return {
        symbol,
        revenue: this.toNumber(financialData.totalRevenue),
        eps: this.toNumber(keyStats.trailingEps) ?? this.toNumber(keyStats.forwardEps),
        earnings: this.toNumber(financialData.netIncomeToCommon),
        dividendYield: this.toNumber(summaryDetail.dividendYield),
        sharesOutstanding: this.toNumber(keyStats.sharesOutstanding),
        marketCap: this.toNumber(price.marketCap) ?? this.toNumber(summaryDetail.marketCap),
        currency: typeof price.currency === 'string' ? price.currency : null,
        periodType: 'TTM',
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
        eps: null,
        earnings: null,
        dividendYield: null,
        sharesOutstanding: null,
        marketCap: null,
        currency: null,
        periodType: 'TTM',
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
      const [dividendResult, splitResult] = await Promise.allSettled([
        this.yahooFinance.historical(symbol, {
          period1: new Date('1970-01-01'),
          period2: new Date(),
          events: 'dividends',
        }),
        this.yahooFinance.historical(symbol, {
          period1: new Date('1970-01-01'),
          period2: new Date(),
          events: 'split',
        }),
      ]);

      if (dividendResult.status === 'rejected') {
        console.warn(`Failed to fetch dividends for ${symbol}:`, dividendResult.reason);
      }
      if (splitResult.status === 'rejected') {
        console.warn(`Failed to fetch splits for ${symbol}:`, splitResult.reason);
      }

      const dividendRows = dividendResult.status === 'fulfilled' ? dividendResult.value as any[] : [];
      const splitRows = splitResult.status === 'fulfilled' ? splitResult.value as any[] : [];

      const dividendActions = dividendRows.flatMap((row) => {
        const date = row.date instanceof Date ? row.date.toISOString() : new Date(row.date).toISOString();
        const actions: CorporateAction[] = [];

        if (this.toNumber(row.dividends) !== null) {
          actions.push({
            symbol,
            type: 'dividend',
            date,
            value: row.dividends,
            amount: this.toNumber(row.dividends),
            splitRatio: null,
            currency: null,
            source: 'yahoo',
          });
        }
        if (row.stockSplits !== undefined && row.stockSplits !== null) {
          const splitRatio = this.toNumber(row.stockSplits);
          actions.push({
            symbol,
            type: splitRatio !== null && splitRatio > 0 && splitRatio < 1 ? 'reverse_split' : 'split',
            date,
            value: row.stockSplits,
            amount: null,
            splitRatio,
            currency: null,
            source: 'yahoo',
          });
        }

        return actions;
      });

      const splitActions = splitRows.flatMap((row) => {
        const date = row.date instanceof Date ? row.date.toISOString() : new Date(row.date).toISOString();
        const splitRatio = this.toSplitRatio(row.stockSplits);
        if (splitRatio === null) {
          return [];
        }

        return [{
          symbol,
          type: splitRatio > 0 && splitRatio < 1 ? 'reverse_split' : 'split',
          date,
          value: row.stockSplits,
          amount: null,
          splitRatio,
          currency: null,
          source: 'yahoo',
        } satisfies CorporateAction];
      });

      return [...dividendActions, ...splitActions].sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error(`Failed to fetch corporate actions for ${symbol}:`, error);
      return [];
    }
  }

  async fetchCompanyMasterData(symbol: string): Promise<CompanyMasterData> {
    try {
      const summary = await this.yahooFinance.quoteSummary(symbol, {
        modules: ['price', 'summaryProfile'],
      });
      const price = summary?.price || {};
      const profile = summary?.summaryProfile || {};
      const inferred = this.inferRegion(symbol);

      return {
        symbol,
        companyName: typeof price.longName === 'string' ? price.longName : typeof price.shortName === 'string' ? price.shortName : null,
        exchange: typeof price.exchangeName === 'string' ? price.exchangeName : inferred.exchange || null,
        country: typeof profile.country === 'string' ? profile.country : inferred.region || null,
        sector: typeof profile.sector === 'string' ? profile.sector : null,
        industry: typeof profile.industry === 'string' ? profile.industry : null,
        currency: typeof price.currency === 'string' ? price.currency : null,
        marketCap: this.toNumber(price.marketCap),
        assetType: typeof price.quoteType === 'string' ? price.quoteType : 'EQUITY',
        isDelisted: false,
        ipoDate: null,
        source: 'yahoo',
        dataStatus: 'PARTIAL',
      };
    } catch (error) {
      console.error(`Failed to fetch company master data for ${symbol}:`, error);
      const inferred = this.inferRegion(symbol);
      return {
        symbol,
        companyName: null,
        exchange: inferred.exchange || null,
        country: inferred.region || null,
        sector: null,
        industry: null,
        currency: null,
        marketCap: null,
        assetType: 'EQUITY',
        isDelisted: null,
        ipoDate: null,
        source: 'yahoo',
        dataStatus: 'MISSING',
      };
    }
  }

  async fetchFxRate(pair: string): Promise<FxRateInput | null> {
    const normalizedPair = pair.replace('/', '').toUpperCase();
    const baseCurrency = normalizedPair.slice(0, 3);
    const quoteCurrency = normalizedPair.slice(3, 6);
    if (baseCurrency.length !== 3 || quoteCurrency.length !== 3) {
      return null;
    }

    try {
      const quote = await this.yahooFinance.quote(`${baseCurrency}${quoteCurrency}=X`);
      const rate = this.toNumber((quote as any)?.regularMarketPrice);
      if (rate === null) {
        return null;
      }

      return {
        pair: `${baseCurrency}/${quoteCurrency}`,
        baseCurrency,
        quoteCurrency,
        rate,
        rateTimestamp: new Date(),
        source: 'yahoo',
        dataStatus: 'COMPLETE',
      };
    } catch (error) {
      console.error(`Failed to fetch FX rate for ${pair}:`, error);
      return null;
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
