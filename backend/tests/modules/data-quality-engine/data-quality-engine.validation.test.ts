/// <reference types="@types/jest" />
import { parseDataQualityEvaluateRequest, parseDataQualityQuery, requireInstrumentId } from '../../../src/modules/data-quality-engine';

describe('data quality engine validation', () => {
  it('parses filters and clamps list params', () => {
    expect(parseDataQualityQuery({ status: 'good', readinessStatus: 'ready', liquidityStatus: 'thin', limit: '9999', offset: '4', minCoverageScore: '120', eligibleForSignals: 'yes', sortBy: 'symbol', sortOrder: 'asc', search: 'reliance' })).toMatchObject({
      search: 'reliance',
      status: 'GOOD',
      readinessStatus: 'READY',
      liquidityStatus: 'THIN',
      eligibleForSignals: true,
      sortBy: 'symbol',
      sortOrder: 'asc',
      limit: 500,
      offset: 4,
      minCoverageScore: 100,
    });
  });

  it('parses evaluate requests and clamps batch params', () => {
    expect(parseDataQualityEvaluateRequest({ symbol: ' aapl ', batchSize: '999', cursor: '8' })).toMatchObject({
      symbol: 'AAPL',
      batchSize: 100,
      offset: 8,
    });
    expect(parseDataQualityEvaluateRequest({ batchSize: 0 })).toMatchObject({ batchSize: 1, offset: 0 });
  });

  it('requires instrument id', () => {
    expect(() => requireInstrumentId('')).toThrow('instrumentId is required');
    expect(requireInstrumentId('stock-1')).toBe('stock-1');
  });
});
