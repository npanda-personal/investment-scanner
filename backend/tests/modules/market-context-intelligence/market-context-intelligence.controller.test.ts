/// <reference types="@types/jest" />
import type { Request, Response } from 'express';
import { MarketContextIntelligenceController } from '../../../src/modules/market-context-intelligence';

function responseMock() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock; setHeader: jest.Mock };
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

  it('persistedBreadth returns ready envelope from latestPersistedBreadth only', async () => {
    const envelope = {
      status: 'ready',
      scope: { region: 'IN' },
      asOf: '2026-05-27T05:00:00.000Z',
      materialized: false,
      breadth: {
        percentAboveSma50: 0.62,
        percentAboveSma200: 0.54,
        sma50SampleCount: 220,
        sma200SampleCount: 180,
        instrumentCount: 240,
        officialAdvanceCount: null,
        officialDeclineCount: null,
        officialUnchangedCount: null,
      },
      sourceLabels: {
        savedBreadth: 'Persisted Market Context breadth',
        officialAdvancesDeclines: 'NSE official advances/declines not persisted',
      },
      gaps: [
        'Official advances are not persisted yet.',
        'Official declines are not persisted yet.',
        'Official unchanged counts are not persisted yet.',
      ],
    };
    const service = {
      latestPersistedBreadth: jest.fn().mockResolvedValue(envelope),
      latestPersistedSummary: jest.fn(),
      summary: jest.fn(),
      run: jest.fn(),
      breadth: jest.fn(),
    };
    const controller = new MarketContextIntelligenceController(service as any);
    const req = { query: { region: 'IN' } } as unknown as Request;
    const res = responseMock();

    await (controller as any).persistedBreadth(req, res);

    expect(service.latestPersistedBreadth).toHaveBeenCalledWith('IN');
    expect(service.latestPersistedSummary).not.toHaveBeenCalled();
    expect(service.summary).not.toHaveBeenCalled();
    expect(service.run).not.toHaveBeenCalled();
    expect(service.breadth).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(envelope);
  });

  it('persistedBreadth returns missing envelope without materializing when no saved breadth exists', async () => {
    const envelope = {
      status: 'missing',
      scope: { region: 'IN' },
      asOf: null,
      materialized: false,
      breadth: null,
      sourceLabels: {
        savedBreadth: 'Persisted Market Context breadth',
        officialAdvancesDeclines: 'NSE official advances/declines not persisted',
      },
      gaps: [
        'Saved breadth is not available for this scope.',
        'Official advances, declines, and unchanged counts are not persisted yet.',
      ],
    };
    const service = {
      latestPersistedBreadth: jest.fn().mockResolvedValue(envelope),
      latestPersistedSummary: jest.fn(),
      summary: jest.fn(),
      run: jest.fn(),
      breadth: jest.fn(),
    };
    const controller = new MarketContextIntelligenceController(service as any);
    const req = { query: { region: 'IN' } } as unknown as Request;
    const res = responseMock();

    await (controller as any).persistedBreadth(req, res);

    expect(service.latestPersistedBreadth).toHaveBeenCalledWith('IN');
    expect(service.latestPersistedSummary).not.toHaveBeenCalled();
    expect(service.summary).not.toHaveBeenCalled();
    expect(service.run).not.toHaveBeenCalled();
    expect(service.breadth).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(envelope);
  });
});
