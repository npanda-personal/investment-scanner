import {
  SETUP_DEFS,
  SETUP_CODES,
  getSetupDef,
  classifyRowSetups,
} from '../../../src/modules/signal-generation-engine/signal-setups';

describe('signal-setups taxonomy', () => {
  it('exposes 8 bullish + 6 bearish setups with unique codes', () => {
    const bullish = SETUP_DEFS.filter((d) => d.group === 'BULLISH');
    const bearish = SETUP_DEFS.filter((d) => d.group === 'BEARISH');
    expect(bullish).toHaveLength(8);
    expect(bearish).toHaveLength(6);
    expect(SETUP_CODES.size).toBe(SETUP_DEFS.length);
  });

  it('every EVIDENCE setup declares an evidenceSource and codes; every FIELD setup declares a field', () => {
    for (const def of SETUP_DEFS) {
      if (def.kind === 'EVIDENCE') {
        expect(def.evidenceSource).toBeDefined();
        expect(def.factorCodes && def.factorCodes.length).toBeGreaterThan(0);
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

  it('matches bullish trend codes (from positive evidence) to TREND_MOMENTUM', () => {
    const setups = classifyRowSetups({ ...empty, positiveCodes: ['PRICE_ABOVE_SMA50', 'SMA50_ABOVE_SMA200'] });
    expect(setups).toContain('TREND_MOMENTUM');
    expect(setups).not.toContain('TREND_BEARISH');
  });

  it('matches bearish trend codes (from negative evidence) to TREND_BEARISH, NOT the bullish setup', () => {
    // The momentum-negative codes are distinct strings — proves there is no suffix-stripping that
    // would conflate bullish and bearish momentum.
    const setups = classifyRowSetups({
      ...empty,
      negativeCodes: ['PRICE_BELOW_SMA50', 'ONE_MONTH_MOMENTUM_NEGATIVE'],
    });
    expect(setups).toContain('TREND_BEARISH');
    expect(setups).not.toContain('TREND_MOMENTUM');
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

  it('can match multiple setups for one row, in SETUP_DEFS order', () => {
    const setups = classifyRowSetups({
      positiveCodes: ['NEAR_52_WEEK_HIGH', 'PRICE_ABOVE_SMA50'],
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
