/// <reference types="@types/jest" />
import type { Request, Response } from 'express';
import { MarketContextIntelligenceController } from '../../../src/modules/market-context-intelligence';

function responseMock() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

describe('MarketContextIntelligenceController', () => {
  it('persistedSummary returns ready envelope from latestPersistedSummary only', async () => {
    const summary = {
      updatedAt: '2026-05-27T05:00:00.000Z',
      dataStatus: 'COMPLETE',
      regime: { regime: 'RISK_ON', score: 75, explanation: 'test', updatedAt: '2026-05-27T05:00:00.000Z', dataStatus: 'COMPLETE' },
      topSectors: [],
      weakSectors: [],
      breadth: { percentAboveSma50: 0.6, percentAboveSma200: 0.5, advanceDeclineRatio: 1.2, newHigh52WeekCount: 1, newLow52WeekCount: 0, bullishSignalCount: 2, bearishSignalCount: 1, instrumentCount: 10, dataStatus: 'COMPLETE' },
      countryStrength: [],
      macro: { interestRateProxy: null, inflationProxy: null, usdStrengthProxy: null, commodityProxy: null, macroStatus: 'UNKNOWN', dataStatus: 'MISSING', explanation: 'missing' },
      explanation: ['test'],
    };
    const service = {
      latestPersistedSummary: jest.fn().mockResolvedValue(summary),
      summary: jest.fn(),
      run: jest.fn(),
    };
    const controller = new MarketContextIntelligenceController(service as any);
    const req = { query: { region: 'IN' } } as unknown as Request;
    const res = responseMock();

    await controller.persistedSummary(req, res);

    expect(service.latestPersistedSummary).toHaveBeenCalledWith('IN');
    expect(service.summary).not.toHaveBeenCalled();
    expect(service.run).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      status: 'ready',
      scope: { region: 'IN' },
      summary,
      asOf: '2026-05-27T05:00:00.000Z',
      materialized: false,
    });
  });

  it('persistedSummary returns missing envelope without materializing when no snapshot exists', async () => {
    const service = {
      latestPersistedSummary: jest.fn().mockResolvedValue(null),
      summary: jest.fn(),
      run: jest.fn(),
    };
    const controller = new MarketContextIntelligenceController(service as any);
    const req = { query: { region: 'IN' } } as unknown as Request;
    const res = responseMock();

    await controller.persistedSummary(req, res);

    expect(service.latestPersistedSummary).toHaveBeenCalledWith('IN');
    expect(service.summary).not.toHaveBeenCalled();
    expect(service.run).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      status: 'missing',
      scope: { region: 'IN' },
      summary: null,
      asOf: null,
      materialized: false,
      message: 'Persisted market context is not available for this scope.',
    });
  });
});
