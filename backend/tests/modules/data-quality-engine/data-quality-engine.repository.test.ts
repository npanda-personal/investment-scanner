/// <reference types="@types/jest" />
import { DataQualityEngineRepository } from '../../../src/modules/data-quality-engine/data-quality-engine.repository';

describe('data quality engine repository', () => {
  it('applies region, asset type, search, partial text filters, eligibility, and safe sorting', async () => {
    const db = {
      dataQualityEvaluation: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const repository = new DataQualityEngineRepository(db as any);

    await repository.list({
      region: 'IN',
      assetType: 'STOCK',
      search: 'reliance',
      sector: 'fin',
      country: 'ind',
      eligibleForSignals: true,
      sortBy: 'signalReadinessScore',
      sortOrder: 'desc',
      limit: 25,
      offset: 0,
    });

    expect(db.dataQualityEvaluation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 25,
      skip: 0,
      orderBy: [{ signalReadinessScore: 'desc' }, { evaluatedAt: 'desc' }],
      where: expect.objectContaining({
        sector: { contains: 'fin', mode: 'insensitive' },
        country: { contains: 'ind', mode: 'insensitive' },
        eligibleForSignals: true,
        OR: [
          { symbol: { contains: 'reliance', mode: 'insensitive' } },
          { companyName: { contains: 'reliance', mode: 'insensitive' } },
        ],
        stock: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ OR: expect.any(Array) }),
            expect.objectContaining({ OR: expect.arrayContaining([{ assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } }]) }),
          ]),
        }),
      }),
    }));
  });

  it('maps additive use-case tiers from persisted readiness evidence', async () => {
    const db = {
      dataQualityEvaluation: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'eval-1',
          instrumentId: 'stock-1',
          symbol: 'AAPL',
          companyName: 'Apple',
          sector: 'Technology',
          industry: 'Consumer Electronics',
          country: 'US',
          currency: 'USD',
          coverageScore: 85,
          coverageStatus: 'GOOD',
          signalReadinessScore: 82,
          signalReadinessStatus: 'READY',
          liquidityScore: 78,
          liquidityStatus: 'LIQUID',
          eligibleForSignals: true,
          eligibleForBacktesting: true,
          eligibleForCalibration: true,
          dataGaps: [],
          warnings: [],
          readinessReasons: [
            'DAILYREVIEW_LIMITED: TRUSTED_BASELINE_HISTORY_INCOMPLETE',
            'BACKTEST_BLOCKED: TRUSTED_BASELINE_HISTORY_INCOMPLETE',
            'CALIBRATION_BLOCKED: TRUSTED_BASELINE_HISTORY_INCOMPLETE',
            'AUTOMATION_BLOCKED: PHASE0_AUTOMATION_NOT_AUTHORIZED',
          ],
          readinessBlockers: ['Trusted baseline required history status is INCOMPLETE.'],
          evaluatedAt: new Date('2026-05-14T00:00:00.000Z'),
        }]),
      },
    };
    const repository = new DataQualityEngineRepository(db as any);

    const rows = await repository.list({ limit: 10, offset: 0 });

    expect(rows[0].useCaseTiers).toMatchObject({
      dailyReview: { status: 'LIMITED', reasons: expect.arrayContaining(['TRUSTED_BASELINE_HISTORY_INCOMPLETE']) },
      backtest: { status: 'BLOCKED', reasons: expect.arrayContaining(['TRUSTED_BASELINE_HISTORY_INCOMPLETE']) },
      calibration: { status: 'BLOCKED', reasons: expect.arrayContaining(['TRUSTED_BASELINE_HISTORY_INCOMPLETE']) },
      automation: { status: 'BLOCKED', reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'] },
    });
    expect(rows[0].tierEvidence).toMatchObject({ requiredHistoryStatus: 'INCOMPLETE' });
  });

  it('fails closed in fallback mapping when persisted rows have no trusted-baseline evidence', async () => {
    const db = {
      dataQualityEvaluation: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'eval-1',
          instrumentId: 'stock-1',
          symbol: 'AAPL',
          companyName: 'Apple',
          sector: 'Technology',
          industry: 'Consumer Electronics',
          country: 'US',
          currency: 'USD',
          coverageScore: 95,
          coverageStatus: 'GOOD',
          signalReadinessScore: 90,
          signalReadinessStatus: 'READY',
          liquidityScore: 82,
          liquidityStatus: 'LIQUID',
          eligibleForSignals: true,
          eligibleForBacktesting: true,
          eligibleForCalibration: true,
          dataGaps: [],
          warnings: [],
          readinessReasons: [],
          readinessBlockers: [],
          evaluatedAt: new Date('2026-05-14T00:00:00.000Z'),
        }]),
      },
    };
    const repository = new DataQualityEngineRepository(db as any);

    const rows = await repository.list({ limit: 10, offset: 0 });

    expect(rows[0].useCaseTiers).toMatchObject({
      dailyReview: {
        status: 'LIMITED',
        reasons: expect.arrayContaining(['TRUST_CONTEXT_MISSING', 'LISTING_DATE_CONFIDENCE_MISSING']),
      },
      signal: {
        status: 'LIMITED',
        reasons: expect.arrayContaining(['TRUST_CONTEXT_MISSING', 'LISTING_DATE_CONFIDENCE_MISSING']),
      },
      backtest: {
        status: 'BLOCKED',
        reasons: expect.arrayContaining(['TRUST_CONTEXT_MISSING', 'LISTING_DATE_CONFIDENCE_MISSING']),
      },
      calibration: {
        status: 'BLOCKED',
        reasons: expect.arrayContaining(['TRUST_CONTEXT_MISSING', 'LISTING_DATE_CONFIDENCE_MISSING']),
      },
      automation: { status: 'BLOCKED', reasons: ['PHASE0_AUTOMATION_NOT_AUTHORIZED'] },
    });
  });
});
