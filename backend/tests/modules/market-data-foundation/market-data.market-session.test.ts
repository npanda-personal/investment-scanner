/// <reference types="@types/jest" />
import { latestCompletedTradingDateForRegion, shouldRunMarketDataSync } from '../../../src/modules/market-data-foundation';

describe('market data market session decisions', () => {
  it('skips IN weekday before market open', () => {
    const decision = shouldRunMarketDataSync('IN', new Date('2026-05-05T03:00:00.000Z'));

    expect(decision).toMatchObject({
      shouldRun: false,
      reasonCode: 'BEFORE_MARKET_OPEN',
      todayTradingDate: '2026-05-05',
    });
  });

  it('skips IN market hours by default for 1D strategy workflows', () => {
    const decision = shouldRunMarketDataSync('IN', new Date('2026-05-05T05:00:00.000Z'));

    expect(decision).toMatchObject({
      shouldRun: false,
      reasonCode: 'MARKET_OPEN',
    });
  });

  it('allows IN market-hours sync when explicitly enabled', () => {
    const decision = shouldRunMarketDataSync('IN', new Date('2026-05-05T05:00:00.000Z'), {}, {
      syncDuringMarketHours: true,
    });

    expect(decision).toMatchObject({
      shouldRun: true,
      reasonCode: 'MARKET_OPEN',
    });
  });

  it('runs during IN post-close finalization window', () => {
    const decision = shouldRunMarketDataSync('IN', new Date('2026-05-05T10:30:00.000Z'));

    expect(decision).toMatchObject({
      shouldRun: true,
      reasonCode: 'POST_CLOSE_FINALIZATION_WINDOW',
      todayTradingDate: '2026-05-05',
    });
  });

  it('skips after final candle is confirmed', () => {
    const decision = shouldRunMarketDataSync('IN', new Date('2026-05-05T10:30:00.000Z'), {
      latestTradingDate: '2026-05-05',
      finalConfirmed: true,
    });

    expect(decision).toMatchObject({
      shouldRun: false,
      reasonCode: 'FINAL_CANDLE_CONFIRMED',
    });
  });

  it('skips weekends', () => {
    const decision = shouldRunMarketDataSync('IN', new Date('2026-05-09T06:00:00.000Z'));

    expect(decision).toMatchObject({
      shouldRun: false,
      reasonCode: 'WEEKEND_OR_HOLIDAY',
    });
  });

  it('reports previous trading day as latest completed before IN market open', () => {
    expect(latestCompletedTradingDateForRegion('IN', new Date('2026-05-05T03:00:00.000Z'))).toBe('2026-05-04');
  });

  it('reports current trading day as latest completed after IN close grace', () => {
    expect(latestCompletedTradingDateForRegion('IN', new Date('2026-05-05T10:30:00.000Z'))).toBe('2026-05-05');
  });
});
