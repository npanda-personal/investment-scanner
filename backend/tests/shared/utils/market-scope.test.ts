import { resolveMarketRegionFilter, resolveRelatedMarketRegionFilter } from '../../../src/shared/utils/market-scope';

describe('Market Scope Utils', () => {
  describe('resolveMarketRegionFilter', () => {
    it('should return empty filter for GLOBAL', () => {
      expect(resolveMarketRegionFilter('GLOBAL')).toEqual({});
    });

    it('should return empty filter for null/undefined', () => {
      expect(resolveMarketRegionFilter(null)).toEqual({});
      expect(resolveMarketRegionFilter(undefined)).toEqual({});
    });

    it('should map IN correctly', () => {
      const filter = resolveMarketRegionFilter('IN');
      expect(filter).toHaveProperty('OR');
      const or = (filter as any).OR;
      expect(or).toContainEqual({ region: 'IN' });
      expect(or).toContainEqual({ country: { in: ['IN', 'India'], mode: 'insensitive' } });
      expect(or).toContainEqual({ exchange: { in: ['NSE', 'BSE'], mode: 'insensitive' } });
    });

    it('should map US correctly', () => {
      const filter = resolveMarketRegionFilter('US');
      expect(filter).toHaveProperty('OR');
      const or = (filter as any).OR;
      expect(or).toContainEqual({ region: 'US' });
      expect(or).toContainEqual({ country: { in: ['US', 'USA', 'United States'], mode: 'insensitive' } });
    });

    it('should fallback to direct region filter for unknown codes', () => {
      expect(resolveMarketRegionFilter('UK')).toEqual({ region: 'UK' });
    });
  });

  describe('resolveRelatedMarketRegionFilter', () => {
    it('should wrap filter in stock relation', () => {
      const filter = resolveRelatedMarketRegionFilter('US');
      expect(filter).toHaveProperty('stock');
      expect(filter.stock).toHaveProperty('OR');
    });

    it('should return empty object for GLOBAL', () => {
      expect(resolveRelatedMarketRegionFilter('GLOBAL')).toEqual({});
    });
  });
});
