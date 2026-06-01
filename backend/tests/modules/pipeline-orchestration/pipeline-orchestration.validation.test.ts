/// <reference types="@types/jest" />
import {
  parsePipelineCommandCatalogQuery,
  parsePipelineCommandRequest,
  parsePipelineStatusQuery,
} from '../../../src/modules/pipeline-orchestration';

describe('pipeline orchestration validation', () => {
  it('defaults to scoped market-intelligence status', () => {
    expect(parsePipelineStatusQuery({})).toEqual({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      limit: 25,
    });
  });

  it('normalizes scope and parses stage key allowlist', () => {
    expect(parsePipelineStatusQuery({
      region: ' us ',
      assetType: ' etf ',
      timeframe: ' 1D ',
      pipelineKey: 'ops-pipeline',
      stageKeys: 'MARKET_DATA, DATA_QUALITY, MARKET_DATA',
      limit: '50',
    })).toEqual({
      region: 'US',
      assetType: 'ETF',
      timeframe: '1d',
      pipelineKey: 'ops-pipeline',
      stageKeys: ['MARKET_DATA', 'DATA_QUALITY'],
      limit: 50,
    });
  });

  it('rejects invalid limits and oversized stage allowlists', () => {
    expect(() => parsePipelineStatusQuery({ limit: '0' })).toThrow('limit must be an integer between 1 and 100');
    expect(() => parsePipelineStatusQuery({ limit: '101' })).toThrow('limit must be an integer between 1 and 100');
    expect(() => parsePipelineStatusQuery({ stageKeys: Array.from({ length: 26 }, (_, index) => `S${index}`).join(',') })).toThrow('stageKeys must include 25 or fewer values');
  });

  it('parses command catalog scope defaults and normalization', () => {
    expect(parsePipelineCommandCatalogQuery({
      region: ' us ',
      assetType: ' etf ',
      timeframe: ' 1D ',
      pipelineKey: ' custom-pipeline ',
    })).toEqual({
      region: 'US',
      assetType: 'ETF',
      timeframe: '1d',
      pipelineKey: 'custom-pipeline',
    });

    expect(parsePipelineCommandCatalogQuery({})).toEqual({
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
    });
  });

  it('parses executable command payload and enforces force=false', () => {
    expect(parsePipelineCommandRequest({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      region: ' in ',
      assetType: ' stock ',
      runMode: 'single_batch',
      batchSize: '50',
      offset: '10',
      idempotencyKey: 'abc-123',
      reason: 'manual verification',
    })).toEqual({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 50,
      offset: 10,
      idempotencyKey: 'abc-123',
      reason: 'manual verification',
      force: false,
    });

    expect(() => parsePipelineCommandRequest({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      runMode: 'single_batch',
      force: true,
    })).toThrow('force=true is not allowed for manual commands');
  });

  it('parses exchange reset command params for historical backfill, manual fundamentals, and retry', () => {
    expect(parsePipelineCommandRequest({
      commandKey: 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL',
      region: 'in',
      assetType: 'stock',
      runMode: 'single_batch',
      idempotencyKey: 'hist-1',
      params: {
        startDate: '2026-05-20',
        endDate: '2026-05-22',
        maxDates: 2,
        workerCount: 3,
        maxRetries: 2,
        includeBseFill: true,
      },
    })).toEqual(expect.objectContaining({
      commandKey: 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL',
      region: 'IN',
      assetType: 'STOCK',
      params: {
        startDate: '2026-05-20',
        endDate: '2026-05-22',
        maxDates: 2,
        workerCount: 3,
        maxRetries: 2,
        includeBseFill: true,
      },
    }));

    expect(parsePipelineCommandRequest({
      commandKey: 'MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT',
      runMode: 'single_batch',
      idempotencyKey: 'fund-1',
      params: {
        stockId: 'stock-1',
        periodType: 'ANNUAL',
        periodEndDate: '2026-03-31',
        marketCap: 1000000,
        sourceNote: 'NSE/BSE official filing',
        validatedBy: 'operator',
      },
    })).toEqual(expect.objectContaining({
      commandKey: 'MARKET_DATA_MANUAL_VERIFIED_FUNDAMENTALS_IMPORT',
      params: expect.objectContaining({
        stockId: 'stock-1',
        periodType: 'ANNUAL',
        periodEndDate: '2026-03-31',
      }),
    }));

    expect(parsePipelineCommandRequest({
      commandKey: 'PIPELINE_RETRY_FAILED_STAGE',
      runMode: 'single_batch',
      idempotencyKey: 'retry-1',
      params: {
        retryCommandKey: 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL',
        retryParams: {
          startDate: '2026-05-22',
          endDate: '2026-05-22',
          maxDates: 1,
        },
      },
    })).toEqual(expect.objectContaining({
      commandKey: 'PIPELINE_RETRY_FAILED_STAGE',
      params: expect.objectContaining({
        retryCommandKey: 'MARKET_DATA_HISTORICAL_EXCHANGE_BACKFILL',
      }),
    }));

    expect(() => parsePipelineCommandRequest({
      commandKey: 'PIPELINE_RETRY_FAILED_STAGE',
      runMode: 'single_batch',
      idempotencyKey: 'retry-2',
      params: ['bad'],
    })).toThrow('params must be an object when provided');
  });

  it('rejects unsupported command keys, bad run mode, and bounds violations', () => {
    expect(() => parsePipelineCommandRequest({
      commandKey: 'NOT_REAL',
      runMode: 'single_batch',
    })).toThrow('commandKey is required and must be a supported command');

    expect(() => parsePipelineCommandRequest({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      runMode: 'drain_all',
    })).toThrow('runMode must be single_batch');

    expect(() => parsePipelineCommandRequest({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      runMode: 'single_batch',
      batchSize: 101,
    })).toThrow('batchSize must be an integer between 1 and 100');

    expect(() => parsePipelineCommandRequest({
      commandKey: 'DATA_QUALITY_EVALUATE_SCOPE',
      runMode: 'single_batch',
      offset: -1,
    })).toThrow('offset must be a non-negative integer');
  });
});
