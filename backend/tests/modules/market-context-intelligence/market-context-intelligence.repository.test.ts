/// <reference types="@types/jest" />
import { MarketContextIntelligenceRepository } from '../../../src/modules/market-context-intelligence/market-context-intelligence.repository';

describe('MarketContextIntelligenceRepository', () => {
  it('maps persisted breadth counts coherently and excludes Unknown from sector rankings', async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const db = {
      marketContextSnapshot: {
        findUnique: jest.fn().mockResolvedValue({
          snapshotDate: today,
          region: 'IN',
          regime: 'RISK_ON',
          regimeScore: 72,
          breadthPercentAboveSma50: 0.754,
          breadthPercentAboveSma200: 0.471,
          advanceDeclineRatio: 1.5,
          newHighCount: 17,
          newLowCount: 4,
          macroStatus: 'UNKNOWN',
          explanation: 'Persisted market context.',
          updatedAt: new Date('2026-05-10T00:00:00.000Z'),
          dataStatus: 'PARTIAL',
        }),
      },
      sectorContextSnapshot: {
        findMany: jest.fn().mockResolvedValue([
          {
            sector: 'Unknown',
            oneMonthReturn: 0.1,
            threeMonthReturn: 0.2,
            sixMonthReturn: 0.3,
            relativeStrengthScore: 90,
            instrumentCount: 499,
            bullishSignalCount: 0,
            bearishSignalCount: 0,
            leadershipStatus: 'LEADING',
          },
          {
            sector: 'Financial Services',
            oneMonthReturn: 0.03,
            threeMonthReturn: 0.06,
            sixMonthReturn: 0.09,
            relativeStrengthScore: 62,
            instrumentCount: 1,
            bullishSignalCount: 0,
            bearishSignalCount: 0,
            leadershipStatus: 'IMPROVING',
          },
        ]),
      },
      countryContextSnapshot: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const repository = new MarketContextIntelligenceRepository(db as any);

    const summary = await repository.latestSnapshot('IN');

    expect(db.marketContextSnapshot.findUnique).toHaveBeenCalledWith({
      where: { snapshotDate_region: { snapshotDate: today, region: 'IN' } },
    });
    expect(summary?.breadth).toMatchObject({
      instrumentCount: 500,
      sma50SampleCount: 500,
      sma200SampleCount: 500,
      percentAboveSma50: 0.754,
      percentAboveSma200: 0.471,
    });
    expect(summary?.topSectors.map((sector) => sector.sector)).toEqual(['Financial Services']);
    expect(summary?.weakSectors).toEqual([]);
  });
});
