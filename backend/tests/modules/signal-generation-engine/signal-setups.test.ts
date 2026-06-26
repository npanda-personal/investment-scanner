import {
  SETUP_DEFS,
  SETUP_CODES,
  getSetupDef,
  classifyRowSetups,
} from '../../../src/modules/signal-generation-engine/signal-setups';

describe('signal-setups taxonomy', () => {
  it('exposes 9 bullish + 7 bearish setups with unique codes', () => {
    const bullish = SETUP_DEFS.filter((d) => d.group === 'BULLISH');
    const bearish = SETUP_DEFS.filter((d) => d.group === 'BEARISH');
    expect(bullish).toHaveLength(9);
    expect(bearish).toHaveLength(7);
    expect(SETUP_CODES.size).toBe(SETUP_DEFS.length);
  });

  it('every EVIDENCE setup declares an evidenceSource and codes (flat or grouped); every FIELD setup declares a field', () => {
    for (const def of SETUP_DEFS) {
      if (def.kind === 'EVIDENCE') {
        expect(def.evidenceSource).toBeDefined();
        // A setup uses EITHER a flat OR list or AND-of-groups, never neither and never both.
        const hasFlat = (def.factorCodes?.length ?? 0) > 0;
        const hasGroups = (def.factorGroups?.length ?? 0) > 0;
        expect(hasFlat || hasGroups).toBe(true);
        expect(hasFlat && hasGroups).toBe(false);
        if (hasGroups) {
          for (const g of def.factorGroups!) expect(g.length).toBeGreaterThan(0);
        }
      } else {
        expect(def.field).toBeDefined();
        expect(def.field!.values.length).toBeGreaterThan(0);
      }
    }
  });

  it('getSetupDef resolves known codes and rejects unknown', () => {
    expect(getSetupDef('BREAKOUT')?.label).toBe('Breakout');
    expect(getSetupDef('NOT_A_SETUP')).toBeUndefined();
  });
});

describe('classifyRowSetups', () => {
  const empty = { positiveCodes: [], negativeCodes: [], smartMoneyStatus: null, sectorLeadershipStatus: null };

  it('returns [] for an empty row', () => {
    expect(classifyRowSetups(empty)).toEqual([]);
  });

  it('TREND_MOMENTUM is grouped-AND: a trend code ALONE does not match', () => {
    // PRICE_ABOVE_SMA50 is near-universal among bullish names; on its own it must NOT pull the
    // row into Trend Momentum (this is the de-duplication fix).
    const setups = classifyRowSetups({ ...empty, positiveCodes: ['PRICE_ABOVE_SMA50', 'SMA50_ABOVE_SMA200'] });
    expect(setups).not.toContain('TREND_MOMENTUM');
  });

  it('TREND_MOMENTUM matches only when a trend code AND a momentum code are both present', () => {
    const setups = classifyRowSetups({ ...empty, positiveCodes: ['PRICE_ABOVE_SMA50', 'THREE_MONTH_MOMENTUM'] });
    expect(setups).toContain('TREND_MOMENTUM');
    expect(setups).not.toContain('TREND_BEARISH');
  });

  it('a momentum code ALONE (no trend code) does not match TREND_MOMENTUM', () => {
    const setups = classifyRowSetups({ ...empty, positiveCodes: ['THREE_MONTH_MOMENTUM'] });
    expect(setups).not.toContain('TREND_MOMENTUM');
  });

  it('TREND_BEARISH is grouped-AND: a downtrend code AND a negative-momentum code (from negative evidence)', () => {
    // The momentum-negative codes are distinct strings — proves there is no suffix-stripping that
    // would conflate bullish and bearish momentum.
    const setups = classifyRowSetups({
      ...empty,
      negativeCodes: ['PRICE_BELOW_SMA50', 'ONE_MONTH_MOMENTUM_NEGATIVE'],
    });
    expect(setups).toContain('TREND_BEARISH');
    expect(setups).not.toContain('TREND_MOMENTUM');
    // Downtrend code alone is not enough.
    expect(classifyRowSetups({ ...empty, negativeCodes: ['PRICE_BELOW_SMA50'] })).not.toContain('TREND_BEARISH');
  });

  it('does NOT match a bearish setup when its codes sit (wrongly) in the positive column', () => {
    // Source-column separation is load-bearing: a bearish code only counts from negativeCodes.
    const setups = classifyRowSetups({ ...empty, positiveCodes: ['PRICE_BELOW_SMA50'] });
    expect(setups).not.toContain('TREND_BEARISH');
  });

  it('classifies overextension codes (negative evidence) as OVEREXTENDED', () => {
    const setups = classifyRowSetups({ ...empty, negativeCodes: ['RSI_OVERBOUGHT', 'PARABOLIC_RUNUP'] });
    expect(setups).toContain('OVEREXTENDED');
  });

  it('classifies FIELD setups from context status', () => {
    expect(classifyRowSetups({ ...empty, smartMoneyStatus: 'ACCUMULATION' })).toContain('SMART_MONEY_ACCUMULATION');
    expect(classifyRowSetups({ ...empty, smartMoneyStatus: 'DISTRIBUTION' })).toContain('SMART_MONEY_DISTRIBUTION');
    expect(classifyRowSetups({ ...empty, sectorLeadershipStatus: 'LEADING' })).toContain('SECTOR_LEADERSHIP');
    expect(classifyRowSetups({ ...empty, sectorLeadershipStatus: 'IMPROVING' })).toContain('SECTOR_LEADERSHIP');
    expect(classifyRowSetups({ ...empty, sectorLeadershipStatus: 'LAGGING' })).not.toContain('SECTOR_LEADERSHIP');
  });

  it('splits Quality (margin/value) from Growth (YoY) — and drops the near-universal POSITIVE_EPS', () => {
    expect(classifyRowSetups({ ...empty, positiveCodes: ['HEALTHY_NET_MARGIN'] })).toContain('QUALITY');
    expect(classifyRowSetups({ ...empty, positiveCodes: ['EPS_GROWTH_YOY'] })).toContain('GROWTH');
    // POSITIVE_EPS no longer qualifies any setup on its own (it was the omnibus tab's anchor).
    expect(classifyRowSetups({ ...empty, positiveCodes: ['POSITIVE_EPS'] })).toEqual([]);
  });

  it('splits Weak Fundamentals (profitability) from Earnings Decline (YoY) on the bearish side', () => {
    expect(classifyRowSetups({ ...empty, negativeCodes: ['NEGATIVE_EPS'] })).toContain('WEAK_FUNDAMENTALS');
    expect(classifyRowSetups({ ...empty, negativeCodes: ['EPS_DECLINE_YOY'] })).toContain('EARNINGS_DECLINE');
  });

  it('can match multiple setups for one row, in SETUP_DEFS order', () => {
    const setups = classifyRowSetups({
      positiveCodes: ['NEAR_52_WEEK_HIGH', 'PRICE_ABOVE_SMA50', 'THREE_MONTH_MOMENTUM'],
      negativeCodes: [],
      smartMoneyStatus: 'ACCUMULATION',
      sectorLeadershipStatus: null,
    });
    expect(setups).toEqual(expect.arrayContaining(['TREND_MOMENTUM', 'BREAKOUT', 'SMART_MONEY_ACCUMULATION']));
    // Order follows SETUP_DEFS: TREND_MOMENTUM before BREAKOUT before SMART_MONEY_ACCUMULATION.
    expect(setups.indexOf('TREND_MOMENTUM')).toBeLessThan(setups.indexOf('BREAKOUT'));
    expect(setups.indexOf('BREAKOUT')).toBeLessThan(setups.indexOf('SMART_MONEY_ACCUMULATION'));
  });
});
