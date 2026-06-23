/// <reference types="@types/jest" />
import { computeEarningsTechnicals } from '../../../src/modules/earnings-intelligence/earnings-intelligence.technicals';
import type {
  EarningsDeliveryInput,
  EarningsPricePointInput,
} from '../../../src/modules/earnings-intelligence/earnings-intelligence.types';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build a price series oldest-first, then return it deliberately shuffled so the
 * test also proves `computeEarningsTechnicals` sorts newest-first internally and
 * does not depend on caller ordering.
 */
function risingSeries(count: number): EarningsPricePointInput[] {
  const base = Date.UTC(2026, 0, 1);
  const rows: EarningsPricePointInput[] = [];
  for (let i = 0; i < count; i += 1) {
    const close = 100 + i; // strictly rising by 1/bar
    rows.push({
      symbol: 'AAA',
      timestamp: new Date(base + i * DAY_MS),
      close,
      high: close + 1,
      low: close - 1,
      adjustedClose: close,
      volume: 1000 + i,
    });
  }
  // Shuffle (stable-ish reversal of halves) to break the natural ordering.
  return [...rows.slice(count / 2), ...rows.slice(0, count / 2)];
}

describe('computeEarningsTechnicals', () => {
  it('computes the full bundle from a long rising series (warm-up windows met)', () => {
    const prices = risingSeries(60); // 60 bars: RSI(14)/ADX(14)/SMA50 ready, SMA200 not
    const delivery: EarningsDeliveryInput[] = [
      { stockId: 's', symbol: 'AAA', tradingDate: new Date('2026-03-01T00:00:00.000Z'), deliveryPercent: 40, tradedQuantity: null, deliverableQuantity: null },
      { stockId: 's', symbol: 'AAA', tradingDate: new Date('2026-03-10T00:00:00.000Z'), deliveryPercent: 55.5, tradedQuantity: null, deliverableQuantity: null },
      { stockId: 's', symbol: 'AAA', tradingDate: new Date('2026-03-05T00:00:00.000Z'), deliveryPercent: null, tradedQuantity: null, deliverableQuantity: null },
    ];

    const t = computeEarningsTechnicals(prices, delivery);

    // Unbroken advance → RSI pinned at the top, ADX a strong-trend reading.
    expect(t.rsi14).not.toBeNull();
    expect(t.rsi14!).toBeGreaterThanOrEqual(99);
    expect(t.adx14).not.toBeNull();
    expect(t.adx14!).toBeGreaterThan(50);
    // Latest close is the series high → top of the trailing-range position.
    expect(t.pricePosition52w).not.toBeNull();
    expect(t.pricePosition52w!).toBeGreaterThan(90);
    expect(t.pricePosition52w!).toBeLessThanOrEqual(100);
    // 60 bars: above the 50-bar MA, but the 200-bar MA is not yet available.
    expect(t.smaPosture).toBe('ABOVE_50');
    // Latest non-null delivery snapshot by trading date (the 03-05 null is skipped).
    expect(t.deliveryPercent).toBe(55.5);
  });

  it('degrades every field to null when there is no price history', () => {
    const t = computeEarningsTechnicals([], []);
    expect(t).toEqual({
      rsi14: null,
      smaPosture: null,
      pricePosition52w: null,
      adx14: null,
      deliveryPercent: null,
    });
  });

  it('still yields the range position on a short history while indicator warm-ups stay null', () => {
    const prices = risingSeries(8); // below RSI(14)/SMA50 warm-up
    const t = computeEarningsTechnicals(prices, []);

    expect(t.rsi14).toBeNull();
    expect(t.adx14).toBeNull();
    expect(t.smaPosture).toBeNull();
    // Range position only needs >= 1 bar with a non-degenerate high/low spread.
    expect(t.pricePosition52w).not.toBeNull();
    expect(t.deliveryPercent).toBeNull();
  });
});
