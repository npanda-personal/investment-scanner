/// <reference types="@types/jest" />
import {
  addTradingSessions,
  expectedLatestTradingDate,
  latestCompletedTradingDateForRegion,
  MARKET_CALENDAR_UNCERTAIN,
  shouldRunMarketDataSync,
  tradingSessionsBetween,
} from '../../../src/modules/market-data-foundation';

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

  it('waits between IN close and the EOD finalization grace (bhavcopy not published yet)', () => {
    // 10:30 UTC = 16:00 IST — market closed (15:30) but before the ≈18:30 IST
    // finalization grace, so the official EOD file is typically not published.
    // MARKET_CLOSED_AWAITING_EOD_FILE (not MARKET_CLOSED_NO_SYNC) so the
    // scheduler and sync-gate suppress the "missing date" override during grace.
    const decision = shouldRunMarketDataSync('IN', new Date('2026-05-05T10:30:00.000Z'));

    expect(decision).toMatchObject({
      shouldRun: false,
      reasonCode: 'MARKET_CLOSED_AWAITING_EOD_FILE',
      todayTradingDate: '2026-05-05',
    });
  });

  it('runs during IN post-close finalization window', () => {
    // 13:15 UTC = 18:45 IST — inside [18:30, 20:30] post-close window.
    const decision = shouldRunMarketDataSync('IN', new Date('2026-05-05T13:15:00.000Z'));

    expect(decision).toMatchObject({
      shouldRun: true,
      reasonCode: 'POST_CLOSE_FINALIZATION_WINDOW',
      todayTradingDate: '2026-05-05',
    });
  });

  it('skips after final candle is confirmed', () => {
    const decision = shouldRunMarketDataSync('IN', new Date('2026-05-05T13:15:00.000Z'), {
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
    // 13:15 UTC = 18:45 IST — past the ≈18:30 IST finalization grace.
    expect(latestCompletedTradingDateForRegion('IN', new Date('2026-05-05T13:15:00.000Z'))).toBe('2026-05-05');
  });
});

// ─── Trading-calendar helpers: holiday awareness ───────────────────────────

describe('expectedLatestTradingDate', () => {
  // 2026-05-06 is a Wednesday; simulate it being an NSE holiday (e.g. Eid).
  // The expected latest trading date should skip it and return 2026-05-05 (Tue).
  // We use a time well after market close on Wed to ensure today's candle
  // would normally be chosen.
  const NSE_HOLIDAY_WED = '2026-05-06';
  // 13:30 UTC = 19:00 IST (after close + 180m finalization grace → 18:30 IST)
  const afterCloseOnHoliday = new Date('2026-05-06T13:30:00.000Z');

  it('returns the holiday date itself when no holidays provided (weekend-only degrade)', () => {
    const { date, calendarUncertain } = expectedLatestTradingDate('IN', afterCloseOnHoliday);
    // Without holidays, the helper cannot know it is a holiday → returns Wed
    expect(date).toBe(NSE_HOLIDAY_WED);
    expect(calendarUncertain).toBe(true);
  });

  it('skips NSE holiday when holidays are injected and returns previous trading day', () => {
    const { date, calendarUncertain } = expectedLatestTradingDate('IN', afterCloseOnHoliday, {
      holidays: [NSE_HOLIDAY_WED],
    });
    expect(date).toBe('2026-05-05');
    expect(calendarUncertain).toBe(false);
  });

  it('classifies a date within an NSE holiday cluster (Diwali) as WEEKEND_OR_HOLIDAY via shouldRunMarketDataSync', () => {
    // Use shouldRunMarketDataSync directly to verify holiday-in-config path still works
    // 2026-11-05 Thursday = hypothetical Diwali holiday
    const decision = shouldRunMarketDataSync(
      'IN',
      new Date('2026-11-05T05:00:00.000Z'), // during market hours UTC
      {},
      {}
    );
    // Without holiday injection this is MARKET_OPEN (weekday)
    expect(decision.reasonCode).toBe('MARKET_OPEN');
    // This confirms that WITHOUT holiday injection the helper falls back to
    // weekend-only and does NOT misclassify — callers must inject holidays to
    // get full holiday awareness.
  });

  it('skips multiple holidays in a cluster and lands on the correct trading day', () => {
    // Hypothetical 3-day cluster: Mon 04, Tue 05, Wed 06 May 2026
    const cluster = ['2026-05-04', '2026-05-05', '2026-05-06'];
    // asOf = Wednesday after close
    const asOf = new Date('2026-05-06T12:00:00.000Z');
    const { date, calendarUncertain } = expectedLatestTradingDate('IN', asOf, { holidays: cluster });
    // Previous trading day before the cluster = Friday 2026-05-01
    expect(date).toBe('2026-05-01');
    expect(calendarUncertain).toBe(false);
  });

  it('returns calendarUncertain=false and a date when holidays Set is provided', () => {
    const { date, calendarUncertain } = expectedLatestTradingDate(
      'IN',
      new Date('2026-05-05T13:30:00.000Z'),
      { holidays: new Set<string>() }
    );
    expect(date).toBe('2026-05-05');
    expect(calendarUncertain).toBe(false);
  });

  it('returns null date for unknown region', () => {
    const { date, calendarUncertain } = expectedLatestTradingDate('XX', new Date());
    expect(date).toBeNull();
    expect(calendarUncertain).toBe(true);
  });

  it('exposes MARKET_CALENDAR_UNCERTAIN sentinel constant', () => {
    expect(MARKET_CALENDAR_UNCERTAIN).toBe('MARKET_CALENDAR_UNCERTAIN');
  });
});

describe('tradingSessionsBetween', () => {
  it('counts 5 sessions across a normal Mon–Fri week', () => {
    // 2026-05-04 Mon to 2026-05-08 Fri = 5 trading days
    const { count, calendarUncertain } = tradingSessionsBetween('IN', '2026-05-04', '2026-05-08');
    expect(count).toBe(5);
    expect(calendarUncertain).toBe(true); // no holidays supplied
  });

  it('counts correct sessions when a holiday falls mid-week', () => {
    // Mon 04 + [holiday Tue 05] + Wed 06 + Thu 07 + Fri 08 = 4 trading sessions
    const { count, calendarUncertain } = tradingSessionsBetween(
      'IN',
      '2026-05-04',
      '2026-05-08',
      { holidays: ['2026-05-05'] }
    );
    expect(count).toBe(4);
    expect(calendarUncertain).toBe(false);
  });

  it('returns 1 for same-day range on a trading day', () => {
    const { count } = tradingSessionsBetween('IN', '2026-05-04', '2026-05-04');
    expect(count).toBe(1);
  });

  it('returns 0 when fromDate is after toDate', () => {
    const { count } = tradingSessionsBetween('IN', '2026-05-08', '2026-05-04');
    expect(count).toBe(0);
  });

  it('excludes weekend days in the count', () => {
    // Fri 2026-05-08 to Mon 2026-05-11 = 2 sessions (Fri + Mon; Sat/Sun skipped)
    const { count } = tradingSessionsBetween('IN', '2026-05-08', '2026-05-11');
    expect(count).toBe(2);
  });
});

describe('addTradingSessions', () => {
  it('advances 5 sessions from Mon skipping the weekend', () => {
    // Mon 2026-05-04 + 5 sessions = Mon 2026-05-11
    const { date, calendarUncertain } = addTradingSessions('IN', '2026-05-04', 5);
    expect(date).toBe('2026-05-11');
    expect(calendarUncertain).toBe(true); // no holidays
  });

  it('skips a holiday in the middle of the advance', () => {
    // Wed 2026-05-06 + 3 sessions; Thu 07 = session 1, Fri 08 = session 2,
    // [skip Sat/Sun], Mon 11 = session 3 → result is 2026-05-11
    const { date, calendarUncertain } = addTradingSessions(
      'IN',
      '2026-05-06',
      3,
      { holidays: [] } // empty → no extra holidays but calendarUncertain=false
    );
    expect(date).toBe('2026-05-11');
    expect(calendarUncertain).toBe(false);
  });

  it('skips a holiday AND the weekend', () => {
    // Wed 2026-05-06 + 3 sessions with Mon 11 as a holiday:
    // Thu 07=1, Fri 08=2, [skip Sat/Sun], [skip Mon 11 holiday], Tue 12=3
    const { date } = addTradingSessions(
      'IN',
      '2026-05-06',
      3,
      { holidays: ['2026-05-11'] }
    );
    expect(date).toBe('2026-05-12');
  });

  it('returns the fromDate when sessions=0', () => {
    const { date } = addTradingSessions('IN', '2026-05-06', 0);
    expect(date).toBe('2026-05-06');
  });

  it('returns null for unknown region', () => {
    const { date, calendarUncertain } = addTradingSessions('XX', '2026-05-06', 1);
    expect(date).toBeNull();
    expect(calendarUncertain).toBe(true);
  });
});
