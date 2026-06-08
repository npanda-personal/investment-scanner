import { Prisma } from '@prisma/client';

export type MarketRegion = 'IN' | 'US' | 'EU' | 'GLOBAL';

export function normalizeMarketRegion(region?: string | null): MarketRegion | undefined {
  const value = String(region || '').trim().toUpperCase();
  if (!value || value === 'GLOBAL' || value === 'ALL' || value === 'DEFAULT') return undefined;
  if (value === 'INDIA') return 'IN';
  if (value === 'EUROPE') return 'EU';
  if (value === 'IN' || value === 'US' || value === 'EU') return value;
  return value as MarketRegion;
}

/**
 * Maps a global region code to Prisma filter criteria for instruments/stocks.
 */
export function resolveMarketRegionFilter(region?: string | null): Prisma.StockWhereInput {
  const normalizedRegion = normalizeMarketRegion(region);
  if (!normalizedRegion) {
    return {};
  }

  const r = normalizedRegion;

  switch (r) {
    case 'IN':
      return {
        OR: [
          { region: 'IN' },
          { country: { in: ['IN', 'India'], mode: 'insensitive' } },
          { exchange: { in: ['NSE', 'BSE'], mode: 'insensitive' } },
        ],
      };
    case 'US':
      return {
        OR: [
          { region: 'US' },
          { country: { in: ['US', 'USA', 'United States'], mode: 'insensitive' } },
          { exchange: { in: ['NASDAQ', 'NYSE', 'AMEX'], mode: 'insensitive' } },
        ],
      };
    case 'EU':
      // European countries list can be expanded
      return {
        OR: [
          { region: 'EU' },
          { country: { in: ['UK', 'United Kingdom', 'DE', 'Germany', 'FR', 'France', 'IT', 'Italy', 'ES', 'Spain', 'NL', 'Netherlands'], mode: 'insensitive' } },
          { exchange: { in: ['LSE', 'XETRA', 'Euronext', 'EURONEXT_AMS', 'BORSA_ITALIANA', 'BME'], mode: 'insensitive' } },
        ],
      };
    default:
      return { region: r };
  }
}

/**
 * Maps a global region code to Prisma filter criteria for models that link to Stock.
 * Assumes the model has a 'stock' relation.
 */
export function resolveRelatedMarketRegionFilter(region?: string | null): any {
  const filter = resolveMarketRegionFilter(region);
  if (Object.keys(filter).length === 0) {
    return {};
  }
  return { stock: filter };
}
