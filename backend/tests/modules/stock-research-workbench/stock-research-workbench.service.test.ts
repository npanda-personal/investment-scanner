/// <reference types="@types/jest" />
import { StockResearchWorkbenchService } from '../../../src/modules/stock-research-workbench';

const price = (date: string, adjusted_close: number) => ({
  date,
  close: adjusted_close,
  adjusted_close,
  volume: 100,
});

describe('StockResearchWorkbenchService metrics', () => {
  it('calculates max drawdown', () => {
    const service = new StockResearchWorkbenchService({} as any);

    expect(service.maxDrawdown([
      price('2026-01-04', 90),
      price('2026-01-03', 80),
      price('2026-01-02', 120),
      price('2026-01-01', 100),
    ])).toBeCloseTo(-0.3333, 3);
  });

  it('calculates 3Y CAGR when enough history exists', () => {
    const service = new StockResearchWorkbenchService({} as any);
    const prices = Array.from({ length: 253 * 3 }, (_, index) =>
      price(`2026-01-${String((index % 28) + 1).padStart(2, '0')}`, index === 252 * 3 ? 100 : 133.1)
    );

    expect(service.cagr(prices, 252 * 3)).toBeCloseTo(0.1, 2);
  });

  it('returns null for metrics when history is missing', () => {
    const service = new StockResearchWorkbenchService({} as any);

    expect(service.performanceMetrics([price('2026-01-01', 100)], [price('2026-01-01', 100)])).toMatchObject({
      return_1d: null,
      cagr_3y: null,
      max_drawdown: null,
      volatility: null,
    });
  });
});
