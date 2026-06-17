import { INDEX_LABELS, indexLabelFor } from '../../../src/modules/market-context-intelligence/market-pulse-snapshot.repository';

describe('Market Pulse INDEX_LABELS', () => {
  it('maps the known US index symbols to friendly names', () => {
    expect(INDEX_LABELS['^GSPC']).toBe('S&P 500');
    expect(INDEX_LABELS['^IXIC']).toBe('Nasdaq Composite');
    expect(INDEX_LABELS['^DJI']).toBe('Dow Jones');
    expect(INDEX_LABELS['^RUT']).toBe('Russell 2000');
    expect(INDEX_LABELS['^VIX']).toBe('VIX');
  });

  describe('indexLabelFor', () => {
    it('resolves ^GSPC to "S&P 500"', () => {
      expect(indexLabelFor('^GSPC')).toBe('S&P 500');
    });

    it('resolves ^IXIC to "Nasdaq Composite"', () => {
      expect(indexLabelFor('^IXIC')).toBe('Nasdaq Composite');
    });

    it('is case-insensitive on the symbol key', () => {
      expect(indexLabelFor('^gspc')).toBe('S&P 500');
    });

    it('falls through to the raw symbol for an unknown symbol (e.g. a stock/ETF)', () => {
      expect(indexLabelFor('AAPL')).toBe('AAPL');
      expect(indexLabelFor('XLK')).toBe('XLK');
    });

    it('returns the input unchanged for empty/odd input rather than throwing', () => {
      expect(indexLabelFor('')).toBe('');
    });
  });
});
