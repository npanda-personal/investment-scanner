/// <reference types="@types/jest" />
import { parseEvaluateRequest, parseStrategyQuery } from '../../../src/modules/strategy-decision-engine/strategy-decision-engine.validation';

const reviewStrategy = (overrides: Record<string, unknown> = {}) => ({
  code: 'TREND_MOMENTUM',
  status: 'ACTIVE',
  category: 'ENTRY',
  definitionSource: 'REGISTRY_FALLBACK',
  ...overrides,
});

describe('strategy decision validation', () => {
  it('resolves evaluate strategy values through persisted-first Strategy Framework definitions', async () => {
    const strategyFrameworkService = {
      list: jest.fn().mockResolvedValue([
        reviewStrategy({
          code: 'PERSISTED_REVIEW',
          name: 'Persisted Review Strategy',
          version: '9.9.0',
          definitionSource: 'PERSISTED',
        }),
      ]),
    };

    const request = await parseEvaluateRequest({ strategy: 'persisted_review' }, strategyFrameworkService as any);

    expect(request.strategy).toBe('PERSISTED_REVIEW');
    expect(strategyFrameworkService.list).toHaveBeenCalledWith({});
  });

  it('allows registry fallback definitions returned by the Strategy Framework provider', async () => {
    const strategyFrameworkService = {
      list: jest.fn().mockResolvedValue([
        reviewStrategy({
          code: 'TREND_MOMENTUM',
          definitionSource: 'REGISTRY_FALLBACK',
        }),
      ]),
    };

    const query = await parseStrategyQuery({ strategy: 'trend_momentum' }, strategyFrameworkService as any);

    expect(query.strategy).toBe('TREND_MOMENTUM');
  });

  it('keeps strategy=ALL without forcing a definition lookup', async () => {
    const strategyFrameworkService = {
      list: jest.fn(),
    };

    const request = await parseEvaluateRequest({ strategy: 'ALL' }, strategyFrameworkService as any);

    expect(request.strategy).toBe('ALL');
    expect(strategyFrameworkService.list).not.toHaveBeenCalled();
  });

  it('filters non-review support definitions out of validation', async () => {
    const strategyFrameworkService = {
      list: jest.fn().mockResolvedValue([
        reviewStrategy({
          code: 'LOW_QUALITY_DATA_REJECTION',
          category: 'FILTER',
        }),
      ]),
    };

    const request = await parseEvaluateRequest({ strategy: 'LOW_QUALITY_DATA_REJECTION' }, strategyFrameworkService as any);
    const query = await parseStrategyQuery({ strategy: 'LOW_QUALITY_DATA_REJECTION' }, strategyFrameworkService as any);

    expect(request.strategy).toBe('TREND_MOMENTUM');
    expect(query.strategy).toBeUndefined();
  });
});
