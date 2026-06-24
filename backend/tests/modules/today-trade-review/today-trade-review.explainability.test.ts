import { snapshotComponentScores } from '../../../src/modules/today-trade-review/today-trade-review.explainability';

describe('snapshotComponentScores', () => {
  it('returns all-zero when no snapshots are present', () => {
    expect(snapshotComponentScores({})).toEqual({
      strategyProof: 0,
      tradePlan: 0,
      marketRegime: 0,
      sectorAlignment: 0,
      signalCalibration: 0,
      dataQuality: 0,
      smartMoney: 0,
    });
  });

  it('scores strategyProof by evidence label / framework backing', () => {
    expect(snapshotComponentScores({ strategyProofSnapshot: { evidenceLabel: 'STRONG' } }).strategyProof).toBe(25);
    expect(snapshotComponentScores({ strategyProofSnapshot: { frameworkBacked: true } }).strategyProof).toBe(22);
    expect(snapshotComponentScores({ strategyProofSnapshot: { evidenceLabel: 'UNPROVEN' } }).strategyProof).toBe(0);
    // present-but-unlabelled proof still earns the partial-credit floor
    expect(snapshotComponentScores({ strategyProofSnapshot: { foo: 1 } }).strategyProof).toBe(8);
  });

  it('honesty boundary: strategyProof is 0 (not 8) when the proof snapshot is absent', () => {
    expect(snapshotComponentScores({ strategyProofSnapshot: null }).strategyProof).toBe(0);
    expect(snapshotComponentScores({}).strategyProof).toBe(0);
  });

  it('honesty boundary: sectorAlignment is 0 when dataQuality snapshot is absent, 5 when present without sector, 10 with sector', () => {
    expect(snapshotComponentScores({}).sectorAlignment).toBe(0);
    expect(snapshotComponentScores({ dataQualitySnapshot: { coverageStatus: 'GOOD' } }).sectorAlignment).toBe(5);
    expect(snapshotComponentScores({ dataQualitySnapshot: { sector: 'Energy' } }).sectorAlignment).toBe(10);
  });

  it('caps tradePlan at 20 and scales with reward/risk for VALID plans only', () => {
    expect(snapshotComponentScores({ tradePlanSnapshot: { planStatus: 'VALID', rewardRiskRatio: 1 } }).tradePlan).toBe(14);
    expect(snapshotComponentScores({ tradePlanSnapshot: { planStatus: 'VALID', rewardRiskRatio: 10 } }).tradePlan).toBe(20);
    expect(snapshotComponentScores({ tradePlanSnapshot: { planStatus: 'INVALID', rewardRiskRatio: 5 } }).tradePlan).toBe(0);
  });

  it('scores dataQuality, marketRegime, signalCalibration and smartMoney from their snapshots', () => {
    expect(snapshotComponentScores({ dataQualitySnapshot: { coverageStatus: 'GOOD' } }).dataQuality).toBe(15);
    expect(snapshotComponentScores({ dataQualitySnapshot: { dataStatus: 'PRICE_ACTION_READY' } }).dataQuality).toBe(15);
    expect(snapshotComponentScores({ dataQualitySnapshot: { coverageStatus: 'PARTIAL' } }).dataQuality).toBe(6);
    expect(snapshotComponentScores({ marketContextSnapshot: { regime: 'BULL' } }).marketRegime).toBe(10);
    expect(snapshotComponentScores({ sourceSignalSnapshot: { calibration: {} } }).signalCalibration).toBe(5);
    expect(snapshotComponentScores({ sourceSignalSnapshot: { setup: 'BREAKOUT' } }).signalCalibration).toBe(5);
    expect(snapshotComponentScores({ sourceSignalSnapshot: { smartMoney: true } }).smartMoney).toBe(5);
  });
});
