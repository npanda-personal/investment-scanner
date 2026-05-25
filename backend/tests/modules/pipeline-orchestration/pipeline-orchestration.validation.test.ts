/// <reference types="@types/jest" />
import { parsePipelineStatusQuery } from '../../../src/modules/pipeline-orchestration';

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
});
