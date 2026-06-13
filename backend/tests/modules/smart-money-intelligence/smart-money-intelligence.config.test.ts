/// <reference types="@types/jest" />
import { resolveSmartMoneyConfig, DEFAULT_EQUITY_SCORING } from '../../../src/modules/smart-money-intelligence';

describe('resolveSmartMoneyConfig', () => {
  it('returns the India-equity baseline for the IN/STOCK scope (byte-identical legacy values)', () => {
    const config = resolveSmartMoneyConfig('IN', 'STOCK');
    expect(config.region).toBe('IN');
    expect(config.assetType).toBe('STOCK');
    expect(config.accumulationScoreThreshold).toBe(70);
    expect(config.distributionScoreThreshold).toBe(35);
    expect(config.highVolumeRatio).toBe(1.2);
    expect(config.unusualVolumeRatio).toBe(1.5);
    expect(config.sectorBands).toEqual({ strongAccumulation: 62, accumulating: 56, neutralFloor: 48, distributing: 38 });
    expect(config.accumulationListScoreFloor).toBe(60);
    expect(config.distributionListScoreCeil).toBe(40);
  });

  it('resolves a distinct, normalised region for a US scope (inherits the documented baseline until calibrated)', () => {
    const config = resolveSmartMoneyConfig('US', 'STOCK');
    expect(config.region).toBe('US');
    // No US calibration override yet → inherits the default equity baseline (not fabricated).
    expect(config.sectorBands).toEqual(DEFAULT_EQUITY_SCORING.sectorBands);
    expect(config.accumulationScoreThreshold).toBe(DEFAULT_EQUITY_SCORING.accumulationScoreThreshold);
  });

  it('normalises region aliases and a missing scope (GLOBAL)', () => {
    expect(resolveSmartMoneyConfig('india', 'EQUITY').region).toBe('IN');
    expect(resolveSmartMoneyConfig(undefined, undefined).region).toBe('GLOBAL');
  });

  it('returns an independent sectorBands object (no shared mutation across calls)', () => {
    const a = resolveSmartMoneyConfig('IN', 'STOCK');
    a.sectorBands.strongAccumulation = 999;
    const b = resolveSmartMoneyConfig('IN', 'STOCK');
    expect(b.sectorBands.strongAccumulation).toBe(62);
  });
});
