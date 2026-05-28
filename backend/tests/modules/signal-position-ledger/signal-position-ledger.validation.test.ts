/// <reference types="@types/jest" />
import { parseSignalPositionLedgerActiveQuery } from '../../../src/modules/signal-position-ledger';

describe('signal position ledger validation', () => {
  it('applies defaults', () => {
    expect(parseSignalPositionLedgerActiveQuery({})).toEqual({
      region: 'IN',
      assetType: 'STOCK',
      limit: 25,
      offset: 0,
      sortBy: 'entryTriggerTimestamp',
      sortDirection: 'desc',
    });
  });

  it('normalizes and clamps query params', () => {
    expect(parseSignalPositionLedgerActiveQuery({
      region: 'us',
      assetType: 'etf',
      limit: '999',
      offset: '-2',
      sortBy: 'currentReturnPercent',
      sortDirection: 'asc',
    })).toEqual({
      region: 'US',
      assetType: 'ETF',
      limit: 100,
      offset: 0,
      sortBy: 'currentReturnPercent',
      sortDirection: 'asc',
    });
  });
});

