import YahooFinance from 'yahoo-finance2';
import type { PrismaClient } from '@prisma/client';
import { setTimeout } from 'timers/promises';
import type {
  CorporateAction,
  CompanyMasterData,
  CoreFundamentals,
  FxRateInput,
  HistoricalPrice,
  ProviderValidationResult,
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
  ProviderValidationResult,
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

  private toDate(value: unknown): Date {
    return value instanceof Date ? value : new Date(value as any);
  }

  private normalizeYahooAssetType(value: unknown, symbol: string): string {
    const quoteType = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (quoteType === 'EQUITY') return 'STOCK';
    if (quoteType === 'ETF' || quoteType === 'INDEX' || quoteType === 'FUTURE' || quoteType === 'CRYPTO' || quoteType === 'FUND') return quoteType;
    if (quoteType === 'CURRENCY' || quoteType === 'FX') return 'FOREX';
    if (symbol.includes('=X')) return 'FOREX';
    if (symbol.toUpperCase().includes('FUT')) return 'FUTURE';
    if (symbol.startsWith('^')) return 'INDEX';
    if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return 'STOCK';
    return quoteType || 'UNKNOWN';
  }

  private inferCountry(symbol: string, exchange?: string | null, providerCountry?: string | null): string | null {
    if (providerCountry) return providerCountry;
    const normalizedExchange = exchange?.trim().toUpperCase();
    if (symbol.endsWith('.NS') || symbol.endsWith('.BO') || normalizedExchange === 'NSE' || normalizedExchange === 'BSE') return 'India';
    const inferred = this.inferRegion(symbol).region;
    if (inferred === 'US') return 'United States';
    if (inferred === 'UK') return 'United Kingdom';
    return inferred || null;
  }

  private inferCurrency(symbol: string, exchange?: string | null, providerCurrency?: string | null): string | null {
    if (providerCurrency) return providerCurrency;
    const normalizedExchange = exchange?.trim().toUpperCase();
    if (symbol.endsWith('.NS') || symbol.endsWith('.BO') || normalizedExchange === 'NSE' || normalizedExchange === 'BSE') return 'INR';
    const inferred = this.inferRegion(symbol).region;
    if (inferred === 'UK') return 'GBP';
    if (inferred === 'EU') return 'EUR';
    if (inferred === 'CA') return 'CAD';
    if (inferred === 'US') return 'USD';
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
      const result = await this.yahooFinance.chart(symbol, { ...queryOptions, return: 'array' });
      const quotes = Array.isArray(result?.quotes) ? result.quotes : [];
      const prices = quotes.map((item: any) => {
        const providerAdjustedClose = item.adjClose ?? item.adjclose ?? item.adjustedClose ?? null;
        return {
          symbol,
          date: this.toDate(item.date),
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          adjustedClose: providerAdjustedClose,
          volume: item.volume,
        };
      });
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

  async validateProviderSymbol(symbol: string, options: {
    region?: string;
    assetType?: string;
    validationWindowStartDate?: Date;
    validationWindowEndDate?: Date;
    timeoutMs?: number;
  } = {}): Promise<ProviderValidationResult> {
    const started = Date.now();
    const timeoutMs = Math.min(Math.max(Number(options.timeoutMs) || 8000, 1000), 15000);
    const validationWindowEndDate = options.validationWindowEndDate || new Date();
    const validationWindowStartDate = options.validationWindowStartDate || new Date(validationWindowEndDate.getTime() - 45 * 24 * 60 * 60 * 1000);
    const windowStart = validationWindowStartDate.toISOString().slice(0, 10);
    const windowEnd = validationWindowEndDate.toISOString().slice(0, 10);
    try {
      const result: any = await this.withTimeout(this.yahooFinance.chart(symbol, {
        period1: validationWindowStartDate,
        period2: validationWindowEndDate,
        interval: '1d',
        return: 'array',
      }), timeoutMs);
      const quotes = Array.isArray(result?.quotes) ? result.quotes : [];
      const providerCallMs = Date.now() - started;
      if (quotes.length > 0) {
        return {
          supported: true,
          classification: 'SUPPORTED_WITH_CANDLES',
          provider: 'yahoo',
          providerSymbol: symbol,
          candlesFound: quotes.length,
          providerCallMs,
          validationWindowStartDate: windowStart,
          validationWindowEndDate: windowEnd,
          sourceName: 'YAHOO_CHART',
        };
      }
      const isIndianStock = options.region?.toUpperCase() === 'IN' && (options.assetType?.toUpperCase() || 'STOCK') === 'STOCK';
      return {
        supported: false,
        failed: isIndianStock,
        classification: isIndianStock ? 'FREE_FALLBACK_REQUIRED' : 'UNSUPPORTED_NO_CANDLES_WIDE_WINDOW',
        provider: 'yahoo',
        providerSymbol: symbol,
        candlesFound: 0,
        providerCallMs,
        validationWindowStartDate: windowStart,
        validationWindowEndDate: windowEnd,
        sourceName: 'YAHOO_CHART',
        fallbackSourceAttempted: null,
        freeFallbackRequired: isIndianStock,
        message: isIndianStock
          ? 'Yahoo returned no daily candles over the completed-EOD validation window; approved free exchange EOD fallback is required before marking unsupported.'
          : 'Provider returned no daily candles over the validation window.',
      };
    } catch (error) {
      const providerCallMs = Date.now() - started;
      const message = error instanceof Error ? error.message : 'Provider validation failed.';
      const isTimeout = error instanceof Error && error.name === 'ProviderValidationTimeoutError';
      const isRateLimit = /rate|429|too many requests|throttle/i.test(message);
      return {
        supported: false,
        failed: true,
        classification: isTimeout ? 'RETRYABLE_TIMEOUT' : isRateLimit ? 'RETRYABLE_RATE_LIMITED' : 'RETRYABLE_PROVIDER_ERROR',
        provider: 'yahoo',
        providerSymbol: symbol,
        candlesFound: 0,
        providerCallMs,
        validationWindowStartDate: windowStart,
        validationWindowEndDate: windowEnd,
        sourceName: 'YAHOO_CHART',
        message,
      };
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = globalThis.setTimeout(() => {
        const error = new Error(`Provider validation timed out after ${timeoutMs}ms.`);
        error.name = 'ProviderValidationTimeoutError';
        reject(error);
      }, timeoutMs);
      promise.then(
        (value) => {
          globalThis.clearTimeout(timeout);
          resolve(value);
        },
        (error) => {
          globalThis.clearTimeout(timeout);
          reject(error);
        }
      );
    });
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
      const result = await this.yahooFinance.chart(symbol, {
        period1: new Date('1970-01-01'),
        period2: new Date(),
        interval: '1d',
        events: 'div|split',
        return: 'array',
      });

      const dividendRows = Array.isArray(result?.events?.dividends) ? result.events.dividends : [];
      const splitRows = Array.isArray(result?.events?.splits) ? result.events.splits : [];

      const dividendActions = dividendRows.flatMap((row: any) => {
        const date = this.toDate(row.date).toISOString();
        const amount = this.toNumber(row.amount);
        if (amount === null) {
          return [];
        }

        return [{
          symbol,
          type: 'dividend',
          date,
          value: amount,
          amount,
          splitRatio: null,
          currency: null,
          source: 'yahoo',
        } satisfies CorporateAction];
      });

      const splitActions = splitRows.flatMap((row: any) => {
        const date = this.toDate(row.date).toISOString();
        const splitRatio = this.toSplitRatio(row.splitRatio) ?? (
          this.toNumber(row.numerator) !== null && this.toNumber(row.denominator) !== null && this.toNumber(row.denominator)! !== 0
            ? this.toNumber(row.numerator)! / this.toNumber(row.denominator)!
            : null
        );
        if (splitRatio === null) {
          return [];
        }

        return [{
          symbol,
          type: splitRatio > 0 && splitRatio < 1 ? 'reverse_split' : 'split',
          date,
          value: row.splitRatio ?? splitRatio,
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
      const exchange = typeof price.exchangeName === 'string' ? price.exchangeName : inferred.exchange || null;

      return {
        symbol,
        companyName: typeof price.longName === 'string' ? price.longName : typeof price.shortName === 'string' ? price.shortName : null,
        exchange,
        country: this.inferCountry(symbol, exchange, typeof profile.country === 'string' ? profile.country : null),
        sector: typeof profile.sector === 'string' ? profile.sector : null,
        industry: typeof profile.industry === 'string' ? profile.industry : null,
        currency: this.inferCurrency(symbol, exchange, typeof price.currency === 'string' ? price.currency : null),
        marketCap: this.toNumber(price.marketCap),
        assetType: this.normalizeYahooAssetType(price.quoteType, symbol),
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
        country: this.inferCountry(symbol, inferred.exchange, null),
        sector: null,
        industry: null,
        currency: this.inferCurrency(symbol, inferred.exchange, null),
        marketCap: null,
        assetType: this.normalizeYahooAssetType(null, symbol),
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
