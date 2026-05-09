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
});
