import {
  parseYahooChart,
  parseYahooEvents,
} from '../../../src/modules/market-data-foundation/market-data-foundation.yahoo-eod-provider';

/**
 * Pure-parser tests for the Yahoo chart response — prices AND the
 * dividend/split corporate-action events carried in the same payload.
 * No network: the JSON fixtures mirror Yahoo's `events` shape.
 */

const FIXTURE = {
  chart: {
    result: [
      {
        meta: { currency: 'USD', symbol: 'AAPL' },
        timestamp: [1700000000, 1700086400],
        indicators: {
          quote: [
            {
              open: [100, 105],
              high: [110, 120],
              low: [95, 104],
              close: [105, 118],
              volume: [1000, 2000],
            },
          ],
          adjclose: [{ adjclose: [104.5, 117.5] }],
        },
        events: {
          dividends: {
            '1699900000': { amount: 0.24, date: 1699900000 },
            // Zero/blank dividends are dropped.
            '1699910000': { amount: 0, date: 1699910000 },
          },
          splits: {
            // 4:1 forward split.
            '1699920000': { date: 1699920000, numerator: 4, denominator: 1, splitRatio: '4:1' },
            // 1:10 reverse split.
            '1699930000': { date: 1699930000, numerator: 1, denominator: 10, splitRatio: '1:10' },
          },
        },
      },
    ],
    error: null,
  },
};

describe('parseYahooEvents', () => {
  it('parses dividends and splits into CorporateAction[] (source YAHOO_EVENTS)', () => {
    const actions = parseYahooEvents(FIXTURE, 'AAPL');
    expect(actions).toHaveLength(3); // 1 dividend (zero dropped) + 2 splits
    expect(actions.every((a) => a.symbol === 'AAPL' && a.source === 'YAHOO_EVENTS')).toBe(true);

    const dividend = actions.find((a) => a.type === 'dividend');
    expect(dividend).toMatchObject({ amount: 0.24, currency: 'USD' });
    expect(dividend?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const forward = actions.find((a) => a.type === 'split');
    expect(forward?.splitRatio).toBe(4);

    const reverse = actions.find((a) => a.type === 'reverse_split');
    expect(reverse?.splitRatio).toBeCloseTo(0.1);
  });

  it('returns [] when there are no events', () => {
    const noEvents = { chart: { result: [{ ...FIXTURE.chart.result[0], events: undefined }] } };
    expect(parseYahooEvents(noEvents, 'AAPL')).toEqual([]);
    expect(parseYahooEvents({}, 'AAPL')).toEqual([]);
  });

  it('still parses prices from the same payload (events do not break bars)', () => {
    const bars = parseYahooChart(FIXTURE, 'AAPL');
    expect(bars).toHaveLength(2);
    expect(bars[0]).toMatchObject({ open: 100, close: 105, source: 'YAHOO_EOD' });
  });
});
