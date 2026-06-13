import { Prisma } from '@prisma/client';
import type { PaginationOptions, ProviderValidationQueue } from '../market-data-foundation.types';
import { normalizeMarketRegion, resolveMarketRegionFilter } from '../../../shared/utils/market-scope';
import { knownNseFnoStockUnderlyingSymbols } from '../ingestion/india/market-data-foundation.fno-underlyings';
import { PROVIDER_MARKET_DATA_SOURCES } from './market-data-foundation.repository.constants';

// Shared pure where-clause / sort builders for MarketDataFoundationRepository
// sub-repositories. Byte-for-byte relocations of the original private methods,
// rewritten as free functions (none referenced instance state). Pure relocation.

export function providerSourceWhere(): Prisma.StringNullableFilter {
    return {
      in: PROVIDER_MARKET_DATA_SOURCES,
      mode: 'insensitive',
    };
  }

export function scopedStockSqlWhere(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}): Prisma.Sql {
    const filters: Prisma.Sql[] = [];
    const normalizedRegion = normalizeMarketRegion(options.region);
    if (normalizedRegion) {
      switch (normalizedRegion) {
        case 'IN':
          filters.push(Prisma.sql`(
            stocks.region = ${'IN'}
            OR UPPER(stocks.country) IN (${Prisma.join(['IN', 'INDIA'])})
            OR UPPER(stocks.exchange) IN (${Prisma.join(['NSE', 'BSE'])})
          )`);
          break;
        case 'US':
          filters.push(Prisma.sql`(
            stocks.region = ${'US'}
            OR UPPER(stocks.country) IN (${Prisma.join(['US', 'USA', 'UNITED STATES'])})
            OR UPPER(stocks.exchange) IN (${Prisma.join(['NASDAQ', 'NYSE', 'AMEX'])})
          )`);
          break;
        case 'EU':
          filters.push(Prisma.sql`(
            stocks.region = ${'EU'}
            OR UPPER(stocks.country) IN (${Prisma.join(['UK', 'UNITED KINGDOM', 'DE', 'GERMANY', 'FR', 'FRANCE', 'IT', 'ITALY', 'ES', 'SPAIN', 'NL', 'NETHERLANDS'])})
            OR UPPER(stocks.exchange) IN (${Prisma.join(['LSE', 'XETRA', 'EURONEXT', 'BME'])})
          )`);
          break;
        default:
          filters.push(Prisma.sql`stocks.region = ${normalizedRegion}`);
          break;
      }
    }

    const normalizedAssetType = options.assetType?.trim().toUpperCase();
    if (normalizedAssetType) {
      if (normalizedAssetType === 'STOCK' || normalizedAssetType === 'EQUITY') {
        filters.push(Prisma.sql`(
          (
            UPPER(stocks."assetType") IN (${Prisma.join(['STOCK', 'EQUITY'])})
            OR stocks."assetType" IS NULL
          )
          AND NOT (
            UPPER(COALESCE(stocks."assetType", '')) IN (${Prisma.join(['FUTURE', 'FUTURES'])})
            OR UPPER(COALESCE(stocks."instrumentSegment", '')) = ${'FUTURES'}
          )
        )`);
      } else if (normalizedAssetType === 'FUTURE' || normalizedAssetType === 'FUTURES') {
        filters.push(Prisma.sql`(
          UPPER(stocks."assetType") IN (${Prisma.join(['FUTURE', 'FUTURES'])})
          OR UPPER(COALESCE(stocks."instrumentSegment", '')) = ${'FUTURES'}
        )`);
      } else if (normalizedAssetType === 'FOREX' || normalizedAssetType === 'FX' || normalizedAssetType === 'CURRENCY') {
        filters.push(Prisma.sql`UPPER(stocks."assetType") IN (${Prisma.join(['FOREX', 'FX', 'CURRENCY'])})`);
      } else {
        filters.push(Prisma.sql`UPPER(stocks."assetType") = ${normalizedAssetType}`);
      }
    }

    return filters.length > 0 ? Prisma.join(filters, ' AND ') : Prisma.sql`TRUE`;
  }

export function activeStockSyncTaskSqlWhere(options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'> = {}): Prisma.Sql {
    const filters: Prisma.Sql[] = [
      scopedStockSqlWhere(options),
      Prisma.sql`stocks."isActive" = TRUE`,
      Prisma.sql`stocks."isDelisted" = FALSE`,
      Prisma.sql`(
        stocks."providerSupportStatus" IS NULL
        OR UPPER(stocks."providerSupportStatus") IN (${Prisma.join(['SUPPORTED', 'UNKNOWN'])})
      )`,
    ];
    const normalizedSegment = options.instrumentSegment?.trim().toUpperCase();
    if (normalizedSegment) {
      if (normalizedSegment === 'CASH') {
        filters.push(Prisma.sql`(
          (
            UPPER(stocks."assetType") IN (${Prisma.join(['STOCK', 'EQUITY'])})
            OR stocks."assetType" IS NULL
          )
          AND NOT (
            UPPER(COALESCE(stocks."assetType", '')) IN (${Prisma.join(['FUTURE', 'FUTURES'])})
            OR UPPER(COALESCE(stocks."instrumentSegment", '')) = ${'FUTURES'}
          )
        )`);
      } else if (normalizedSegment === 'FUTURES') {
        filters.push(Prisma.sql`(
          UPPER(stocks."assetType") IN (${Prisma.join(['FUTURE', 'FUTURES'])})
          OR UPPER(COALESCE(stocks."instrumentSegment", '')) = ${'FUTURES'}
        )`);
      } else {
        filters.push(Prisma.sql`UPPER(COALESCE(stocks."instrumentSegment", stocks."assetType", '')) = ${normalizedSegment}`);
      }
    }
    return Prisma.join(filters, ' AND ');
  }

export function stockWhere(options: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'>): Prisma.StockWhereInput {
    const filters: Prisma.StockWhereInput[] = [];
    const regionFilter = resolveMarketRegionFilter(options.region);
    if (Object.keys(regionFilter).length > 0) filters.push(regionFilter);
    const assetType = options.assetType?.trim();
    if (assetType) {
      filters.push(assetTypeWhere(assetType));
    }
    const segWhere = segmentWhere(options.instrumentSegment);
    if (segWhere) filters.push(segWhere);
    return filters.length > 0 ? { AND: filters } : {};
  }

export function safeStockSortBy(sortBy?: string): string {
    const allowed = new Set(['symbol', 'name', 'marketCap', 'country', 'exchange', 'sector', 'industry', 'currency', 'assetType', 'lastSuccessfulDataLoadTimestamp', 'createdAt']);
    return allowed.has(sortBy || '') ? sortBy as any : 'symbol';
  }

export function assetTypeWhere(assetType: string): Prisma.StockWhereInput {
    const normalized = assetType.trim().toUpperCase();
    if (normalized === 'STOCK' || normalized === 'EQUITY') {
      return {
        AND: [
          {
            OR: [
              { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
              { assetType: null },
            ],
          },
          notFuturesSymbolWhere(),
        ],
      };
    }
    if (normalized === 'FUTURE' || normalized === 'FUTURES') return futuresWhere();
    if (normalized === 'FOREX' || normalized === 'FX' || normalized === 'CURRENCY') {
      return { assetType: { in: ['FOREX', 'FX', 'CURRENCY'], mode: 'insensitive' } };
    }
    return { assetType: { equals: normalized, mode: 'insensitive' } };
  }

export function segmentWhere(segment?: string | null): Prisma.StockWhereInput | null {
    const normalized = segment?.trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === 'CASH') {
      return {
        AND: [
          {
            OR: [
              { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
              { assetType: null },
            ],
          },
          notFuturesSymbolWhere(),
        ],
      };
    }
    if (normalized === 'FUTURES') return futuresWhere();
    if (normalized === 'CURRENCY') return { assetType: { in: ['FOREX', 'FX', 'CURRENCY'], mode: 'insensitive' } };
    if (['INDEX', 'ETF', 'COMMODITY', 'CRYPTO', 'FUND', 'OTHER', 'UNKNOWN'].includes(normalized)) {
      return { assetType: { equals: normalized, mode: 'insensitive' } };
    }
    return { assetType: { equals: '__NO_MATCH__', mode: 'insensitive' } };
  }

export function futuresWhere(): Prisma.StockWhereInput {
    return {
      OR: [
        { assetType: { in: ['FUTURE', 'FUTURES'], mode: 'insensitive' } },
        { instrumentSegment: { equals: 'FUTURES', mode: 'insensitive' } },
      ],
    };
  }

export function notFuturesSymbolWhere(): Prisma.StockWhereInput {
    return {
      NOT: [
        { assetType: { in: ['FUTURE', 'FUTURES'], mode: 'insensitive' } },
        { instrumentSegment: { equals: 'FUTURES', mode: 'insensitive' } },
      ],
    };
  }

export function currencyWhere(currency: string): Prisma.StockWhereInput {
    const normalized = currency.trim().toUpperCase();
    if (normalized === 'INR') {
      return {
        OR: [
          { currency: { equals: 'INR', mode: 'insensitive' } },
          {
            AND: [
              {
                OR: [
                  { region: 'IN' },
                  { country: { contains: 'India', mode: 'insensitive' } },
                  { exchange: { in: ['NSE', 'BSE'], mode: 'insensitive' } },
                  { symbol: { endsWith: '.NS', mode: 'insensitive' } },
                  { symbol: { endsWith: '.BO', mode: 'insensitive' } },
                ],
              },
              {
                OR: [
                  { currency: null },
                  { currency: '' },
                ],
              },
            ],
          },
        ],
      };
    }
    return { currency: { equals: normalized, mode: 'insensitive' } };
  }

export function derivativesEligibleWhere(eligible: boolean): Prisma.StockWhereInput {
    const known = knownNseFnoStockUnderlyingSymbols();
    const derivedEligible: Prisma.StockWhereInput = {
      OR: [
        { symbol: { in: known.map((symbol) => `${symbol}.NS`), mode: 'insensitive' } },
        { providerSymbol: { in: known.map((symbol) => `${symbol}.NS`), mode: 'insensitive' } },
        { sourceSymbol: { in: known, mode: 'insensitive' } },
        { displaySymbol: { in: known, mode: 'insensitive' } },
      ],
    };
    if (eligible) {
      return {
        OR: [
          { derivativesEligible: true },
          derivedEligible,
        ],
      };
    }
    return {
      AND: [
        {
          OR: [
            { derivativesEligible: false },
          ],
        },
        { NOT: derivedEligible },
      ],
    };
  }

export function businessMetadataRepairWhere(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    stateOptions: { includeManualRequired?: boolean; includeRetryable?: boolean } = {}
  ): Prisma.StockWhereInput {
    const and: Prisma.StockWhereInput[] = [
      stockWhere(options),
      { isActive: true },
      { isDelisted: false },
      { providerSupportStatus: { equals: 'SUPPORTED', mode: 'insensitive' } },
      businessMetadataMissingWhere(),
    ];
    const now = new Date();
    const excludedStates: Prisma.MarketDataRepairStateWhereInput[] = [];
    if (!stateOptions.includeManualRequired) excludedStates.push({ status: 'MANUAL_REQUIRED' } as any);
    if (!stateOptions.includeRetryable) {
      excludedStates.push(
        { status: 'RETRY_COOLDOWN' } as any,
        { status: 'FAILED_RETRYABLE', nextRetryAt: { gt: now } } as any
      );
    }
    if (excludedStates.length > 0) {
      and.push({
        marketDataRepairStates: {
          none: {
            repairType: 'PROVIDER_BUSINESS_METADATA',
            OR: excludedStates,
          },
        },
      } as any);
    }
    return { AND: and };
  }

export function providerValidationWhere(
    options: Pick<PaginationOptions, 'region' | 'assetType'>,
    queue: ProviderValidationQueue,
    stateOptions: { force?: boolean } = {}
  ): Prisma.StockWhereInput {
    const now = new Date();
    const retryStateWhere: Prisma.MarketDataRepairStateWhereInput = {
      repairType: 'PROVIDER_VALIDATION',
    } as any;
    if (!stateOptions.force) {
      (retryStateWhere as any).OR = [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }];
    }
    return {
      AND: [
        stockWhere(options),
        { isActive: true },
        { isDelisted: false },
        queue === 'RETRY_FAILED'
          ? {
            AND: [
              { providerSupportStatus: { equals: 'VALIDATION_FAILED', mode: 'insensitive' } },
              {
                OR: [
                  { marketDataRepairStates: { none: { repairType: 'PROVIDER_VALIDATION' } } } as any,
                  {
                    marketDataRepairStates: {
                      some: {
                        ...retryStateWhere,
                        status: { in: ['FAILED_RETRYABLE', 'RETRY_COOLDOWN'] },
                      } as any,
                    },
                  } as any,
                ],
              },
              { marketDataRepairStates: { none: { repairType: 'PROVIDER_VALIDATION', status: 'MANUAL_REQUIRED' } } } as any,
            ],
          }
          : {
            OR: [
              { providerSupportStatus: null },
              { providerSupportStatus: '' },
              { providerSupportStatus: { equals: 'UNKNOWN', mode: 'insensitive' } },
            ],
          },
      ],
    };
  }

export function businessMetadataMissingWhere(): Prisma.StockWhereInput {
    return {
      OR: [
        invalidStringWhere('sector'),
        invalidStringWhere('industry'),
        { marketCap: null },
        { marketCap: { lte: 0 } },
      ],
    };
  }

export function invalidStringWhere(field: 'sector' | 'industry'): Prisma.StockWhereInput {
    return {
      OR: [
        { [field]: null } as Prisma.StockWhereInput,
        { [field]: '' } as Prisma.StockWhereInput,
        { [field]: { equals: 'UNKNOWN', mode: 'insensitive' } } as Prisma.StockWhereInput,
        { [field]: { equals: 'N/A', mode: 'insensitive' } } as Prisma.StockWhereInput,
        { [field]: { equals: 'NA', mode: 'insensitive' } } as Prisma.StockWhereInput,
        { [field]: { equals: 'NONE', mode: 'insensitive' } } as Prisma.StockWhereInput,
        { [field]: { equals: 'NULL', mode: 'insensitive' } } as Prisma.StockWhereInput,
      ],
    };
  }
