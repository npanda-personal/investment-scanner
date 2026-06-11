/// <reference types="@types/jest" />
import {
  parsePipelineCommandCatalogQuery,
  parsePipelineCommandRequest,
  parsePipelineStatusQuery,
  isPipelineCommandKey,
} from '../../../src/modules/pipeline-orchestration';
import { PIPELINE_COMMAND_KEYS } from '../../../src/modules/pipeline-orchestration/pipeline-orchestration.types';

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

  it('parses the Market Pulse refresh command as a supported manual command', () => {
    expect(parsePipelineCommandRequest({
      commandKey: 'MARKET_PULSE_REFRESH',
      region: 'in',
      assetType: 'stock',
      runMode: 'single_batch',
      idempotencyKey: 'pulse-1',
    })).toEqual(expect.objectContaining({
      commandKey: 'MARKET_PULSE_REFRESH',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'pulse-1',
      force: false,
    }));
  });

  it('parses the full latest trading-date daily pipeline command', () => {
    expect(parsePipelineCommandRequest({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'in',
      assetType: 'stock',
      runMode: 'full_latest_trading_date',
      batchSize: '100',
      idempotencyKey: 'daily-full-1',
    })).toEqual(expect.objectContaining({
      commandKey: 'PIPELINE_RUN_ALL',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'full_latest_trading_date',
      batchSize: 100,
      offset: 0,
      idempotencyKey: 'daily-full-1',
      force: false,
    }));
  });

  it('parses the Signal Position Ledger refresh command as a supported command key', () => {
    expect(parsePipelineCommandRequest({
      commandKey: 'SIGNAL_POSITION_LEDGER_REFRESH',
      region: 'in',
      assetType: 'stock',
      runMode: 'single_batch',
      idempotencyKey: 'ledger-1',
    })).toEqual(expect.objectContaining({
      commandKey: 'SIGNAL_POSITION_LEDGER_REFRESH',
      runMode: 'single_batch',
      idempotencyKey: 'ledger-1',
    }));
  });

  it('parses the Sector Intelligence refresh command as a supported manual command', () => {
    expect(parsePipelineCommandRequest({
      commandKey: 'SECTOR_INTELLIGENCE_REFRESH',
      region: 'in',
      assetType: 'stock',
      runMode: 'single_batch',
      idempotencyKey: 'sector-1',
      params: { dataThroughDate: '2026-05-29' },
    })).toEqual(expect.objectContaining({
      commandKey: 'SECTOR_INTELLIGENCE_REFRESH',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'sector-1',
      params: { dataThroughDate: '2026-05-29' },
      force: false,
    }));
  });

  it('parses the Earnings Intelligence refresh command as a supported manual command', () => {
    expect(parsePipelineCommandRequest({
      commandKey: 'EARNINGS_INTELLIGENCE_REFRESH',
      region: 'in',
      assetType: 'stock',
      runMode: 'single_batch',
      idempotencyKey: 'earnings-1',
      params: { snapshotDate: '2026-06-01', dataThroughDate: '2026-05-31' },
    })).toEqual(expect.objectContaining({
      commandKey: 'EARNINGS_INTELLIGENCE_REFRESH',
      region: 'IN',
      assetType: 'STOCK',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      runMode: 'single_batch',
      batchSize: 25,
      offset: 0,
      idempotencyKey: 'earnings-1',
      params: { snapshotDate: '2026-06-01', dataThroughDate: '2026-05-31' },
      force: false,
    }));
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

  // ── Derivation invariant tests (FIX 2 — drift class must be structurally impossible) ───────

  it('isPipelineCommandKey accepts every key in PIPELINE_COMMAND_KEYS', () => {
    for (const key of PIPELINE_COMMAND_KEYS) {
      expect(isPipelineCommandKey(key)).toBe(true);
    }
  });

  it('isPipelineCommandKey rejects strings not in PIPELINE_COMMAND_KEYS', () => {
    expect(isPipelineCommandKey('NOT_REAL')).toBe(false);
    expect(isPipelineCommandKey('MARKET_SCAN_REFRES')).toBe(false); // off-by-one typo
    expect(isPipelineCommandKey('')).toBe(false);
  });

  it('isPipelineCommandKey accepts MARKET_SCAN_REFRESH and MARKET_CONTEXT_SNAPSHOT_REFRESH (the two previously missing live-400 keys)', () => {
    expect(isPipelineCommandKey('MARKET_SCAN_REFRESH')).toBe(true);
    expect(isPipelineCommandKey('MARKET_CONTEXT_SNAPSHOT_REFRESH')).toBe(true);
  });

  it('parsePipelineCommandRequest accepts MARKET_SCAN_REFRESH as a valid command key', () => {
    expect(parsePipelineCommandRequest({
      commandKey: 'MARKET_SCAN_REFRESH',
      region: 'in',
      assetType: 'stock',
      runMode: 'single_batch',
      idempotencyKey: 'scan-1',
    })).toEqual(expect.objectContaining({
      commandKey: 'MARKET_SCAN_REFRESH',
      region: 'IN',
      assetType: 'STOCK',
      runMode: 'single_batch',
      idempotencyKey: 'scan-1',
      force: false,
    }));
  });

  it('parsePipelineCommandRequest accepts MARKET_CONTEXT_SNAPSHOT_REFRESH as a valid command key', () => {
    expect(parsePipelineCommandRequest({
      commandKey: 'MARKET_CONTEXT_SNAPSHOT_REFRESH',
      region: 'in',
      assetType: 'stock',
      runMode: 'single_batch',
      idempotencyKey: 'ctx-snap-1',
    })).toEqual(expect.objectContaining({
      commandKey: 'MARKET_CONTEXT_SNAPSHOT_REFRESH',
      runMode: 'single_batch',
      idempotencyKey: 'ctx-snap-1',
      force: false,
    }));
  });
});
