/// <reference types="@types/jest" />
import fs from 'fs';
import os from 'os';
import path from 'path';
import { latestCompletedTradingDateForRegion, MarketDataFoundationService } from '../../../src/modules/market-data-foundation';

const stock = {
  id: 'stock-1',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  region: 'US',
  exchange: 'NASDAQ',
  isActive: true,
  lastSuccessfulDataLoadTimestamp: new Date('2026-01-01T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  country: 'US',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  currency: 'USD',
  marketCap: null,
  assetType: 'EQUITY',
  isDelisted: false,
  ipoDate: null,
  isin: null,
  source: 'database',
  dataStatus: 'COMPLETE',
};

const resetCatalogSyncRuns = () => {
  (MarketDataFoundationService as any).catalogSyncRuns?.clear();
  (MarketDataFoundationService as any).activeCatalogSyncRuns?.clear();
  (MarketDataFoundationService as any).historicalBackfillDatabasePauses?.clear();
  (MarketDataFoundationService as any).activeHistoricalBackfillRuns?.clear();
};

const buildStoredZip = (fileName: string, text: string): Buffer => {
  const name = Buffer.from(fileName, 'utf8');
  const data = Buffer.from(text, 'utf8');
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(0, 8);
  local.writeUInt32LE(0, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt32LE(0, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt32LE(0, 42);

  const centralOffset = local.length + name.length + data.length;
  const centralSize = central.length + name.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);

  return Buffer.concat([local, name, data, central, name, eocd]);
};

class FakeHistoricalBackfillPrisma {
  runs: any[] = [];
  stages: any[] = [];
  private runSequence = 0;
  private stageSequence = 0;

  pipelineRun = {
    create: jest.fn(async ({ data }: any) => {
      const now = new Date('2026-05-25T03:00:00.000Z');
      const run = {
        id: `run-${++this.runSequence}`,
        changedInstrumentCount: 0,
        partialCount: 0,
        dataThroughDate: null,
        sourceFingerprint: null,
        completedAt: null,
        durationMs: null,
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      this.runs.push(run);
      return { ...run };
    }),
    findUnique: jest.fn(async ({ where, include }: any) => {
      const run = this.runs.find((item) => item.id === where.id || item.idempotencyKey === where.idempotencyKey);
      if (!run) return null;
      const output = { ...run };
      if (include?.stages) {
        output.stages = this.stages
          .filter((stage) => stage.pipelineRunId === run.id)
          .map((stage) => ({ ...stage }))
          .sort((a, b) => {
            const aDate = a.dataThroughDate ? new Date(a.dataThroughDate).getTime() : 0;
            const bDate = b.dataThroughDate ? new Date(b.dataThroughDate).getTime() : 0;
            if (aDate !== bDate) return aDate - bDate;
            return Number(a.stageOrder || 0) - Number(b.stageOrder || 0);
          });
      }
      return output;
    }),
    findMany: jest.fn(async ({ where, orderBy, take }: any = {}) => {
      let result = this.runs.filter((run) => this.matchesWhere(run, where));
      if (orderBy?.startedAt) {
        const direction = String(orderBy.startedAt).toLowerCase() === 'asc' ? 1 : -1;
        result = [...result].sort((a, b) => direction * ((a.startedAt ? new Date(a.startedAt).getTime() : 0) - (b.startedAt ? new Date(b.startedAt).getTime() : 0)));
      }
      if (take !== undefined) result = result.slice(0, take);
      return result.map((run) => ({ ...run }));
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const index = this.runs.findIndex((item) => item.id === where.id || item.idempotencyKey === where.idempotencyKey);
      if (index < 0) throw new Error('run not found');
      this.runs[index] = { ...this.runs[index], ...data, updatedAt: new Date() };
      return { ...this.runs[index] };
    }),
  };

  pipelineStageRun = {
    createMany: jest.fn(async ({ data }: any) => {
      for (const item of data) {
        if (this.stages.some((stage) => stage.pipelineRunId === item.pipelineRunId && stage.stageKey === item.stageKey)) continue;
        const now = new Date('2026-05-25T03:00:00.000Z');
        this.stages.push({
          id: `stage-${++this.stageSequence}`,
          changedInstrumentCount: 0,
          partialCount: 0,
          attemptCount: 0,
          cacheKey: null,
          cacheStatus: 'BYPASS',
          cacheExpiresAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          startedAt: null,
          durationMs: null,
          createdAt: now,
          updatedAt: now,
          ...item,
        });
      }
      return { count: data.length };
    }),
    findMany: jest.fn(async ({ where, orderBy, take }: any = {}) => {
      let result = this.stages.filter((stage) => this.matchesWhere(stage, where));
      if (orderBy) {
        result = [...result].sort((a, b) => {
          const aDate = a.dataThroughDate ? new Date(a.dataThroughDate).getTime() : 0;
          const bDate = b.dataThroughDate ? new Date(b.dataThroughDate).getTime() : 0;
          if (aDate !== bDate) return aDate - bDate;
          return Number(a.stageOrder || 0) - Number(b.stageOrder || 0);
        });
      }
      if (take !== undefined) result = result.slice(0, take);
      return result.map((stage) => ({ ...stage }));
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      const stage = this.stages.find((item) => item.id === where.id || item.idempotencyKey === where.idempotencyKey);
      return stage ? { ...stage } : null;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const index = this.stages.findIndex((item) => item.id === where.id || item.idempotencyKey === where.idempotencyKey);
      if (index < 0) throw new Error('stage not found');
      this.stages[index] = this.applyData(this.stages[index], data);
      return { ...this.stages[index] };
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      let count = 0;
      this.stages = this.stages.map((stage) => {
        if (!this.matchesWhere(stage, where)) return stage;
        count += 1;
        return this.applyData(stage, data);
      });
      return { count };
    }),
  };

  private applyData(row: any, data: any) {
    const next = { ...row };
    for (const [key, value] of Object.entries(data || {})) {
      if (value && typeof value === 'object' && 'increment' in (value as any)) {
        next[key] = Number(next[key] || 0) + Number((value as any).increment || 0);
      } else {
        next[key] = value;
      }
    }
    next.updatedAt = new Date();
    return next;
  }

  private matchesWhere(row: any, where: any): boolean {
    if (!where) return true;
    return Object.entries(where).every(([key, value]) => {
      if (key === 'OR') return Array.isArray(value) && value.some((condition) => this.matchesWhere(row, condition));
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const typed = value as any;
        if ('in' in typed) return typed.in.includes(row[key]);
        if ('lt' in typed) {
          const rowValue = row[key] instanceof Date ? row[key].getTime() : row[key] ? new Date(row[key]).getTime() : Number.POSITIVE_INFINITY;
          return rowValue < new Date(typed.lt).getTime();
        }
        return this.matchesWhere(row[key], value);
      }
      return row[key] === value;
    });
  }
}

const nseImportSummary = (tradingDate: string, overrides: Record<string, unknown> = {}) => ({
  status: 'COMPLETED',
  source: 'NSE',
  segment: 'CM',
  tradingDate,
  rowsRead: 2,
  rowsParsed: 2,
  rowsInserted: 1,
  rowsUpdated: 0,
  rowsNoOp: 1,
  rowsSkipped: 0,
  warningCount: 0,
  warnings: [],
  errors: [],
  sourceFileImportId: `source-${tradingDate}`,
  ...overrides,
});

const nseDeliveryImportSummary = (tradingDate: string, overrides: Record<string, unknown> = {}) => ({
  status: 'COMPLETED',
  source: 'NSE',
  segment: 'DELIVERY',
  tradingDate,
  sourceName: 'NSE_DELIVERY',
  fileName: `sec_bhavdata_full_${tradingDate.replace(/-/g, '')}.csv`,
  fileUrl: `https://archives.nseindia.com/products/content/sec_bhavdata_full_${tradingDate.replace(/-/g, '')}.csv`,
  sourceFileImportId: `delivery-source-${tradingDate}`,
  sourceFingerprint: `nse-delivery:${tradingDate}`,
  rowsRead: 2,
  rowsParsed: 2,
  rowsInserted: 2,
  rowsUpdated: 0,
  rowsNoOp: 0,
  rowsSkipped: 0,
  warningCount: 0,
  warnings: [],
  errors: [],
  changedSymbols: [`RELIANCE-${tradingDate}`],
  downstreamSymbols: [`RELIANCE-${tradingDate}`],
  ...overrides,
});

const nseIndexImportSummary = (tradingDate: string, overrides: Record<string, unknown> = {}) => ({
  status: 'COMPLETED',
  source: 'NSE',
  segment: 'INDEX',
  tradingDate,
  sourceName: 'NSE_INDEX_EOD',
  fileName: `ind_close_all_${tradingDate.split('-').reverse().join('')}.csv`,
  fileUrl: `https://archives.nseindia.com/content/indices/ind_close_all_${tradingDate.split('-').reverse().join('')}.csv`,
  rowsRead: 4,
  rowsParsed: 4,
  rowsInserted: 3,
  rowsUpdated: 0,
  rowsNoOp: 1,
  rowsSkipped: 0,
  warningCount: 0,
  warnings: [],
  errors: [],
  sourceFileImportId: `index-source-${tradingDate}`,
  sourceFingerprint: `nse-index-eod:${tradingDate}`,
  changedSymbols: ['^NSEBANK', '^NSEI', 'NSE_INDEX_NIFTY_500'],
  downstreamSymbols: ['^CNXIT', '^NSEBANK', '^NSEI', 'NSE_INDEX_NIFTY_500'],
  ...overrides,
});

const mockOfficialNseTradingHolidays = (
  service: MarketDataFoundationService,
  holidays: Array<[string, string]> = []
) => jest.spyOn(service as any, 'nseCmTradingHolidayDatesForRange')
  .mockResolvedValue(new Map(holidays));

const transientDbError = () => Object.assign(new Error('Server has closed the connection.'), {
  code: 'P1017',
  clientVersion: '6.0.0',
});

describe('MarketDataFoundationService syncV1', () => {
  beforeEach(() => {
    resetCatalogSyncRuns();
  });

  it('fails closed for legacy provider search, fundamentals, corporate actions, and historical fetches', async () => {
    const provider = {
      search: jest.fn(),
      fetchCoreFundamentals: jest.fn(),
      fetchCorporateActions: jest.fn(),
      fetchHistorical: jest.fn(),
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
    };
    const angel = {
      canHandleHistorical: jest.fn().mockReturnValue(true),
      fetchHistorical: jest.fn(),
    };
    const service = new MarketDataFoundationService({} as any, provider as any, angel as any);

    await expect(service.yahooSearch('RELIANCE')).rejects.toThrow(/disabled/i);
    await expect(service.fetchCoreFundamentals('RELIANCE')).rejects.toThrow(/disabled/i);
    await expect(service.fetchCorporateActions('RELIANCE')).rejects.toThrow(/disabled/i);
    await expect(service.fetchHistorical('RELIANCE')).rejects.toThrow(/disabled/i);
    expect(provider.search).not.toHaveBeenCalled();
    expect(provider.fetchCoreFundamentals).not.toHaveBeenCalled();
    expect(provider.fetchCorporateActions).not.toHaveBeenCalled();
    expect(provider.fetchHistorical).not.toHaveBeenCalled();
    expect(angel.fetchHistorical).not.toHaveBeenCalled();
  });

  it('uses stored fundamentals only and does not materialize Yahoo fundamentals on read', async () => {
    const repository = {
      findStockByIdInScope: jest.fn().mockResolvedValue({ id: 'stock-1', symbol: 'RELIANCE' }),
      listFundamentals: jest.fn().mockResolvedValue([]),
      upsertFundamentals: jest.fn(),
    };
    const provider = { fetchCoreFundamentals: jest.fn() };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.fundamentalsByInstrumentId('stock-1', { region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({ instrument_id: 'stock-1', symbol: 'RELIANCE', data_status: 'MISSING' });
    expect(provider.fetchCoreFundamentals).not.toHaveBeenCalled();
    expect(repository.upsertFundamentals).not.toHaveBeenCalled();
  });

  it('imports NSE CM UDiFF daily candles through the source-file ledger with no provider suffix storage', async () => {
    const csvText = [
      'TradDt,Sgmt,Src,FinInstrmTp,TckrSymb,SctySrs,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol',
      '2026-05-27,CM,NSE,STK,RELIANCE,EQ,1400,1420,1390,1410,1000',
      '2026-05-27,CM,NSE,STK,TCS,EQ,3300,3350,3280,3333,2000',
    ].join('\n');
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue(null),
      upsertSourceFileImport: jest.fn()
        .mockResolvedValueOnce({ id: 'import-1', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'import-1', status: 'COMPLETED' }),
      storeHistoricalBulk: jest.fn().mockResolvedValue({
        rowsReceived: 2,
        rowsInserted: 2,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
        summaryBySymbol: new Map([
          ['RELIANCE', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
          ['TCS', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
        ]),
      }),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      search: jest.fn(),
      fetchCoreFundamentals: jest.fn(),
      fetchCorporateActions: jest.fn(),
      fetchHistorical: jest.fn(),
      fetchCompanyMasterData: jest.fn(),
      fetchFxRate: jest.fn(),
    };
    const angel = {
      canHandleHistorical: jest.fn(),
      fetchHistorical: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any, angel as any);

    const result = await (service as any).importNseCmUdiffDaily({
      tradingDate: '2026-05-27',
      csvText,
      fileName: 'BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv',
      fileUrl: 'local-fixture.csv',
    });

    expect(result).toMatchObject({
      status: 'COMPLETED',
      source: 'NSE',
      segment: 'CM',
      tradingDate: '2026-05-27',
      rowsRead: 2,
      rowsParsed: 2,
      rowsInserted: 2,
      rowsUpdated: 0,
      rowsNoOp: 0,
      rowsSkipped: 0,
      sourceFileImportId: 'import-1',
      changedSymbols: ['RELIANCE', 'TCS'],
      downstreamSymbols: ['RELIANCE', 'TCS'],
    });
    expect(repository.upsertSourceFileImport).toHaveBeenNthCalledWith(1, expect.objectContaining({
      source: 'NSE',
      segment: 'CM',
      status: 'PENDING',
      rowsRaw: 2,
      rowsAccepted: 0,
    }));
    expect(repository.storeHistoricalBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({ symbol: 'RELIANCE', source: 'NSE_UDIFF_CM_BHAVCOPY' }),
        expect.objectContaining({ symbol: 'TCS', source: 'NSE_UDIFF_CM_BHAVCOPY' }),
      ],
      expect.any(Function),
      expect.any(Map),
      { sourceFileImportId: 'import-1' }
    );
    expect(repository.storeHistoricalBulk.mock.calls[0][0][0].symbol).not.toContain('.NS');
    expect(repository.upsertSourceFileImport).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'COMPLETED',
      rowsAccepted: 2,
      rowsRejected: 0,
    }));
    expect(provider.search).not.toHaveBeenCalled();
    expect(provider.fetchCoreFundamentals).not.toHaveBeenCalled();
    expect(provider.fetchCorporateActions).not.toHaveBeenCalled();
    expect(provider.fetchHistorical).not.toHaveBeenCalled();
    expect(provider.fetchCompanyMasterData).not.toHaveBeenCalled();
    expect(provider.fetchFxRate).not.toHaveBeenCalled();
    expect(angel.canHandleHistorical).not.toHaveBeenCalled();
    expect(angel.fetchHistorical).not.toHaveBeenCalled();
  });

  it('returns failed NSE CM import summaries when candle persistence fails', async () => {
    const csvText = [
      'TradDt,Sgmt,Src,FinInstrmTp,TckrSymb,SctySrs,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol',
      '2026-05-27,CM,NSE,STK,RELIANCE,EQ,1400,1420,1390,1410,1000',
    ].join('\n');
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue(null),
      upsertSourceFileImport: jest.fn()
        .mockResolvedValueOnce({ id: 'import-1', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'import-1', status: 'FAILED' }),
      storeHistoricalBulk: jest.fn().mockRejectedValue(new Error('DB save failed')),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
    } as any);

    const result = await (service as any).importNseCmUdiffDaily({
      tradingDate: '2026-05-27',
      csvText,
      fileName: 'BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv',
      fileUrl: 'local-fixture.csv',
    });

    expect(result).toMatchObject({
      status: 'FAILED',
      source: 'NSE',
      segment: 'CM',
      tradingDate: '2026-05-27',
      rowsRead: 1,
      rowsParsed: 1,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsNoOp: 0,
      rowsSkipped: 1,
      errors: ['DB save failed'],
      sourceFileImportId: 'import-1',
    });
    expect(repository.upsertSourceFileImport).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'FAILED',
      rowsRaw: 1,
      rowsAccepted: 0,
      rowsRejected: 1,
      errorMessage: 'DB save failed',
    }));
  });

  it('skips duplicate completed NSE CM UDiFF imports by source file hash', async () => {
    const csvText = [
      'TradDt,Sgmt,Src,FinInstrmTp,TckrSymb,SctySrs,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol',
      '2026-05-27,CM,NSE,STK,RELIANCE,EQ,1400,1420,1390,1410,1000',
    ].join('\n');
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue({ id: 'import-1', status: 'COMPLETED' }),
      upsertSourceFileImport: jest.fn(),
      storeHistoricalBulk: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
    } as any);

    const result = await (service as any).importNseCmUdiffDaily({
      tradingDate: '2026-05-27',
      csvText,
      fileName: 'BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv',
      fileUrl: 'local-fixture.csv',
    });

    expect(result).toMatchObject({
      status: 'SKIPPED_DUPLICATE',
      sourceFileImportId: 'import-1',
      rowsParsed: 1,
      changedSymbols: [],
      downstreamSymbols: ['RELIANCE'],
    });
    expect(repository.upsertSourceFileImport).not.toHaveBeenCalled();
    expect(repository.storeHistoricalBulk).not.toHaveBeenCalled();
  });

  it('lists daily refresh eligible instruments from latest persisted prices without provider calls', async () => {
    const repository = {
      listDailyRefreshEligibleInstrumentIds: jest.fn().mockResolvedValue({
        region: 'IN',
        assetType: 'STOCK',
        dataThroughDate: '2026-05-27',
        source: 'LATEST_PRICE',
        instrumentIds: ['reliance-id', 'tcs-id'],
        instrumentCount: 2,
      }),
    };
    const provider = {
      search: jest.fn(),
      fetchCoreFundamentals: jest.fn(),
      fetchCorporateActions: jest.fn(),
      fetchHistorical: jest.fn(),
      fetchCompanyMasterData: jest.fn(),
      fetchFxRate: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.listDailyRefreshEligibleInstrumentIds({
      region: 'IN',
      assetType: 'STOCK',
      dataThroughDate: '2026-05-27',
    });

    expect(result).toMatchObject({
      source: 'LATEST_PRICE',
      instrumentIds: ['reliance-id', 'tcs-id'],
      instrumentCount: 2,
    });
    expect(repository.listDailyRefreshEligibleInstrumentIds).toHaveBeenCalledWith({
      region: 'IN',
      assetType: 'STOCK',
      dataThroughDate: '2026-05-27',
      limit: undefined,
    });
    expect(provider.search).not.toHaveBeenCalled();
    expect(provider.fetchCoreFundamentals).not.toHaveBeenCalled();
    expect(provider.fetchCorporateActions).not.toHaveBeenCalled();
    expect(provider.fetchHistorical).not.toHaveBeenCalled();
    expect(provider.fetchCompanyMasterData).not.toHaveBeenCalled();
    expect(provider.fetchFxRate).not.toHaveBeenCalled();
  });

  it('creates a persisted historical exchange backfill run and skips already imported dates', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const completedDates = new Set(['2026-05-27']);
    const repository = {
      prisma,
      listCompletedSourceFileImportDates: jest.fn(async ({ startDate, endDate }: any) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        return [...completedDates]
          .map((date) => new Date(`${date}T00:00:00.000Z`))
          .filter((date) => date.getTime() >= start && date.getTime() <= end);
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
    } as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'importNseCmOfficialDaily').mockImplementation(async ({ tradingDate }: any) => {
      const key = (service as any).exchangeDateKey(tradingDate);
      return nseImportSummary(key, key === '2026-05-26'
        ? { rowsInserted: 2, rowsNoOp: 0 }
        : { rowsInserted: 0, rowsUpdated: 1, rowsNoOp: 1 });
    });

    const started = await (service as any).startExchangeHistoricalBackfillRun({
      region: 'IN',
      assetType: 'STOCK',
      startDate: '2026-05-26',
      endDate: '2026-05-28',
      maxDates: 10,
      workerCount: 3,
      downloadDelayMs: 0,
      jitterMs: 0,
      autoStart: false,
    });

    expect(started).toMatchObject({
      status: 'RUNNING',
      totalDates: 3,
      pending: 2,
      skipped: 1,
      workerCount: 3,
      progressPercent: 33.3,
    });

    await (service as any).processExchangeHistoricalBackfillRun(started.runId);

    const result = await (service as any).getExchangeHistoricalBackfillRun(started.runId);
    const importedDates = (service as any).importNseCmOfficialDaily.mock.calls
      .map(([input]: any[]) => (service as any).exchangeDateKey(input.tradingDate));
    expect(new Set(importedDates)).toEqual(new Set(['2026-05-26', '2026-05-28']));
    expect(importedDates).toHaveLength(2);
    expect((service as any).importNseCmOfficialDaily.mock.calls.every(([input]: any[]) => input.skipLatestPriceUpdate === true)).toBe(true);
    expect(result).toMatchObject({
      status: 'COMPLETED',
      totalDates: 3,
      completed: 2,
      skipped: 1,
      failed: 0,
      rowsInserted: 2,
      rowsUpdated: 1,
      rowsNoOp: 1,
      progressPercent: 100,
    });
    expect(result.jobs.map((job: any) => job.status)).toEqual([
      'COMPLETED',
      'SKIPPED_ALREADY_IMPORTED',
      'COMPLETED',
    ]);
  });

  it('reuses an active historical backfill run for the same range instead of starting duplicate workers', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'startHistoricalBackfillWorkers').mockImplementation(() => undefined);

    const first = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-27',
      autoStart: false,
    });
    const second = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-27',
      autoStart: false,
    });

    expect(second.runId).toBe(first.runId);
    expect(prisma.runs).toHaveLength(1);
    expect(prisma.stages).toHaveLength(2);
  });

  it('uses official NSE EOD fallback sources for historical backfill instead of UDiFF-only downloads', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    const officialSpy = jest.spyOn(service as any, 'importNseCmOfficialDaily').mockResolvedValue(nseImportSummary('2023-01-02', {
      sourceName: 'NSE_LEGACY_CM_BHAVCOPY',
      fileName: 'cm02JAN2023bhav.csv.zip',
    }));
    const udiffSpy = jest.spyOn(service as any, 'importNseCmUdiffDaily').mockResolvedValue(nseImportSummary('2023-01-02'));

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2023-01-02',
      endDate: '2023-01-02',
      downloadDelayMs: 0,
      jitterMs: 0,
      autoStart: false,
    });
    await (service as any).processExchangeHistoricalBackfillRun(run.runId);

    expect(officialSpy).toHaveBeenCalledWith({ tradingDate: new Date('2023-01-02T00:00:00.000Z'), skipLatestPriceUpdate: true });
    expect(udiffSpy).not.toHaveBeenCalled();
    const result = await (service as any).getExchangeHistoricalBackfillRun(run.runId);
    expect(result).toMatchObject({
      status: 'COMPLETED',
      completed: 1,
      notAvailable: 0,
    });
  });

  it('uses official NSE all-index files for INDEX historical backfill jobs', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const repository = {
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([new Date('2026-05-26T00:00:00.000Z')]),
      listCompletedOfficialNseIndexImportDates: jest.fn().mockResolvedValue([]),
      rebuildLatestPricesFromExchangeCandles: jest.fn().mockResolvedValue({ rebuiltCount: 4, staleDeletedCount: 0 }),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE_INDEX' }),
    } as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    const indexSpy = jest.spyOn(service as any, 'importNseIndexOfficialDaily').mockImplementation(async ({ tradingDate }: any) => {
      const key = (service as any).exchangeDateKey(tradingDate);
      return nseIndexImportSummary(key);
    });
    const cmSpy = jest.spyOn(service as any, 'importNseCmOfficialDaily').mockResolvedValue(nseImportSummary('2026-05-26'));

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      region: 'IN',
      assetType: 'INDEX',
      startDate: '2026-05-26',
      endDate: '2026-05-27',
      downloadDelayMs: 0,
      jitterMs: 0,
      autoStart: false,
    });
    await (service as any).processExchangeHistoricalBackfillRun(run.runId);

    expect(indexSpy).toHaveBeenCalledTimes(2);
    expect(indexSpy.mock.calls.every(([input]: any[]) => input.skipLatestPriceUpdate === true)).toBe(true);
    expect(cmSpy).not.toHaveBeenCalled();
    expect(repository.listCompletedOfficialNseIndexImportDates).toHaveBeenCalledWith(expect.objectContaining({
      startDate: new Date('2026-05-26T00:00:00.000Z'),
      endDate: new Date('2026-05-27T00:00:00.000Z'),
    }));
    expect(repository.listCompletedSourceFileImportDates).not.toHaveBeenCalledWith(expect.objectContaining({
      segment: 'INDEX',
    }));
    const result = await (service as any).getExchangeHistoricalBackfillRun(run.runId);
    expect(result).toMatchObject({
      status: 'COMPLETED',
      source: 'NSE',
      segment: 'INDEX',
      assetType: 'INDEX',
      completed: 2,
      rowsRead: 8,
      rowsParsed: 8,
      rowsInserted: 6,
      rowsNoOp: 2,
      bseFills: 0,
    });
    expect(result.jobs.map((job: any) => job.source)).toEqual(['NSE_INDEX', 'NSE_INDEX']);
    expect(repository.rebuildLatestPricesFromExchangeCandles).toHaveBeenCalled();
  });

  it('skips official NSE CM trading holidays before queuing historical backfill date jobs', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    const holidaySpy = mockOfficialNseTradingHolidays(service, [
      ['2025-03-14', 'Holi'],
    ]);
    jest.spyOn(service as any, 'startHistoricalBackfillWorkers').mockImplementation(() => undefined);

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2025-03-10',
      endDate: '2025-03-17',
      autoStart: false,
    });

    expect(holidaySpy).toHaveBeenCalled();
    expect(run.jobs.map((job: any) => job.tradingDate)).toEqual([
      '2025-03-10',
      '2025-03-11',
      '2025-03-12',
      '2025-03-13',
      '2025-03-17',
    ]);
    expect(run.totalDates).toBe(5);
    expect(run.warnings.join(' ')).toContain('official NSE CM trading holiday');
    expect(prisma.runs[0].metadata).toMatchObject({
      skippedOfficialHolidayDates: 1,
      officialHolidayCalendarSource: 'https://www.nseindia.com/api/holiday-master?type=trading&year={year}',
    });
  });

  it('parses official NSE holiday-master CM rows into ISO trading holiday dates', async () => {
    const service = new MarketDataFoundationService({} as any, {} as any);
    const downloadSpy = jest.spyOn(service as any, 'downloadOfficialExchangeJson').mockResolvedValue({
      CM: [
        { tradingDate: '14-Mar-2025', description: 'Holi' },
        { tradingDate: '25-Dec-2025', description: 'Christmas' },
      ],
      FO: [
        { tradingDate: '01-Jan-2025', description: 'Not used for CM' },
      ],
    });

    const holidays = await (service as any).fetchOfficialNseTradingHolidayDatesForYear(
      2025,
      'https://www.nseindia.com/api/holiday-master?type=trading&year=2025'
    );

    expect(downloadSpy).toHaveBeenCalledWith('https://www.nseindia.com/api/holiday-master?type=trading&year=2025');
    expect([...holidays.entries()]).toEqual([
      ['2025-03-14', 'Holi'],
      ['2025-12-25', 'Christmas'],
    ]);
  });

  it('defaults historical backfill to three workers and caps worker count at five', async () => {
    const defaultPrisma = new FakeHistoricalBackfillPrisma();
    const defaultService = new MarketDataFoundationService({
      prisma: defaultPrisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(defaultService);
    jest.spyOn(defaultService as any, 'startHistoricalBackfillWorkers').mockImplementation(() => undefined);

    const defaultRun = await (defaultService as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-26',
      autoStart: false,
    });
    expect(defaultRun.workerCount).toBe(3);

    const cappedPrisma = new FakeHistoricalBackfillPrisma();
    const cappedService = new MarketDataFoundationService({
      prisma: cappedPrisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(cappedService);
    jest.spyOn(cappedService as any, 'startHistoricalBackfillWorkers').mockImplementation(() => undefined);

    const cappedRun = await (cappedService as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-26',
      workerCount: 99,
      autoStart: false,
    });
    expect(cappedRun.workerCount).toBe(5);
  });

  it('caps historical backfill end date to the latest completed exchange date and rejects fully future ranges', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
    try {
      const latestCompleted = latestCompletedTradingDateForRegion('IN');
      const prisma = new FakeHistoricalBackfillPrisma();
      const service = new MarketDataFoundationService({
        prisma,
        listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
      } as any, {} as any);
      mockOfficialNseTradingHolidays(service);
      jest.spyOn(service as any, 'startHistoricalBackfillWorkers').mockImplementation(() => undefined);

      const cappedRun = await (service as any).startExchangeHistoricalBackfillRun({
        startDate: '2026-05-29',
        endDate: '2026-12-31',
        autoStart: false,
      });

      expect(cappedRun.endDate).toBe(latestCompleted);
      expect(cappedRun.warnings.join(' ')).toContain('capped to latest completed trading date');
      await expect((service as any).startExchangeHistoricalBackfillRun({
        startDate: '2026-06-02',
        endDate: '2026-06-05',
        autoStart: false,
      })).rejects.toThrow(/cannot start after the latest completed trading date/);
    } finally {
      jest.useRealTimers();
    }
  });

  it('retries only failed and not-available historical backfill jobs', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'startHistoricalBackfillWorkers').mockImplementation(() => undefined);

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-28',
      autoStart: false,
    });
    prisma.stages[0] = {
      ...prisma.stages[0],
      status: 'COMPLETED',
      attemptCount: 1,
      metadata: { ...prisma.stages[0].metadata, jobStatus: 'COMPLETED' },
    };
    prisma.stages[1] = {
      ...prisma.stages[1],
      status: 'FAILED',
      attemptCount: 1,
      errors: ['HTTP 500'],
      metadata: { ...prisma.stages[1].metadata, jobStatus: 'FAILED', lastError: 'HTTP 500' },
    };
    prisma.stages[2] = {
      ...prisma.stages[2],
      status: 'SKIPPED',
      attemptCount: 1,
      errors: ['HTTP 404'],
      metadata: { ...prisma.stages[2].metadata, jobStatus: 'NOT_AVAILABLE', lastError: 'HTTP 404' },
    };

    const retry = await (service as any).retryFailedExchangeHistoricalBackfillRun(run.runId, { maxRetries: 2 });

    expect(retry.pending).toBe(2);
    expect(retry.completed).toBe(1);
    expect(retry.jobs.find((job: any) => job.tradingDate === '2026-05-26')).toMatchObject({ status: 'COMPLETED' });
    expect(retry.jobs.find((job: any) => job.tradingDate === '2026-05-27')).toMatchObject({ status: 'PENDING', retryCount: 1 });
    expect(retry.jobs.find((job: any) => job.tradingDate === '2026-05-28')).toMatchObject({ status: 'PENDING', retryCount: 1 });
  });

  it('marks stale running historical backfill jobs retryable during resume', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'startHistoricalBackfillWorkers').mockImplementation(() => undefined);

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-27',
      staleJobTimeoutMs: 60_000,
      autoStart: false,
    });
    prisma.stages[0] = {
      ...prisma.stages[0],
      status: 'RUNNING',
      leaseExpiresAt: new Date('2026-05-25T01:00:00.000Z'),
      updatedAt: new Date('2026-05-25T01:00:00.000Z'),
      metadata: { ...prisma.stages[0].metadata, jobStatus: 'RUNNING' },
    };

    const resumed = await (service as any).resumeExchangeHistoricalBackfillRun(run.runId);

    expect(resumed.status).toBe('RUNNING');
    expect(resumed.pending).toBe(2);
    expect(resumed.jobs.find((job: any) => job.tradingDate === '2026-05-26')).toMatchObject({
      status: 'STALE_RETRYABLE',
      error: 'Previous worker lease became stale before completion.',
    });
  });

  it('surfaces stale running historical backfill jobs as blocked on status read', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'startHistoricalBackfillWorkers').mockImplementation(() => undefined);

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-27',
      staleJobTimeoutMs: 60_000,
      autoStart: false,
    });
    prisma.stages[0] = {
      ...prisma.stages[0],
      status: 'RUNNING',
      leaseExpiresAt: new Date('2026-05-25T01:00:00.000Z'),
      updatedAt: new Date('2026-05-25T01:00:00.000Z'),
      metadata: { ...prisma.stages[0].metadata, jobStatus: 'RUNNING' },
    };

    const status = await (service as any).getExchangeHistoricalBackfillRun(run.runId);

    expect(status.status).toBe('BLOCKED');
    expect(status.running).toBe(0);
    expect(status.pending).toBe(2);
    expect(status.warnings.join(' ')).toContain('stale worker');
    expect(status.jobs.find((job: any) => job.tradingDate === '2026-05-26')).toMatchObject({
      status: 'STALE_RETRYABLE',
      error: 'Previous worker lease became stale before completion.',
    });
  });

  it('does not recycle stale-looking running jobs while the current process is actively working the run', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'startHistoricalBackfillWorkers').mockImplementation(() => undefined);

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-26',
      staleJobTimeoutMs: 60_000,
      autoStart: false,
    });
    prisma.stages[0] = {
      ...prisma.stages[0],
      status: 'RUNNING',
      leaseOwner: 'worker-active',
      leaseExpiresAt: new Date('2026-05-25T01:00:00.000Z'),
      updatedAt: new Date('2026-05-25T01:00:00.000Z'),
      metadata: { ...prisma.stages[0].metadata, jobStatus: 'RUNNING' },
    };
    (MarketDataFoundationService as any).activeHistoricalBackfillRuns.add(run.runId);

    try {
      const status = await (service as any).getExchangeHistoricalBackfillRun(run.runId);

      expect(status.status).toBe('RUNNING');
      expect(status.running).toBe(1);
      expect(status.pending).toBe(0);
      expect(status.jobs[0]).toMatchObject({ status: 'RUNNING' });
    } finally {
      (MarketDataFoundationService as any).activeHistoricalBackfillRuns.delete(run.runId);
    }
  });

  it('retries transient database disconnects when reading historical backfill status', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'startHistoricalBackfillWorkers').mockImplementation(() => undefined);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-26',
      autoStart: false,
    });
    const originalFindUnique = prisma.pipelineRun.findUnique;
    let failedReads = 0;
    prisma.pipelineRun.findUnique = jest.fn(async (args: any) => {
      if (failedReads < 2) {
        failedReads += 1;
        throw transientDbError();
      }
      return originalFindUnique(args);
    });

    const status = await (service as any).getExchangeHistoricalBackfillRun(run.runId);

    expect(status.runId).toBe(run.runId);
    expect(failedReads).toBe(2);
  });

  it('does not crash historical backfill orchestration on a transient database outage', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-26',
      autoStart: false,
    });
    prisma.pipelineRun.findUnique = jest.fn(async (_args: any) => {
      throw transientDbError();
    });

    await expect((service as any).processExchangeHistoricalBackfillRun(run.runId)).resolves.toBeUndefined();
  });

  it('blocks a historical backfill run when a worker pauses on transient database recovery', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    const importSpy = jest.spyOn(service as any, 'importNseCmOfficialDaily').mockResolvedValue(nseImportSummary('2026-05-26'));

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-26',
      workerCount: 1,
      autoStart: false,
    });
    const originalFindUnique = prisma.pipelineRun.findUnique;
    let runReads = 0;
    prisma.pipelineRun.findUnique = jest.fn(async (args: any) => {
      runReads += 1;
      if (runReads >= 3 && runReads <= 6) {
        throw transientDbError();
      }
      return originalFindUnique(args);
    });

    await (service as any).processExchangeHistoricalBackfillRun(run.runId);

    const status = await (service as any).getExchangeHistoricalBackfillRun(run.runId);
    expect(status.status).toBe('BLOCKED');
    expect(status.pending).toBe(1);
    expect(status.running).toBe(0);
    expect(status.warnings.join(' ')).toContain('database was temporarily unavailable');
    expect(importSpy).not.toHaveBeenCalled();
  });

  it('releases a claimed job when database recovery interrupts date-job completion', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'importNseCmOfficialDaily').mockResolvedValue(nseImportSummary('2026-05-26', {
      rowsInserted: 2,
      rowsNoOp: 0,
    }));

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-26',
      workerCount: 1,
      downloadDelayMs: 0,
      jitterMs: 0,
      autoStart: false,
    });
    const originalUpdateMany = prisma.pipelineStageRun.updateMany;
    prisma.pipelineStageRun.updateMany = jest.fn(async (args: any) => {
      if (args?.where?.status === 'RUNNING' && args?.where?.leaseOwner) {
        throw transientDbError();
      }
      return originalUpdateMany(args);
    });

    await (service as any).processExchangeHistoricalBackfillRun(run.runId);

    const status = await (service as any).getExchangeHistoricalBackfillRun(run.runId);
    expect(status.status).toBe('BLOCKED');
    expect(status.pending).toBe(1);
    expect(status.running).toBe(0);
    expect(status.jobs[0]).toMatchObject({
      status: 'STALE_RETRYABLE',
    });
    expect(status.jobs[0].error).toContain('database was temporarily unavailable');
  });

  it('does not complete a historical job when the worker no longer owns the lease', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-26',
      autoStart: false,
    });
    const stage = {
      ...prisma.stages[0],
      status: 'RUNNING',
      leaseOwner: 'worker-current',
      startedAt: new Date('2026-05-25T03:00:00.000Z'),
      metadata: { ...prisma.stages[0].metadata, jobStatus: 'RUNNING' },
    };
    prisma.stages[0] = stage;

    try {
      await (service as any).completeHistoricalBackfillJob(stage, {
        status: 'COMPLETED',
        jobStatus: 'COMPLETED',
        rowsRead: 1,
        rowsParsed: 1,
        rowsInserted: 1,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: 0,
        bseFills: 0,
        sourceFileImportId: 'source-1',
        warnings: [],
        errors: [],
        startedAt: stage.startedAt,
        leaseOwner: 'worker-stale',
      });

      const status = await (service as any).getExchangeHistoricalBackfillRun(run.runId);
      expect(status.jobs[0]).toMatchObject({ status: 'RUNNING' });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('marks a historical backfill run failed when every attempted date is not available', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'importNseCmOfficialDaily').mockImplementation(async ({ tradingDate }: any) => {
      const key = (service as any).exchangeDateKey(tradingDate);
      return nseImportSummary(key, {
        status: 'FAILED',
        rowsRead: 0,
        rowsParsed: 0,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsNoOp: 0,
        rowsSkipped: 0,
        errors: ['HTTP 404'],
        sourceFileImportId: `failed-${key}`,
      });
    });

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-27',
      downloadDelayMs: 0,
      jitterMs: 0,
      autoStart: false,
    });
    await (service as any).processExchangeHistoricalBackfillRun(run.runId);

    const result = await (service as any).getExchangeHistoricalBackfillRun(run.runId);
    expect(result).toMatchObject({
      status: 'FAILED',
      completed: 0,
      failed: 0,
      notAvailable: 2,
      progressPercent: 100,
    });
  });

  it('pauses historical backfill before claiming new dates when memory crosses the stop threshold', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'currentMemoryUtilizationPercent').mockReturnValue(96);
    jest.spyOn(service as any, 'importNseCmOfficialDaily').mockResolvedValue(nseImportSummary('2026-05-26'));

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-27',
      workerCount: 2,
      autoStart: false,
    });
    await (service as any).processExchangeHistoricalBackfillRun(run.runId);

    const blocked = await (service as any).getExchangeHistoricalBackfillRun(run.runId);
    expect(blocked.status).toBe('BLOCKED');
    expect(blocked.pending).toBe(2);
    expect((service as any).importNseCmOfficialDaily).not.toHaveBeenCalled();
    expect(blocked.warnings.join(' ')).toContain('95% stop threshold');
  });

  it('runs BSE as fill-only enrichment after an NSE backfill date succeeds', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'importNseCmOfficialDaily').mockResolvedValue(nseImportSummary('2026-05-26', {
      rowsInserted: 1,
      rowsNoOp: 0,
    }));
    const bseSpy = jest.spyOn(service as any, 'importBseCmBackupDaily').mockResolvedValue({
      ...nseImportSummary('2026-05-26', {
        source: 'BSE',
        sourceFileImportId: 'bse-source-2026-05-26',
        rowsRead: 1,
        rowsParsed: 1,
        rowsInserted: 1,
        rowsUpdated: 0,
        rowsNoOp: 0,
      }),
      source: 'BSE',
    });

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-26',
      includeBseFill: true,
      downloadDelayMs: 0,
      jitterMs: 0,
      autoStart: false,
    });
    await (service as any).processExchangeHistoricalBackfillRun(run.runId);

    const result = await (service as any).getExchangeHistoricalBackfillRun(run.runId);
    expect(bseSpy).toHaveBeenCalledWith({ tradingDate: new Date('2026-05-26T00:00:00.000Z'), skipLatestPriceUpdate: true });
    expect(result).toMatchObject({
      status: 'COMPLETED',
      completed: 1,
      bseFills: 1,
      rowsInserted: 2,
    });
    expect(result.jobs[0]).toMatchObject({
      source: 'NSE+BSE',
      bseFills: 1,
      sourceFileImportId: 'source-2026-05-26',
    });
  });

  it('cancels pending historical backfill dates without starting new jobs', async () => {
    const prisma = new FakeHistoricalBackfillPrisma();
    const service = new MarketDataFoundationService({
      prisma,
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    } as any, {} as any);
    mockOfficialNseTradingHolidays(service);

    const run = await (service as any).startExchangeHistoricalBackfillRun({
      startDate: '2026-05-26',
      endDate: '2026-05-27',
      autoStart: false,
    });
    const cancelled = await (service as any).cancelExchangeHistoricalBackfillRun(run.runId);

    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.skipped).toBe(2);
    expect(cancelled.jobs.every((job: any) => job.status === 'CANCELLED')).toBe(true);
  });

  it('uses the NSE CM UDiFF import path for scheduled daily IN/STOCK syncs', async () => {
    const repository = {
      latestStoredTradingDateForRegion: jest.fn()
        .mockResolvedValueOnce('2026-05-26')
        .mockResolvedValueOnce('2026-05-27'),
      getSyncState: jest.fn().mockResolvedValue(null),
      upsertSyncState: jest.fn().mockResolvedValue({}),
      upsertSourceFileImport: jest.fn(),
      storeHistoricalBulk: jest.fn(),
      listActiveStockSyncTasks: jest.fn().mockResolvedValue([
        {
          id: 'reliance-id',
          symbol: 'RELIANCE',
          providerSymbol: 'RELIANCE.NS',
          sourceSymbol: 'RELIANCE',
          displaySymbol: 'RELIANCE',
          exchange: 'NSE',
        },
        {
          id: 'tcs-id',
          symbol: 'TCS',
          providerSymbol: 'TCS.NS',
          sourceSymbol: 'TCS',
          displaySymbol: 'TCS',
          exchange: 'NSE',
        },
      ]),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
    } as any);
    const importSpy = jest.spyOn(service, 'importNseCmUdiffDaily').mockResolvedValue({
      status: 'COMPLETED',
      source: 'NSE',
      segment: 'CM',
      tradingDate: '2026-05-27',
      sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
      fileName: 'BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv.zip',
      fileUrl: 'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv.zip',
      sourceFileImportId: 'import-1',
      sourceFingerprint: 'source-fingerprint-1',
      rowsRead: 2,
      rowsParsed: 2,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsNoOp: 1,
      rowsSkipped: 0,
      warningCount: 0,
      warnings: [],
      errors: [],
      changedSymbols: ['RELIANCE'],
      downstreamSymbols: ['RELIANCE', 'TCS'],
    } as any);

    const summary = await service.syncScheduledRegion('IN', {
      assetType: 'STOCK',
      now: new Date('2026-05-27T18:00:00.000Z'),
      skipWeekends: false,
    });

    expect(importSpy).toHaveBeenCalledWith(expect.objectContaining({
      tradingDate: '2026-05-27',
    }));
    expect(repository.listActiveStockSyncTasks).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK' });
    expect(summary).toMatchObject({
      rowsInserted: 1,
      rowsNoOp: 1,
      changedInstrumentIds: ['reliance-id'],
      downstreamInstrumentIds: ['reliance-id', 'tcs-id'],
      changedInstrumentCount: 1,
      dqStageEligible: true,
      sourceFingerprint: 'source-fingerprint-1',
      officialEodBulk: {
        attempted: true,
        sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
        matchedInstruments: 2,
      },
    });
    expect(repository.upsertSyncState).toHaveBeenLastCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      tradingDate: '2026-05-27',
      status: 'SYNCED',
    }));
  });

  it('keeps scheduled IN/STOCK sync warning-only when the expected NSE file is not available and uses latest stored dataThroughDate', async () => {
    const repository = {
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-26'),
      getSyncState: jest.fn().mockResolvedValue(null),
      upsertSyncState: jest.fn().mockResolvedValue({}),
      upsertSourceFileImport: jest.fn(),
      storeHistoricalBulk: jest.fn(),
      listActiveStockSyncTasks: jest.fn().mockResolvedValue([
        {
          id: 'reliance-id',
          symbol: 'RELIANCE',
          providerSymbol: 'RELIANCE.NS',
          sourceSymbol: 'RELIANCE',
          displaySymbol: 'RELIANCE',
          exchange: 'NSE',
        },
      ]),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
    } as any);
    jest.spyOn(service, 'importNseCmUdiffDaily').mockResolvedValue(nseImportSummary('2026-05-27', {
      status: 'NOT_AVAILABLE',
      sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
      fileName: 'BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv.zip',
      fileUrl: 'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv.zip',
      sourceFileImportId: 'nse-unavailable-import-1',
      sourceFingerprint: null,
      rowsRead: 0,
      rowsParsed: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsNoOp: 0,
      rowsSkipped: 0,
      warningCount: 1,
      warnings: ['NSE CM UDiFF file is not available yet (HTTP 404).'],
      errors: [],
      changedSymbols: [],
      downstreamSymbols: [],
    }) as any);

    const summary = await service.syncScheduledRegion('IN', {
      assetType: 'STOCK',
      now: new Date('2026-05-27T18:00:00.000Z'),
      skipWeekends: false,
    });

    expect(summary).toMatchObject({
      tradingDate: '2026-05-27',
      dataThroughDate: '2026-05-26',
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsNoOp: 0,
      changedInstrumentIds: [],
      downstreamInstrumentIds: [],
      changedInstrumentCount: 0,
      dqStageEligible: false,
      warningCount: 2,
      warnings: expect.arrayContaining([
        expect.stringContaining('not available yet'),
        expect.stringContaining('using latest stored dataThroughDate 2026-05-26'),
      ]),
      errors: [],
      officialEodBulk: expect.objectContaining({
        attempted: true,
        targetTradingDate: '2026-05-27',
        sourceFingerprint: null,
        fallbackReason: 'OFFICIAL_EOD_NOT_AVAILABLE',
      }),
    });
    expect(summary.sourceFingerprint).toEqual(expect.stringContaining('scheduled-region:'));
    expect(repository.upsertSyncState).toHaveBeenLastCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'STOCK',
      tradingDate: '2026-05-27',
      status: 'SYNCED',
      summary: expect.objectContaining({
        dataThroughDate: '2026-05-26',
        errors: [],
        warnings: expect.arrayContaining([
          expect.stringContaining('using latest stored dataThroughDate 2026-05-26'),
        ]),
      }),
    }));
  });

  it('uses the NSE all-index import path for scheduled daily IN/INDEX syncs', async () => {
    const repository = {
      latestStoredTradingDateForRegion: jest.fn()
        .mockResolvedValueOnce('2026-05-26')
        .mockResolvedValueOnce('2026-05-27'),
      getSyncState: jest.fn().mockResolvedValue(null),
      upsertSyncState: jest.fn().mockResolvedValue({}),
      upsertSourceFileImport: jest.fn(),
      storeHistoricalBulk: jest.fn(),
      listActiveStockSyncTasks: jest.fn().mockResolvedValue([
        { id: 'nifty50-id', symbol: '^NSEI', sourceSymbol: 'NIFTY 50', displaySymbol: 'NIFTY 50', exchange: 'NSE_INDEX' },
        { id: 'nifty500-id', symbol: 'NSE_INDEX_NIFTY_500', sourceSymbol: 'NIFTY 500', displaySymbol: 'NIFTY 500', exchange: 'NSE_INDEX' },
        { id: 'niftybank-id', symbol: '^NSEBANK', sourceSymbol: 'NIFTY BANK', displaySymbol: 'NIFTY BANK', exchange: 'NSE_INDEX' },
        { id: 'niftyit-id', symbol: '^CNXIT', sourceSymbol: 'NIFTY IT', displaySymbol: 'NIFTY IT', exchange: 'NSE_INDEX' },
      ]),
      updateStockLoadTimestampBySymbols: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE_INDEX' }),
    } as any);
    const indexSpy = jest.spyOn(service as any, 'importNseIndexOfficialDaily').mockResolvedValue(nseIndexImportSummary('2026-05-27', {
      sourceFingerprint: 'index-source-fingerprint-1',
    }));
    const cmSpy = jest.spyOn(service, 'importNseCmUdiffDaily').mockResolvedValue(nseImportSummary('2026-05-27') as any);

    const summary = await service.syncScheduledRegion('IN', {
      assetType: 'INDEX',
      now: new Date('2026-05-27T18:00:00.000Z'),
      skipWeekends: false,
    });

    expect(indexSpy).toHaveBeenCalledWith(expect.objectContaining({
      tradingDate: '2026-05-27',
    }));
    expect(cmSpy).not.toHaveBeenCalled();
    expect(repository.listActiveStockSyncTasks).toHaveBeenCalledWith({ region: 'IN', assetType: 'INDEX' });
    expect(summary).toMatchObject({
      rowsInserted: 3,
      rowsNoOp: 1,
      changedInstrumentIds: ['nifty50-id', 'nifty500-id', 'niftybank-id'],
      downstreamInstrumentIds: ['nifty50-id', 'nifty500-id', 'niftybank-id', 'niftyit-id'],
      changedInstrumentCount: 3,
      dqStageEligible: true,
      sourceFingerprint: 'index-source-fingerprint-1',
      officialEodBulk: {
        attempted: true,
        sourceName: 'NSE_INDEX_EOD',
        sourceFileName: 'ind_close_all_27052026.csv',
        matchedInstruments: 4,
      },
    });
    expect(repository.upsertSyncState).toHaveBeenLastCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'INDEX',
      tradingDate: '2026-05-27',
      status: 'SYNCED',
    }));
  });

  it('keeps downstream work eligible when an exchange-file rerun is all no-op rows', async () => {
    const repository = {
      getSyncState: jest.fn().mockResolvedValue({
        status: 'SYNCED',
        tradingDate: new Date('2026-05-27T00:00:00.000Z'),
        nextEligibleSyncAt: new Date('2026-05-27T18:00:00.000Z'),
      }),
      countStaleCatalogSyncTasks: jest.fn().mockResolvedValue(2),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(new Date('2026-05-27T00:00:00.000Z')),
      upsertSyncState: jest.fn().mockResolvedValue({}),
      upsertSourceFileImport: jest.fn(),
      storeHistoricalBulk: jest.fn(),
      listActiveStockSyncTasks: jest.fn().mockResolvedValue([
        { id: 'reliance-id', symbol: 'RELIANCE', sourceSymbol: 'RELIANCE', displaySymbol: 'RELIANCE', exchange: 'NSE' },
        { id: 'tcs-id', symbol: 'TCS', sourceSymbol: 'TCS', displaySymbol: 'TCS', exchange: 'NSE' },
      ]),
      updateStockLoadTimestampBySymbols: jest.fn().mockResolvedValue(undefined),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
    } as any);
    jest.spyOn(service as any, 'evaluateSyncFreshnessGate').mockResolvedValue({
      shouldSkip: false,
      reason: 'DUE',
      message: 'Sync due',
    });
    jest.spyOn(service, 'importNseCmUdiffDaily').mockResolvedValue({
      status: 'COMPLETED',
      source: 'NSE',
      segment: 'CM',
      tradingDate: '2026-05-27',
      sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
      fileName: 'BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv.zip',
      fileUrl: 'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20260527_F_0000.csv.zip',
      sourceFileImportId: 'import-1',
      sourceFingerprint: 'source-fingerprint-1',
      rowsRead: 2,
      rowsParsed: 2,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsNoOp: 2,
      rowsSkipped: 0,
      warningCount: 0,
      warnings: [],
      errors: [],
      changedSymbols: [],
      downstreamSymbols: ['RELIANCE', 'TCS'],
    } as any);

    const summary = await service.syncScheduledRegion('IN', {
      assetType: 'STOCK',
      now: new Date('2026-05-27T18:00:00.000Z'),
      skipWeekends: false,
    });

    expect(summary).toMatchObject({
      rowsNoOp: 2,
      changedInstrumentIds: [],
      downstreamInstrumentIds: ['reliance-id', 'tcs-id'],
      changedInstrumentCount: 0,
      dqStageEligible: false,
      officialEodBulk: {
        matchedInstruments: 2,
      },
    });
    expect(repository.updateStockLoadTimestampBySymbols).toHaveBeenCalledWith(['RELIANCE', 'TCS']);
  });

  it('imports BSE backup candles only through explicit exchange identity matches and missing NSE candles', async () => {
    const csvText = [
      'TradDt,Sgmt,Src,FinInstrmTp,TckrSymb,SctySrs,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol',
      '2026-05-27,CM,BSE,STK,500325,A,1400,1420,1390,1410,1000',
      '2026-05-27,CM,BSE,STK,999999,A,100,101,99,100.5,200',
    ].join('\n');
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue(null),
      upsertSourceFileImport: jest.fn()
        .mockResolvedValueOnce({ id: 'bse-import-1', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'bse-import-1', status: 'COMPLETED' }),
      findExchangeIdentitiesForExchangeSymbols: jest.fn().mockResolvedValue([
        { exchangeSymbol: '500325', securityCode: '500325', stock: { id: 'stock-1', symbol: 'RELIANCE' } },
      ]),
      filterPricesMissingPrimaryExchangeCandles: jest.fn().mockImplementation(async (prices: any[]) => prices),
      storeHistoricalBulk: jest.fn().mockResolvedValue({
        rowsReceived: 1,
        rowsInserted: 1,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
        summaryBySymbol: new Map([
          ['RELIANCE', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
        ]),
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'BSE' }),
    } as any);

    const result = await (service as any).importBseCmBackupDaily({
      tradingDate: '2026-05-27',
      csvText,
      fileName: 'BhavCopy_BSE_CM_0_0_0_20260527_F_0000.csv',
      fileUrl: 'local-bse-fixture.csv',
    });

    expect(repository.findExchangeIdentitiesForExchangeSymbols).toHaveBeenCalledWith('BSE', ['500325', '999999']);
    expect(repository.filterPricesMissingPrimaryExchangeCandles).toHaveBeenCalledWith([
      expect.objectContaining({
        symbol: 'RELIANCE',
        source: 'BSE_UDIFF_CM_BHAVCOPY',
      }),
    ], 'NSE');
    expect(repository.storeHistoricalBulk).toHaveBeenCalledWith(
      [expect.objectContaining({ symbol: 'RELIANCE', source: 'BSE_UDIFF_CM_BHAVCOPY' })],
      expect.any(Function),
      expect.any(Map),
      { sourceFileImportId: 'bse-import-1' }
    );
    expect(result).toMatchObject({
      status: 'COMPLETED',
      source: 'BSE',
      rowsParsed: 2,
      rowsInserted: 1,
      rowsSkipped: 1,
      changedSymbols: ['RELIANCE'],
    });
  });

  it('does not store BSE backup candles when an NSE primary candle already exists', async () => {
    const csvText = [
      'TradDt,Sgmt,Src,FinInstrmTp,TckrSymb,SctySrs,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol',
      '2026-05-27,CM,BSE,STK,500325,A,1400,1420,1390,1410,1000',
    ].join('\n');
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue(null),
      upsertSourceFileImport: jest.fn()
        .mockResolvedValueOnce({ id: 'bse-import-1', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'bse-import-1', status: 'COMPLETED' }),
      findExchangeIdentitiesForExchangeSymbols: jest.fn().mockResolvedValue([
        { exchangeSymbol: '500325', securityCode: '500325', stock: { id: 'stock-1', symbol: 'RELIANCE' } },
      ]),
      filterPricesMissingPrimaryExchangeCandles: jest.fn().mockResolvedValue([]),
      storeHistoricalBulk: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'BSE' }),
    } as any);

    const result = await (service as any).importBseCmBackupDaily({
      tradingDate: '2026-05-27',
      csvText,
      fileName: 'BhavCopy_BSE_CM_0_0_0_20260527_F_0000.csv',
      fileUrl: 'local-bse-fixture.csv',
    });

    expect(repository.storeHistoricalBulk).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'COMPLETED',
      rowsInserted: 0,
      rowsSkipped: 1,
      changedSymbols: [],
      downstreamSymbols: [],
    });
  });

  it('imports BSE backup candles by exact persisted stock symbol when no BSE identity exists', async () => {
    const csvText = [
      'TradDt,Sgmt,Src,FinInstrmTp,TckrSymb,SctySrs,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol',
      '2026-05-27,CM,BSE,STK,RELIANCE,A,1400,1420,1390,1410,1000',
      '2026-05-27,CM,BSE,STK,UNMATCHED,A,100,101,99,100.5,200',
    ].join('\n');
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue(null),
      upsertSourceFileImport: jest.fn()
        .mockResolvedValueOnce({ id: 'bse-import-symbol-1', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'bse-import-symbol-1', status: 'COMPLETED' }),
      findExchangeIdentitiesForExchangeSymbols: jest.fn().mockResolvedValue([]),
      findStocksBySymbolsInScope: jest.fn().mockResolvedValue([
        { id: 'stock-reliance', symbol: 'RELIANCE', sourceSymbol: 'RELIANCE', displaySymbol: 'RELIANCE' },
      ]),
      filterPricesMissingPrimaryExchangeCandles: jest.fn().mockImplementation(async (prices: any[]) => prices),
      storeHistoricalBulk: jest.fn().mockResolvedValue({
        rowsReceived: 1,
        rowsInserted: 1,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
        summaryBySymbol: new Map([
          ['RELIANCE', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
        ]),
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'BSE' }),
    } as any);

    const result = await (service as any).importBseCmBackupDaily({
      tradingDate: '2026-05-27',
      csvText,
      fileName: 'BhavCopy_BSE_CM_0_0_0_20260527_F_0000.csv',
      fileUrl: 'local-bse-symbol-fixture.csv',
    });

    expect(repository.findExchangeIdentitiesForExchangeSymbols).toHaveBeenCalledWith('BSE', ['RELIANCE', 'UNMATCHED']);
    expect(repository.findStocksBySymbolsInScope).toHaveBeenCalledWith(['RELIANCE', 'UNMATCHED'], { region: 'IN', assetType: 'STOCK' });
    expect(repository.storeHistoricalBulk).toHaveBeenCalledWith(
      [expect.objectContaining({ symbol: 'RELIANCE', source: 'BSE_UDIFF_CM_BHAVCOPY' })],
      expect.any(Function),
      expect.any(Map),
      { sourceFileImportId: 'bse-import-symbol-1' }
    );
    expect(result).toMatchObject({
      status: 'COMPLETED',
      rowsInserted: 1,
      rowsSkipped: 1,
      changedSymbols: ['RELIANCE'],
    });
  });

  it('imports NSE index and sector-index EOD rows into persisted index candles', async () => {
    const csvText = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value',
      'NIFTY 50,27-May-2026,23000,23100,22900,23050',
      'NIFTY IT,27-May-2026,35000,35200,34800,35150',
    ].join('\n');
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue(null),
      upsertSourceFileImport: jest.fn()
        .mockResolvedValueOnce({ id: 'index-import-1', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'index-import-1', status: 'COMPLETED' }),
      findIndexStocksBySourceSymbols: jest.fn().mockResolvedValue([
        { id: 'idx-1', symbol: '^NSEI', sourceSymbol: 'NIFTY 50', displaySymbol: 'NIFTY 50', name: 'NIFTY 50' },
        { id: 'idx-2', symbol: '^CNXIT', sourceSymbol: 'NIFTY IT', displaySymbol: 'NIFTY IT', name: 'NIFTY IT' },
      ]),
      storeHistoricalBulk: jest.fn().mockResolvedValue({
        rowsReceived: 2,
        rowsInserted: 2,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
        summaryBySymbol: new Map([
          ['^NSEI', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
          ['^CNXIT', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
        ]),
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE_INDEX' }),
    } as any);

    const result = await (service as any).importNseIndexEodDaily({
      tradingDate: '2026-05-27',
      csvText,
      fileName: 'ind_close_all_27052026.csv',
      fileUrl: 'local-index-fixture.csv',
      segment: 'SECTOR_INDEX',
    });

    expect(repository.findIndexStocksBySourceSymbols).toHaveBeenCalledWith(['NIFTY 50', 'NIFTY IT']);
    expect(repository.storeHistoricalBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({ symbol: '^NSEI', source: 'NSE_INDEX_EOD', close: 23050 }),
        expect.objectContaining({ symbol: '^CNXIT', source: 'NIFTY_SECTOR_INDEX', close: 35150 }),
      ],
      expect.any(Function),
      expect.any(Map),
      { sourceFileImportId: 'index-import-1' }
    );
    expect(result).toMatchObject({
      status: 'COMPLETED',
      source: 'NSE',
      segment: 'SECTOR_INDEX',
      rowsParsed: 2,
      rowsInserted: 2,
      changedSymbols: ['^CNXIT', '^NSEI'],
    });
  });

  it('loads the official NSE all-index EOD file and imports broad plus sector index history', async () => {
    const csvText = [
      'Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value',
      'NIFTY 50,27-May-2026,23000,23100,22900,23050',
      'NIFTY 500,27-May-2026,21000,21100,20900,21050',
      'NIFTY BANK,27-May-2026,49000,49200,48800,49150',
      'NIFTY IT,27-May-2026,35000,35200,34800,35150',
      'NIFTY ENERGY,27-May-2026,36000,36200,35800,36150',
    ].join('\n');
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue(null),
      upsertSourceFileImport: jest.fn()
        .mockResolvedValueOnce({ id: 'index-import-1', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'index-import-1', status: 'COMPLETED' }),
      findIndexStocksBySourceSymbols: jest.fn().mockResolvedValue([
        { id: 'idx-1', symbol: '^NSEI', sourceSymbol: 'NIFTY 50', displaySymbol: 'NIFTY 50', name: 'NIFTY 50' },
        { id: 'idx-2', symbol: 'NSE_INDEX_NIFTY_500', sourceSymbol: 'NIFTY 500', displaySymbol: 'NIFTY 500', name: 'NIFTY 500' },
        { id: 'idx-3', symbol: '^NSEBANK', sourceSymbol: 'NIFTY BANK', displaySymbol: 'NIFTY BANK', name: 'NIFTY BANK' },
        { id: 'idx-4', symbol: '^CNXIT', sourceSymbol: 'NIFTY IT', displaySymbol: 'NIFTY IT', name: 'NIFTY IT' },
        { id: 'idx-5', symbol: '^CNXENERGY', sourceSymbol: 'NIFTY ENERGY', displaySymbol: 'NIFTY ENERGY', name: 'NIFTY ENERGY' },
      ]),
      storeHistoricalBulk: jest.fn().mockResolvedValue({
        rowsReceived: 5,
        rowsInserted: 5,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
        summaryBySymbol: new Map([
          ['^NSEI', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
          ['NSE_INDEX_NIFTY_500', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
          ['^NSEBANK', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
          ['^CNXIT', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
          ['^CNXENERGY', { rowsReceived: 1, rowsInserted: 1, rowsUpdated: 0, rowsSkipped: 0, rowsNoOp: 0, warningCount: 0, warnings: [] }],
        ]),
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE_INDEX' }),
    } as any);
    const downloadSpy = jest.spyOn(service as any, 'downloadOfficialExchangeText').mockResolvedValue(csvText);

    const result = await (service as any).importNseIndexOfficialDaily({
      tradingDate: '2026-05-27',
    });

    expect(downloadSpy).toHaveBeenCalledWith('https://archives.nseindia.com/content/indices/ind_close_all_27052026.csv');
    expect(repository.findIndexStocksBySourceSymbols).toHaveBeenCalledWith(['NIFTY 50', 'NIFTY 500', 'NIFTY BANK', 'NIFTY IT', 'NIFTY ENERGY']);
    expect(repository.storeHistoricalBulk).toHaveBeenCalledWith(
      [
        expect.objectContaining({ symbol: '^NSEI', source: 'NSE_INDEX_EOD', close: 23050 }),
        expect.objectContaining({ symbol: 'NSE_INDEX_NIFTY_500', source: 'NSE_INDEX_EOD', close: 21050 }),
        expect.objectContaining({ symbol: '^NSEBANK', source: 'NIFTY_SECTOR_INDEX', close: 49150 }),
        expect.objectContaining({ symbol: '^CNXIT', source: 'NIFTY_SECTOR_INDEX', close: 35150 }),
        expect.objectContaining({ symbol: '^CNXENERGY', source: 'NIFTY_SECTOR_INDEX', close: 36150 }),
      ],
      expect.any(Function),
      expect.any(Map),
      { sourceFileImportId: 'index-import-1' }
    );
    expect(repository.upsertSourceFileImport).toHaveBeenCalledWith(expect.objectContaining({
      source: 'NSE',
      segment: 'SECTOR_INDEX',
      tradingDate: new Date('2026-05-27T00:00:00.000Z'),
      fileName: 'ind_close_all_27052026.csv',
      status: 'COMPLETED',
      rowsRaw: 3,
      rowsAccepted: 3,
      rowsRejected: 0,
      parserVersion: 'nse-index-eod-v1',
    }));
    expect(result).toMatchObject({
      status: 'COMPLETED',
      source: 'NSE',
      segment: 'INDEX',
      sourceName: 'NSE_INDEX_EOD',
      fileName: 'ind_close_all_27052026.csv',
      rowsParsed: 5,
      rowsInserted: 5,
      changedSymbols: ['^CNXENERGY', '^CNXIT', '^NSEBANK', '^NSEI', 'NSE_INDEX_NIFTY_500'],
    });
  });

  it('imports NSE F&O UDiFF enrichment through the source-file ledger without creating futures rows', async () => {
    const rows: any[] = [];
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue(null),
      upsertSourceFileImport: jest.fn()
        .mockResolvedValueOnce({ id: 'fo-import-1', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'fo-import-1', status: 'COMPLETED' }),
      upsertCatalogInstrument: jest.fn().mockImplementation((row) => {
        rows.push(row);
        return Promise.resolve({ action: 'updated', stock: {} });
      }),
    };
    const provider = { validateProviderSymbol: jest.fn() };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await (service as any).importNseFoUdiffDaily({
      tradingDate: '2026-05-27',
      csvText: 'SYMBOL\nRELIANCE\nNIFTY 50\n',
      fileName: 'fo-udiff.csv',
      fileUrl: 'local-fo.csv',
    });

    expect(result).toMatchObject({
      status: 'COMPLETED',
      source: 'NSE',
      segment: 'FO',
      tradingDate: '2026-05-27',
      rowsRead: 2,
      rowsParsed: 2,
      rowsUpdated: 2,
      sourceFileImportId: 'fo-import-1',
    });
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: 'RELIANCE',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        derivativesEligible: true,
      }),
      expect.objectContaining({
        symbol: '^NSEI',
        assetType: 'INDEX',
        instrumentSegment: 'INDEX',
        derivativesEligible: true,
      }),
    ]));
    expect(rows.some((row) => row.assetType === 'FUTURE' || row.instrumentSegment === 'FUTURES')).toBe(false);
    expect(provider.validateProviderSymbol).not.toHaveBeenCalled();
    expect(repository.upsertSourceFileImport).toHaveBeenNthCalledWith(1, expect.objectContaining({
      source: 'NSE',
      segment: 'FO',
      status: 'PENDING',
      rowsRaw: 2,
    }));
    expect(repository.upsertSourceFileImport).toHaveBeenNthCalledWith(2, expect.objectContaining({
      status: 'COMPLETED',
      rowsAccepted: 2,
    }));
  });

  it('skips duplicate completed NSE F&O enrichment imports by source file hash', async () => {
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue({ id: 'fo-import-1', status: 'COMPLETED' }),
      upsertSourceFileImport: jest.fn(),
      upsertCatalogInstrument: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await (service as any).importNseFoUdiffDaily({
      tradingDate: '2026-05-27',
      csvText: 'SYMBOL\nRELIANCE\n',
      fileName: 'fo-udiff.csv',
    });

    expect(result).toMatchObject({
      status: 'SKIPPED_DUPLICATE',
      sourceFileImportId: 'fo-import-1',
      rowsParsed: 1,
    });
    expect(repository.upsertSourceFileImport).not.toHaveBeenCalled();
    expect(repository.upsertCatalogInstrument).not.toHaveBeenCalled();
  });

  it('imports NSE delivery data as persisted stock delivery evidence with source-file provenance', async () => {
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue(null),
      upsertSourceFileImport: jest.fn()
        .mockResolvedValueOnce({ id: 'delivery-import-1', status: 'PENDING' })
        .mockResolvedValueOnce({ id: 'delivery-import-1', status: 'COMPLETED' }),
      findStocksBySymbolsInScope: jest.fn().mockResolvedValue([
        { id: 'stock-1', symbol: 'RELIANCE' },
      ]),
      upsertDeliverySnapshots: jest.fn().mockResolvedValue({ insertedOrUpdated: 1 }),
    };
    const provider = { fetchHistorical: jest.fn() };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await (service as any).importNseDeliveryDaily({
      tradingDate: '2026-05-27',
      csvText: [
        'SYMBOL,SERIES,DATE1,TTL_TRD_QNTY,DELIV_QTY,DELIV_PER',
        'RELIANCE,EQ,27-May-2026,1000,650,65.00',
        'NO_MATCH,EQ,27-May-2026,500,100,20.00',
      ].join('\n'),
      fileName: 'sec_bhavdata_full_27052026.csv',
      fileUrl: 'local-delivery.csv',
    });

    expect(result).toMatchObject({
      status: 'COMPLETED',
      source: 'NSE',
      segment: 'DELIVERY',
      tradingDate: '2026-05-27',
      rowsRead: 2,
      rowsParsed: 2,
      rowsInserted: 1,
      rowsSkipped: 1,
      sourceFileImportId: 'delivery-import-1',
    });
    expect(repository.findStocksBySymbolsInScope).toHaveBeenCalledWith(['RELIANCE', 'NO_MATCH'], { region: 'IN', assetType: 'STOCK' });
    expect(repository.upsertDeliverySnapshots).toHaveBeenCalledWith([
      expect.objectContaining({
        stockId: 'stock-1',
        symbol: 'RELIANCE',
        exchange: 'NSE',
        tradedQuantity: 1000,
        deliverableQuantity: 650,
        deliveryPercent: 65,
        source: 'NSE_DELIVERY',
        sourceFileImportId: 'delivery-import-1',
      }),
    ]);
    expect(provider.fetchHistorical).not.toHaveBeenCalled();
  });

  it('skips duplicate NSE delivery files using SourceFileImport before rewriting snapshots', async () => {
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue({ id: 'delivery-import-1', status: 'COMPLETED' }),
      upsertSourceFileImport: jest.fn(),
      findStocksBySymbolsInScope: jest.fn(),
      upsertDeliverySnapshots: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await (service as any).importNseDeliveryDaily({
      tradingDate: '2026-05-27',
      csvText: [
        'SYMBOL,SERIES,DATE1,TTL_TRD_QNTY,DELIV_QTY,DELIV_PER',
        'RELIANCE,EQ,27-May-2026,1000,650,65.00',
      ].join('\n'),
      fileName: 'sec_bhavdata_full_27052026.csv',
      fileUrl: 'local-delivery.csv',
    });

    expect(result).toMatchObject({
      status: 'SKIPPED_DUPLICATE',
      sourceFileImportId: 'delivery-import-1',
      rowsInserted: 0,
    });
    expect(repository.upsertSourceFileImport).not.toHaveBeenCalled();
    expect(repository.upsertDeliverySnapshots).not.toHaveBeenCalled();
  });

  it('refreshes NSE delivery for an official completed trading date without provider calls', async () => {
    const repository = {};
    const provider = { fetchHistorical: jest.fn() };
    const service = new MarketDataFoundationService(repository as any, provider as any);
    const officialSpy = jest.spyOn(service as any, 'importNseDeliveryOfficialDaily').mockResolvedValue(nseDeliveryImportSummary('2026-05-27'));

    const result = await (service as any).refreshNseDeliveryDaily({
      tradingDate: '2026-05-27',
    });

    expect(officialSpy).toHaveBeenCalledWith({
      tradingDate: new Date('2026-05-27T00:00:00.000Z'),
      force: false,
    });
    expect(result).toMatchObject({
      status: 'COMPLETED',
      segment: 'DELIVERY',
      sourceFileImportId: 'delivery-source-2026-05-27',
    });
    expect(provider.fetchHistorical).not.toHaveBeenCalled();
  });

  it('backfills NSE delivery history by date and skips already imported delivery dates', async () => {
    const completedDates = new Set(['2026-05-27']);
    const repository = {
      listCompletedSourceFileImportDates: jest.fn(async ({ startDate, endDate }: any) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        return [...completedDates]
          .map((date) => new Date(`${date}T00:00:00.000Z`))
          .filter((date) => date.getTime() >= start && date.getTime() <= end);
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'importNseDeliveryOfficialDaily').mockImplementation(async ({ tradingDate }: any) => {
      const key = (service as any).exchangeDateKey(tradingDate);
      return nseDeliveryImportSummary(key, {
        rowsInserted: key === '2026-05-26' ? 2 : 1,
        changedSymbols: [`${key}-A`, `${key}-B`],
        downstreamSymbols: [`${key}-A`, `${key}-B`],
      });
    });

    const result = await (service as any).runNseDeliveryHistoricalBackfill({
      startDate: '2026-05-26',
      endDate: '2026-05-28',
      batchSize: 10,
      downloadDelayMs: 0,
      jitterMs: 0,
    });

    const importedDates = (service as any).importNseDeliveryOfficialDaily.mock.calls
      .map(([input]: any[]) => (service as any).exchangeDateKey(input.tradingDate));
    expect(importedDates).toEqual(['2026-05-26', '2026-05-28']);
    expect(result).toMatchObject({
      status: 'COMPLETED',
      totalDates: 3,
      processedCount: 3,
      completed: 2,
      skippedDuplicates: 1,
      failed: 0,
      hasMore: false,
      rowsInserted: 3,
      sourceFileImportIds: ['delivery-source-2026-05-26', 'delivery-source-2026-05-28'],
    });
    expect(result.dates.map((date: any) => date.status)).toEqual([
      'COMPLETED',
      'SKIPPED_DUPLICATE',
      'COMPLETED',
    ]);
  });

  it('defaults delivery history recovery to a 90-session target with bounded incremental batches', async () => {
    const repository = {
      listCompletedSourceFileImportDates: jest.fn().mockResolvedValue([]),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    mockOfficialNseTradingHolidays(service);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'importNseDeliveryOfficialDaily').mockImplementation(async ({ tradingDate }: any) => {
      const key = (service as any).exchangeDateKey(tradingDate);
      return nseDeliveryImportSummary(key, {
        changedSymbols: [key],
        downstreamSymbols: [key],
      });
    });

    const result = await (service as any).runNseDeliveryHistoricalBackfill({
      endDate: '2026-05-29',
      downloadDelayMs: 0,
      jitterMs: 0,
    });

    expect(result).toMatchObject({
      status: 'COMPLETED',
      targetSessions: 90,
      totalDates: 90,
      processedCount: 25,
      batchSize: 25,
      offset: 0,
      nextOffset: 25,
      hasMore: true,
      completed: 25,
      symbolsCovered: 25,
    });
    expect((service as any).importNseDeliveryOfficialDaily).toHaveBeenCalledTimes(25);
  });

  it('imports manual verified fundamentals without provider or Screener scraping', async () => {
    const repository = {
      findStockByIdInScope: jest.fn().mockResolvedValue({ id: 'stock-1', symbol: 'RELIANCE' }),
      upsertManualVerifiedFundamental: jest.fn().mockResolvedValue({ id: 'fundamental-1' }),
    };
    const provider = {
      fetchCoreFundamentals: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await (service as any).importManualVerifiedFundamental({
      stockId: 'stock-1',
      region: 'IN',
      assetType: 'STOCK',
      periodType: 'ANNUAL',
      periodEndDate: '2026-03-31',
      revenue: 100,
      eps: 12.5,
      netIncome: 20,
      peRatio: 25,
      marketCap: 1000,
      sourceNote: 'Validated manually from NSE/BSE filing. Screener used only for manual cross-check.',
      sourceUrl: 'https://www.bseindia.com/corporates/ann.html',
      validatedBy: 'Nrusingha',
      validatedAt: '2026-05-31T12:00:00.000Z',
    });

    expect(repository.findStockByIdInScope).toHaveBeenCalledWith('stock-1', { region: 'IN', assetType: 'STOCK' });
    expect(repository.upsertManualVerifiedFundamental).toHaveBeenCalledWith('stock-1', expect.objectContaining({
      periodType: 'ANNUAL',
      periodEndDate: new Date('2026-03-31T00:00:00.000Z'),
      sourceNote: 'Validated manually from NSE/BSE filing. Screener used only for manual cross-check.',
      validatedBy: 'Nrusingha',
    }));
    expect(provider.fetchCoreFundamentals).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'IMPORTED',
      stockId: 'stock-1',
      symbol: 'RELIANCE',
      source: 'MANUAL_VERIFIED',
    });
  });

  it('bulk imports manual verified quarterly and annual fundamentals with coverage evidence', async () => {
    const upsertSourceFileImport = jest.fn()
      .mockResolvedValueOnce({ id: 'source-import-1', status: 'PENDING' })
      .mockResolvedValueOnce({
        id: 'source-import-1',
        source: 'MANUAL_VERIFIED',
        segment: 'FUNDAMENTALS',
        status: 'COMPLETED',
      });
    const repository = {
      findStocksBySymbolsInScope: jest.fn().mockResolvedValue([
        { id: 'stock-1', symbol: 'RELIANCE', sourceSymbol: 'RELIANCE', displaySymbol: 'RELIANCE' },
        { id: 'stock-2', symbol: 'TCS', sourceSymbol: 'TCS', displaySymbol: 'TCS' },
      ]),
      upsertManualVerifiedFundamental: jest.fn()
        .mockResolvedValueOnce({ id: 'fundamental-1' })
        .mockResolvedValueOnce({ id: 'fundamental-2' })
        .mockResolvedValueOnce({ id: 'fundamental-3' }),
      upsertSourceFileImport,
    };
    const provider = {
      fetchCoreFundamentals: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);
    const csvText = [
      'symbol,period_type,period_end_date,revenue,net_income,eps,source,validated_by,validated_at,source_url',
      'RELIANCE,QUARTERLY,2025-12-31,1000,120,12.5,MANUAL_VERIFIED,Nrusingha,2026-06-01T10:00:00.000Z,https://www.nseindia.com',
      'RELIANCE,ANNUAL,2026-03-31,4200,500,52,MANUAL_VERIFIED,Nrusingha,2026-06-01T10:00:00.000Z,https://www.bseindia.com',
      'TCS,QUARTERLY,2025-12-31,2000,350,22.1,MANUAL_VERIFIED,Nrusingha,2026-06-01T10:00:00.000Z,https://www.nseindia.com',
      'UNKNOWN,ANNUAL,2026-03-31,100,10,1,MANUAL_VERIFIED,Nrusingha,2026-06-01T10:00:00.000Z,https://www.nseindia.com',
    ].join('\n');

    const result = await (service as any).importBulkManualVerifiedFundamentals({
      fileName: 'review-universe-fundamentals.csv',
      csvText,
      region: 'IN',
      assetType: 'STOCK',
    });

    expect(repository.findStocksBySymbolsInScope).toHaveBeenCalledWith(['RELIANCE', 'TCS', 'UNKNOWN'], {
      region: 'IN',
      assetType: 'STOCK',
    });
    expect(repository.upsertManualVerifiedFundamental).toHaveBeenCalledTimes(3);
    expect(repository.upsertManualVerifiedFundamental).toHaveBeenNthCalledWith(1, 'stock-1', expect.objectContaining({
      periodType: 'QUARTERLY',
      periodEndDate: new Date('2025-12-31T00:00:00.000Z'),
      revenue: 1000,
      netIncome: 120,
      eps: 12.5,
      sourceUrl: 'https://www.nseindia.com',
      validatedBy: 'Nrusingha',
      validatedAt: new Date('2026-06-01T10:00:00.000Z'),
    }));
    expect(upsertSourceFileImport).toHaveBeenNthCalledWith(1, expect.objectContaining({
      source: 'MANUAL_VERIFIED',
      segment: 'FUNDAMENTALS',
      fileName: 'review-universe-fundamentals.csv',
      status: 'PENDING',
      rowsRaw: 4,
      rowsAccepted: 0,
      rowsRejected: 0,
      parserVersion: 'manual-verified-fundamentals-csv-v1',
    }));
    expect(upsertSourceFileImport).toHaveBeenNthCalledWith(2, expect.objectContaining({
      source: 'MANUAL_VERIFIED',
      segment: 'FUNDAMENTALS',
      fileName: 'review-universe-fundamentals.csv',
      status: 'COMPLETED',
      rowsRaw: 4,
      rowsAccepted: 3,
      rowsRejected: 1,
      parserVersion: 'manual-verified-fundamentals-csv-v1',
    }));
    expect(provider.fetchCoreFundamentals).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'COMPLETED',
      source: 'MANUAL_VERIFIED',
      rowsRead: 4,
      rowsImported: 3,
      rowsRejected: 1,
      symbolsCovered: 2,
      quarterlyCoverage: {
        rowsImported: 2,
        symbolsCovered: 2,
      },
      annualCoverage: {
        rowsImported: 1,
        symbolsCovered: 1,
      },
      sourceFileImport: {
        id: 'source-import-1',
        source: 'MANUAL_VERIFIED',
        segment: 'FUNDAMENTALS',
        status: 'COMPLETED',
      },
    });
    expect(result.sampleRecords).toHaveLength(3);
    expect(result.rejectedRows).toEqual([
      expect.objectContaining({
        rowNumber: 5,
        symbol: 'UNKNOWN',
        reason: 'Instrument not found in scoped review universe.',
      }),
    ]);
  });

  it('returns health metadata', async () => {
    const service = new MarketDataFoundationService({
      instrumentCount: jest.fn().mockResolvedValue(2),
      latestDataTimestamp: jest.fn().mockResolvedValue(new Date('2026-01-02T00:00:00.000Z')),
    } as any, {} as any);

    await expect(service.health()).resolves.toMatchObject({
      status: 'ok',
      instrumentCount: 2,
      latestDataTimestamp: '2026-01-02T00:00:00.000Z',
      data_status: 'COMPLETE',
    });
  });

  it('returns empty movers with not-yet-computed warning when no snapshot exists', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new MarketDataFoundationService({
      prisma: { marketScanSnapshot: { findFirst, findMany: jest.fn().mockResolvedValue([]) } },
    } as any, {} as any);

    const result = await service.marketMovers({ region: 'IN', assetType: 'STOCK', range: '1D', limit: 5 });

    expect(result.ranges[0].gainers).toEqual([]);
    expect(result.ranges[0].losers).toEqual([]);
    expect(result.ranges[0].warnings[0]).toMatch(/MARKET_SCAN_REFRESH/);
  });

  it('builds market-map tiles from persisted snapshot rows', async () => {
    const snapshotRows = [
      {
        instrumentId: 'stock-1',
        symbol: 'ALPHA',
        companyName: 'Alpha Ltd',
        sector: 'Financial Services',
        latestDate: '2026-05-27T00:00:00.000Z',
        latestClose: 120,
        baseDate: '2026-05-26T00:00:00.000Z',
        baseClose: 115,
        returnPercent: 0.043,
        priceBasis: 'ADJUSTED_CLOSE',
      },
      {
        instrumentId: 'stock-2',
        symbol: 'BETA',
        companyName: 'Beta Ltd',
        sector: 'Utilities',
        latestDate: '2026-05-27T00:00:00.000Z',
        latestClose: 85,
        baseDate: '2026-05-26T00:00:00.000Z',
        baseClose: 88,
        returnPercent: -0.034,
        priceBasis: 'ADJUSTED_CLOSE',
      },
    ];
    const tradingDate = new Date('2026-05-27T00:00:00.000Z');
    const findFirst = jest.fn().mockResolvedValue({ tradingDate });
    const findMany = jest.fn().mockResolvedValue(snapshotRows.map((r) => ({ payloadJson: r })));
    const repository = {
      prisma: { marketScanSnapshot: { findFirst, findMany } },
      listInstruments: jest.fn(),
      listStocksForUniverseHealth: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await (service as any).marketMap({ region: 'IN', assetType: 'STOCK', range: '1D', limit: 60 });

    expect(result).toMatchObject({
      status: 'ready',
      scope: { region: 'IN', assetType: 'STOCK' },
      range: '1D',
      materialized: false,
      sourceLabels: {
        catalog: 'Market Data Foundation stock catalog',
        prices: 'Stored daily price history',
      },
    });
    expect(result.tiles).toEqual([
      expect.objectContaining({
        instrumentId: 'stock-1',
        symbol: 'ALPHA',
        displaySymbol: 'ALPHA',
        companyName: 'Alpha Ltd',
        sector: 'Financial Services',
        returnPercent: 0.043,
        dataStatus: 'COMPLETE',
      }),
      expect.objectContaining({
        instrumentId: 'stock-2',
        symbol: 'BETA',
        sector: 'Utilities',
        returnPercent: -0.034,
      }),
    ]);
    expect(result.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'Financial Services', label: 'Financial Services', tileCount: 1, avgReturnPercent: 0.043 }),
      expect.objectContaining({ key: 'Utilities', label: 'Utilities', tileCount: 1, avgReturnPercent: -0.034 }),
    ]));
    expect(repository.listInstruments).not.toHaveBeenCalled();
    expect(repository.listStocksForUniverseHealth).not.toHaveBeenCalled();
  });

  it('returns an honest missing market-map envelope when no snapshot exists', async () => {
    const repository = {
      prisma: { marketScanSnapshot: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) } },
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await (service as any).marketMap({ region: 'IN', assetType: 'STOCK', range: '1M', limit: 60 });

    expect(result).toMatchObject({
      status: 'missing',
      scope: { region: 'IN', assetType: 'STOCK' },
      range: '1M',
      asOf: null,
      materialized: false,
      tiles: [],
      groups: [],
    });
    expect(result.warnings[0]).toMatch(/MARKET_SCAN_REFRESH/);
  });

  it('keeps price fallback-blocked rows out of universe-health automatic backfill counts', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-blocked',
          symbol: 'BLOCKED',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'BLOCKED.NS',
          sector: 'Tech',
          industry: 'Software',
          marketCap: 100000000,
          country: 'India',
          currency: 'INR',
          isin: 'INE000A01000',
          ipoDate: new Date('2020-01-01T00:00:00.000Z'),
          assetType: 'STOCK',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['BLOCKED.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listBlockedPriceBackfillStockIds: jest.fn().mockResolvedValue(['stock-blocked']),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.universeHealth({ region: 'IN', assetType: 'STOCK' });

    expect(result.counts.supportedPriceBackfillNeeded).toBe(0);
    expect(result.counts.historyCoverageFallbackRequired).toBe(1);
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'PRICE_BACKFILL_FALLBACK_REQUIRED',
        nextAction: null,
      }),
    ]));
    expect(result.universeSignoff.blockers).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PRICE_BACKFILL_REMAINING' }),
    ]));
  });

  it('keeps retry-cooling price rows out of universe-health fallback counts', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-rate',
          symbol: 'RATE',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'RATE.NS',
          sector: 'Tech',
          industry: 'Software',
          marketCap: 100000000,
          country: 'India',
          currency: 'INR',
          isin: 'INE000A01000',
          ipoDate: new Date('2020-01-01T00:00:00.000Z'),
          assetType: 'STOCK',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['RATE.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listRepairStatesForStocks: jest.fn().mockResolvedValue(new Map([
        ['stock-rate', [{ repairType: 'PRICE_BACKFILL', status: 'FAILED_RETRYABLE', nextRetryAt: new Date(Date.now() + 60 * 60 * 1000) }]],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.universeHealth({ region: 'IN', assetType: 'STOCK' });

    expect(result.counts.supportedPriceBackfillNeeded).toBe(0);
    expect(result.counts.historyCoverageFallbackRequired).toBe(0);
    expect(result.universeSignoff.blockers).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PRICE_BACKFILL_FALLBACK_REQUIRED' }),
      expect.objectContaining({ code: 'PRICE_BACKFILL_REMAINING' }),
    ]));
  });

  it('reuses one universe snapshot across review readiness summary computations', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-aaa',
          symbol: 'AAA',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'AAA.NS',
          sector: 'Tech',
          industry: 'Software',
          marketCap: 100000000,
          country: 'India',
          currency: 'INR',
          isin: 'INE000A01001',
          ipoDate: new Date('2020-01-01T00:00:00.000Z'),
          assetType: 'STOCK',
          exchange: 'NSE',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['AAA.NS', {
          priceHistoryBars: 400,
          firstPriceDate: '2020-01-01',
          latestPriceDate: latestCompletedTradingDateForRegion('IN'),
          latestVolume: 1000,
          latestAdjustedClose: 100,
          latestClose: 100,
          rollingWindowBars: 252,
          rollingWindowCoveragePercent: 100,
          recentVolumeCoveragePercent: 100,
          adjustedCloseCoveragePercent: 100,
          maxPriceGapDays: 0,
        }],
      ])),
      listBlockedPriceBackfillStockIds: jest.fn().mockResolvedValue([]),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.reviewReadinessSummary({ region: 'IN', assetType: 'STOCK' });
    const cachedResult = await service.reviewReadinessSummary({ region: 'IN', assetType: 'STOCK' });

    expect(result.scope).toEqual({ region: 'IN', assetType: 'STOCK' });
    expect(cachedResult.scope).toEqual({ region: 'IN', assetType: 'STOCK' });
    expect(repository.listStocksForUniverseHealth).toHaveBeenCalledTimes(1);
    expect(repository.priceReadinessStatsForSymbols).toHaveBeenCalledTimes(1);
    expect(repository.listBlockedPriceBackfillStockIds).toHaveBeenCalledTimes(1);
  });

  it('rejects sync requests without symbol or instrumentId', async () => {
    const service = new MarketDataFoundationService({} as any, {} as any);

    await expect(service.syncV1({})).resolves.toMatchObject({
      success: false,
      instrument: null,
      message: 'symbol or instrumentId is required',
    });
  });

  it('syncs an existing instrument and returns metadata flags', async () => {
    const repository = {
      findStockById: jest.fn().mockResolvedValue(stock),
      updateCompanyMasterData: jest.fn().mockResolvedValue(stock),
      upsertFundamentals: jest.fn().mockResolvedValue({}),
      upsertCorporateActions: jest.fn().mockResolvedValue([]),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'US', exchange: 'NASDAQ' }),
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        exchange: 'NASDAQ',
        country: 'US',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        currency: 'USD',
        marketCap: 100,
        assetType: 'EQUITY',
        isDelisted: false,
        ipoDate: null,
        source: 'yahoo',
        dataStatus: 'PARTIAL',
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      warningCount: 0,
      warnings: [],
    });
    jest.spyOn(service, 'fetchCoreFundamentals').mockResolvedValue({
      symbol: 'AAPL',
      revenue: 100,
      eps: 5,
      earnings: 20,
      dividendYield: 0.01,
      sharesOutstanding: 1000,
      marketCap: 100000,
      currency: 'USD',
      periodType: 'TTM',
      ratios: {
        trailingPe: 25,
        forwardPe: null,
        priceToBook: null,
        profitMargins: null,
        returnOnEquity: null,
        debtToEquity: null,
      },
      source: 'yahoo',
      asOf: '2026-01-02T00:00:00.000Z',
    });
    jest.spyOn(service, 'fetchCorporateActions').mockResolvedValue([
      { symbol: 'AAPL', type: 'dividend', date: '2026-01-02T00:00:00.000Z', value: 0.25, amount: 0.25, source: 'yahoo' },
    ]);

    await expect(service.syncV1({ instrumentId: 'stock-1' })).resolves.toMatchObject({
      success: true,
      pricesStored: true,
      fundamentalsAvailable: true,
      corporateActionsAvailable: true,
      syncSummary: {
        rowsReceived: 1,
        rowsInserted: 1,
      },
      instrument: {
        id: 'stock-1',
        symbol: 'AAPL',
        exchange: 'NASDAQ',
        currency: 'USD',
        asset_type: 'STOCK',
        instrument_segment: 'CASH',
      },
    });
  });

  it('reads stored corporate actions without fetching provider data', async () => {
    const repository = {
      findStockByIdInScope: jest.fn().mockResolvedValue(stock),
      dedupeCorporateActions: jest.fn().mockResolvedValue(undefined),
      listCorporateActions: jest.fn().mockResolvedValue([]),
      upsertCorporateActions: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const fetchSpy = jest.spyOn(service, 'fetchCorporateActions');

    await expect(service.storedCorporateActionsByInstrumentId('stock-1')).resolves.toMatchObject({
      instrument_id: 'stock-1',
      symbol: 'AAPL',
      data_status: 'MISSING',
      actions: [],
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(repository.upsertCorporateActions).not.toHaveBeenCalled();
  });

  it('returns FX rates from the repository', async () => {
    const service = new MarketDataFoundationService({
      listFxRates: jest.fn().mockResolvedValue([
        {
          pair: 'USD/EUR',
          baseCurrency: 'USD',
          quoteCurrency: 'EUR',
          rate: '0.92',
          rateTimestamp: new Date('2026-01-02T00:00:00.000Z'),
          source: 'yahoo',
          ingestionTimestamp: new Date('2026-01-02T00:00:00.000Z'),
          lastUpdatedTimestamp: new Date('2026-01-02T00:00:00.000Z'),
          dataStatus: 'COMPLETE',
        },
      ]),
    } as any, {} as any);

    await expect(service.listFxRates()).resolves.toMatchObject({
      data_status: 'COMPLETE',
      rates: [
        {
          pair: 'USD/EUR',
          rate: 0.92,
          source: 'yahoo',
        },
      ],
    });
  });

  it('returns normalized classification and metadata completeness diagnostics', async () => {
    const service = new MarketDataFoundationService({
      listStocks: jest.fn().mockResolvedValue({
        stocks: [
          {
            ...stock,
            symbol: 'RELIANCE',
            name: 'Reliance Industries',
            region: 'IN',
            exchange: 'NSE',
            country: null,
            currency: null,
            sector: null,
            industry: null,
            marketCap: null,
            assetType: 'EQUITY',
          },
          {
            ...stock,
            id: 'index-1',
            symbol: '^NSEI',
            name: 'NIFTY 50',
            assetType: 'INDEX',
          },
          {
            ...stock,
            id: 'future-1',
            symbol: 'NIFTY26MAYFUT',
            name: 'Nifty Future',
            assetType: 'FUTURE',
          },
          {
            ...stock,
            id: 'etf-1',
            symbol: 'NIFTYBEES',
            name: 'Nifty Bees',
            assetType: 'ETF',
          },
        ],
        pagination: { page: 1, pageSize: 25, total: 4, totalPages: 1 },
      }),
    } as any, {} as any);

    const result = await service.listInstruments({ page: 1, pageSize: 25, region: 'IN', assetType: 'STOCK' });

    expect(result.instruments[0]).toMatchObject({
      asset_type: 'STOCK',
      instrument_segment: 'CASH',
      country: 'India',
      currency: 'INR',
      missing_metadata_fields: expect.arrayContaining(['sector', 'industry', 'marketCap', 'isin', 'listingDate']),
      metadata_completeness_score: 55,
    });
    expect(result.instruments.map((item) => [item.asset_type, item.instrument_segment])).toEqual([
      ['STOCK', 'CASH'],
      ['INDEX', 'INDEX'],
      ['FUTURE', 'FUTURES'],
      ['ETF', 'ETF'],
    ]);
  });

  it('adds trusted baseline residual states and keeps Yahoo insufficiency distinct from fallback attempted exhaustion', async () => {
    const latestCompleted = latestCompletedTradingDateForRegion('IN') as string;
    const baseStock = {
      ...stock,
      region: 'IN',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      assetType: 'STOCK',
      isActive: true,
      isDelisted: false,
      providerSupportStatus: 'SUPPORTED',
      providerSymbol: 'BASE.NS',
      sourceSymbol: 'BASE',
      displaySymbol: 'BASE',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      isin: 'INE000A01000',
      sector: 'Tech',
      industry: 'Software',
      marketCap: 100000000,
      ipoDate: new Date('2010-01-01T00:00:00.000Z'),
    };
    const stocks = [
      { ...baseStock, id: 's-ready', symbol: 'READY', providerSymbol: 'READY.NS' },
      { ...baseStock, id: 's-history', symbol: 'HISTORY', providerSymbol: 'HISTORY.NS' },
      { ...baseStock, id: 's-listing', symbol: 'LISTING', providerSymbol: 'LISTING.NS', ipoDate: null },
      { ...baseStock, id: 's-zero', symbol: 'ZERO', providerSymbol: 'ZERO.NS' },
      { ...baseStock, id: 's-partial-zero', symbol: 'PARTIALZERO', providerSymbol: 'PARTIALZERO.NS' },
      { ...baseStock, id: 's-fallback', symbol: 'FALLBACK', providerSymbol: 'FALLBACK.NS' },
      { ...baseStock, id: 's-identity', symbol: 'IDENTITY', providerSymbol: null, isin: null },
      { ...baseStock, id: 's-retry', symbol: 'RETRY', providerSymbol: 'RETRY.NS', providerSupportStatus: 'VALIDATION_FAILED' },
      { ...baseStock, id: 's-unsupported', symbol: 'UNSUPPORTED', providerSymbol: 'UNSUPPORTED.NS', providerSupportStatus: 'UNSUPPORTED' },
    ];
    const repository = {
      listStocks: jest.fn().mockResolvedValue({
        stocks,
        pagination: { page: 1, pageSize: 25, total: stocks.length, totalPages: 1 },
      }),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['READY.NS', { priceHistoryBars: 3800, firstPriceDate: '2010-01-01', latestPriceDate: latestCompleted, latestVolume: 1000, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
        ['HISTORY.NS', { priceHistoryBars: 300, firstPriceDate: '2025-01-01', latestPriceDate: latestCompleted, latestVolume: 1000, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
        ['LISTING.NS', { priceHistoryBars: 3800, firstPriceDate: '2010-01-01', latestPriceDate: latestCompleted, latestVolume: 1000, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
        ['ZERO.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['PARTIALZERO.NS', { priceHistoryBars: 300, firstPriceDate: '2020-01-01', latestPriceDate: latestCompleted, latestVolume: 1000, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
        ['FALLBACK.NS', { priceHistoryBars: 1500, firstPriceDate: '2020-01-01', latestPriceDate: latestCompleted, latestVolume: 1000, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
        ['IDENTITY.NS', { priceHistoryBars: 3800, firstPriceDate: '2010-01-01', latestPriceDate: latestCompleted, latestVolume: 1000, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
        ['RETRY.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['UNSUPPORTED.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listRepairStatesForStocks: jest.fn().mockResolvedValue(new Map([
        ['s-zero', [{ repairType: 'PRICE_BACKFILL', status: 'MANUAL_REQUIRED', manualRequiredReason: 'Yahoo returned zero usable price rows; approved free official/public exchange fallback is required before accepting missing history.', fieldsFilledJson: {} }]],
        ['s-partial-zero', [{ repairType: 'PRICE_BACKFILL', status: 'MANUAL_REQUIRED', manualRequiredReason: 'Yahoo returned zero usable price rows; approved free official/public exchange fallback is required before accepting missing history.', fieldsFilledJson: {} }]],
        ['s-fallback', [{ repairType: 'PRICE_BACKFILL', status: 'MANUAL_REQUIRED', manualRequiredReason: 'Approved free official/public exchange fallback attempted but required history remains incomplete.', fieldsFilledJson: {} }]],
        ['s-retry', [{ repairType: 'PROVIDER_VALIDATION', status: 'RETRY_COOLDOWN', nextRetryAt: new Date(Date.now() + 60 * 60 * 1000) }]],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.listInstruments({ page: 1, pageSize: 25, region: 'IN', assetType: 'STOCK' });
    const bySymbol = new Map(result.instruments.map((item) => [item.symbol, item]));

    expect(bySymbol.get('READY')).toMatchObject({
      trusted_baseline_residual_state: 'REVIEW_READY',
      required_history_status: 'COMPLETE',
      listing_date_status: 'PRESENT_OLDER_THAN_15Y_USED_15Y',
      latest_completed_eod_date: latestCompleted,
      provider_fallback_state: 'PROVIDER_SUPPORTED',
    });
    expect(bySymbol.get('HISTORY')).toMatchObject({
      trusted_baseline_residual_state: 'REVIEW_READY',
      required_history_status: 'INCOMPLETE',
    });
    expect(bySymbol.get('LISTING')).toMatchObject({
      trusted_baseline_residual_state: 'CATALOG_IDENTITY_REPAIR_REQUIRED',
      listing_date_status: 'MISSING_USED_15_YEAR_TARGET',
    });
    expect(bySymbol.get('ZERO')).toMatchObject({
      trusted_baseline_residual_state: 'FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS',
      required_history_status: 'FALLBACK_REQUIRED',
      provider_fallback_state: 'YAHOO_INSUFFICIENT_FALLBACK_REQUIRED',
      source_fallback_reason: 'YAHOO_ZERO_ROWS',
    });
    expect(bySymbol.get('PARTIALZERO')).toMatchObject({
      trusted_baseline_residual_state: 'FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS',
      required_history_status: 'FALLBACK_REQUIRED',
      provider_fallback_state: 'YAHOO_INSUFFICIENT_FALLBACK_REQUIRED',
      source_fallback_reason: 'YAHOO_ZERO_ROWS',
    });
    expect(bySymbol.get('FALLBACK')).toMatchObject({
      trusted_baseline_residual_state: 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE',
      required_history_status: 'FALLBACK_REQUIRED',
      provider_fallback_state: 'FALLBACK_ATTEMPTED_STILL_INCOMPLETE',
      source_fallback_reason: 'OFFICIAL_FALLBACK_ATTEMPTED_STILL_INCOMPLETE',
    });
    expect(bySymbol.get('IDENTITY')).toMatchObject({
      trusted_baseline_residual_state: 'CATALOG_IDENTITY_REPAIR_REQUIRED',
    });
    expect(bySymbol.get('RETRY')).toMatchObject({
      trusted_baseline_residual_state: 'RETRY_BLOCKED_PROVIDER_VALIDATION',
      provider_fallback_state: 'RETRY_BLOCKED_PROVIDER_VALIDATION',
    });
    expect(bySymbol.get('UNSUPPORTED')).toMatchObject({
      trusted_baseline_residual_state: 'UNSUPPORTED_OR_INACTIVE_EXCLUDED',
      provider_fallback_state: 'PROVIDER_UNSUPPORTED_OR_INACTIVE',
    });
  });

  it('imports NSE equity securities as STOCK/CASH with Yahoo provider symbols', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
    } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES\nRELIANCE,Reliance Industries Limited,EQ\n',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'RELIANCE',
      sourceSymbol: 'RELIANCE',
      providerSymbol: 'RELIANCE.NS',
      displaySymbol: 'RELIANCE',
      exchange: 'NSE',
      country: 'India',
      region: 'IN',
      currency: 'INR',
      assetType: 'STOCK',
      instrumentSegment: 'CASH',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      providerSupportStatus: 'UNKNOWN',
    }));
    expect(result).toMatchObject({
      sourceRows: 1,
      inserted: 1,
      updated: 0,
      noOp: 0,
      invalid: 0,
    });
  });

  it('imports BSE equity security rows with BSE identity and catalog sector metadata', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
    } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'BSE_EQUITY_SECURITIES',
      csvText: 'SCRIP_CD,Scrip_Name,ISIN_NUMBER,scrip_id,Segment,SECTOR,INDUSTRY\n543712,Abans Holdings Limited,INE00ZE01026,ABANS,Equity,Financial Services,Capital Markets\n',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'ABANS',
      sourceSymbol: 'ABANS',
      providerSymbol: 'ABANS.BO',
      displaySymbol: 'ABANS',
      exchange: 'BSE',
      country: 'India',
      region: 'IN',
      currency: 'INR',
      assetType: 'STOCK',
      instrumentSegment: 'CASH',
      catalogSource: 'BSE_EQUITY_SECURITIES',
      sector: 'Financial Services',
      industry: 'Capital Markets',
      isin: 'INE00ZE01026',
    }));
    expect(result).toMatchObject({
      sourceRows: 1,
      inserted: 1,
      updated: 0,
      noOp: 0,
      invalid: 0,
    });
  });

  it('imports NSE ETF rows with ETF-specific name headers', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
    } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_ETF_SECURITIES',
      csvText: 'SYMBOL,NAME OF THE ETF\nNIFTYBEES,Nippon India ETF Nifty 50 BeES\n',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'NIFTYBEES',
      providerSymbol: 'NIFTYBEES.NS',
      sourceSymbol: 'NIFTYBEES',
      name: 'Nippon India ETF Nifty 50 BeES',
      assetType: 'ETF',
      instrumentSegment: 'ETF',
      catalogSource: 'NSE_ETF_SECURITIES',
    }));
    expect(result).toMatchObject({
      sourceRows: 1,
      inserted: 1,
      invalid: 0,
    });
  });

  it('imports NSE ETF rows with compact NSE archive headers', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
    } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_ETF_SECURITIES',
      csvText: 'Symbol,Underlying,SecurityName,DateofListing,MarketLot,ISINNumber,FaceValue\nNIFTYBEES,Nifty50,NIPINDETFNIFTYBEES,08-Jan-02,1,INF204KB14I2,1\n',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'NIFTYBEES',
      providerSymbol: 'NIFTYBEES.NS',
      sourceSymbol: 'NIFTYBEES',
      name: 'NIPINDETFNIFTYBEES',
      assetType: 'ETF',
      instrumentSegment: 'ETF',
      catalogSource: 'NSE_ETF_SECURITIES',
      isin: 'INF204KB14I2',
      ipoDate: expect.any(Date),
    }));
    expect(result).toMatchObject({
      sourceRows: 1,
      inserted: 1,
      invalid: 0,
    });
  });

  it('imports configured URL CSV, reports download metadata, and deletes the temp file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdf-catalog-'));
    const originalEnv = { ...process.env };
    const csv = 'SYMBOL,NAME OF COMPANY,SERIES\nABB,ABB India,EQ\n';
    const bytes = Buffer.from(csv);
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name.toLowerCase() === 'content-length' ? String(bytes.length) : null },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://example.com/nse.csv';
    process.env.MARKET_DATA_CATALOG_TEMP_DIR = tempDir;
    process.env.MARKET_DATA_CATALOG_MAX_DOWNLOAD_MB = '1';
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const service = new MarketDataFoundationService({ upsertCatalogInstrument } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
      batchSize: 100,
    });

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/nse.csv', expect.any(Object));
    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'ABB' }));
    expect(result).toMatchObject({
      importMode: 'CONFIGURED_URL',
      downloaded: true,
      fileSizeBytes: Buffer.byteLength(csv),
      tempFileDeleted: true,
      inserted: 1,
      processedCount: 1,
      totalCount: 1,
      hasMore: false,
    });
    expect(fs.readdirSync(tempDir)).toHaveLength(0);
    process.env = originalEnv;
  });

  it('deletes downloaded temp file when parser validation fails', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdf-catalog-bad-'));
    const originalEnv = { ...process.env };
    const csv = 'BAD,HEADER\nx,y\n';
    const bytes = Buffer.from(csv);
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.length) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://example.com/bad.csv';
    process.env.MARKET_DATA_CATALOG_TEMP_DIR = tempDir;
    const service = new MarketDataFoundationService({ upsertCatalogInstrument: jest.fn() } as any, {} as any);

    await expect(service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('CSV format did not match expected NSE_EQUITY_SECURITIES columns');

    expect(fs.readdirSync(tempDir)).toHaveLength(0);
    process.env = originalEnv;
  });

  it('rejects unsafe configured catalog URLs and returns setup hints for sources without URLs', async () => {
    const originalEnv = { ...process.env };
    const service = new MarketDataFoundationService({} as any, {} as any);

    await expect(service.importCatalog({
      catalogSource: 'BSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('Set MARKET_DATA_CATALOG_BSE_EQUITY_URL');

    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'http://example.com/nse.csv';
    await expect(service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('must use https');

    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://localhost/nse.csv';
    await expect(service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('host is not allowed');

    process.env = originalEnv;
  });

  it('rejects oversized configured catalog downloads', async () => {
    const originalEnv = { ...process.env };
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => String(2 * 1024 * 1024) },
      arrayBuffer: async () => Buffer.from('').buffer,
    });
    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://example.com/large.csv';
    process.env.MARKET_DATA_CATALOG_MAX_DOWNLOAD_MB = '1';
    const service = new MarketDataFoundationService({} as any, {} as any);

    await expect(service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('exceeds max size');

    process.env = originalEnv;
  });

  it('returns a clear error when configured catalog download times out', async () => {
    const originalEnv = { ...process.env };
    const timeoutError = new Error('aborted');
    timeoutError.name = 'AbortError';
    (global.fetch as jest.Mock | undefined) = jest.fn().mockRejectedValue(timeoutError);
    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://example.com/slow.csv';
    const service = new MarketDataFoundationService({} as any, {} as any);

    await expect(service.importCatalog({
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
    })).rejects.toThrow('Download timed out for catalog source NSE_EQUITY_SECURITIES');

    process.env = originalEnv;
  });

  it('lists configured catalog sources without exposing raw URLs', () => {
    const originalEnv = { ...process.env };
    process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL = 'https://example.com/nse.csv';
    const service = new MarketDataFoundationService({} as any, {} as any);

    expect(service.listCatalogSources().sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        catalogSource: 'NSE_EQUITY_SECURITIES',
        displayName: 'NSE Equity Securities',
        urlConfigured: true,
        urlSource: 'ENV',
        importModes: ['CONFIGURED_URL', 'MANUAL_CSV'],
      }),
      expect.objectContaining({
        catalogSource: 'NSE_ETF_SECURITIES',
        displayName: 'NSE ETF Securities',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        importModes: ['CONFIGURED_URL', 'MANUAL_CSV'],
      }),
      expect.objectContaining({
        catalogSource: 'NSE_INDEX_SECURITIES',
        displayName: 'NSE Indices',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        importModes: ['CONFIGURED_URL'],
      }),
      expect.objectContaining({
        catalogSource: 'BSE_INDEX_SECURITIES',
        displayName: 'BSE Indices',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        importModes: ['CONFIGURED_URL'],
      }),
      expect.objectContaining({
        catalogSource: 'NSE_INDEX_SEED',
        displayName: 'NSE/BSE Index Seed',
        urlConfigured: false,
        urlSource: 'INTERNAL_SEED',
        supportsInternalSeed: true,
        importModes: ['INTERNAL_SEED'],
      }),
    ]));
    expect(JSON.stringify(service.listCatalogSources())).not.toContain('https://example.com/nse.csv');
    process.env = originalEnv;
  });

  it('ships default configured URLs for NSE equity, ETF, and index sources', () => {
    const originalEnv = { ...process.env };
    delete process.env.MARKET_DATA_CATALOG_NSE_EQUITY_URL;
    delete process.env.MARKET_DATA_CATALOG_NSE_ETF_URL;
    delete process.env.MARKET_DATA_CATALOG_NSE_INDICES_URL;
    delete process.env.MARKET_DATA_CATALOG_BSE_INDICES_URL;
    const service = new MarketDataFoundationService({} as any, {} as any);

    expect(service.listCatalogSources().sources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        catalogSource: 'NSE_EQUITY_SECURITIES',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        supportsConfiguredUrl: true,
      }),
      expect.objectContaining({
        catalogSource: 'NSE_ETF_SECURITIES',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        supportsConfiguredUrl: true,
      }),
      expect.objectContaining({
        catalogSource: 'NSE_INDEX_SECURITIES',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        supportsConfiguredUrl: true,
        fileType: 'JSON',
      }),
      expect.objectContaining({
        catalogSource: 'BSE_INDEX_SECURITIES',
        urlConfigured: true,
        urlSource: 'DEFAULT',
        supportsConfiguredUrl: true,
        fileType: 'HTML',
      }),
    ]));

    process.env = originalEnv;
  });

  it('imports NSE all-indices JSON from configured URL as INDEX rows', async () => {
    const originalEnv = { ...process.env };
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdf-nse-index-'));
    const payload = JSON.stringify({
      data: [
        { index: 'NIFTY 50' },
        { index: 'NIFTY IT' },
        { index: 'NIFTY NEXT 50' },
      ],
    });
    const bytes = Buffer.from(payload);
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.length) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    process.env.MARKET_DATA_CATALOG_NSE_INDICES_URL = 'https://example.com/all-indices.json';
    process.env.MARKET_DATA_CATALOG_TEMP_DIR = tempDir;
    const service = new MarketDataFoundationService({ upsertCatalogInstrument } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_INDEX_SECURITIES',
      importMode: 'CONFIGURED_URL',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '^NSEI',
      providerSymbol: '^NSEI',
      sourceSymbol: 'NIFTY 50',
      assetType: 'INDEX',
      instrumentSegment: 'INDEX',
      catalogSource: 'NSE_INDEX_SECURITIES',
    }));
    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '^CNXIT',
      providerSymbol: '^CNXIT',
      sourceSymbol: 'NIFTY IT',
    }));
    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'NSE_INDEX_NIFTY_NEXT_50',
      providerSymbol: null,
      sourceSymbol: 'NIFTY NEXT 50',
    }));
    expect(result).toMatchObject({
      sourceRows: 3,
      inserted: 3,
      downloaded: true,
      tempFileDeleted: true,
    });
    expect(fs.readdirSync(tempDir)).toHaveLength(0);
    process.env = originalEnv;
  });

  it('imports BSE index-watch HTML from configured URL as INDEX rows', async () => {
    const originalEnv = { ...process.env };
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdf-bse-index-'));
    const html = '<table><tr><td>BSE SENSEX</td><td>81000</td></tr><tr><td>BSE 100</td><td>27000</td></tr><tr><td>Current</td><td>1</td></tr></table>';
    const bytes = Buffer.from(html);
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.length) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    process.env.MARKET_DATA_CATALOG_BSE_INDICES_URL = 'https://example.com/bse-indices.html';
    process.env.MARKET_DATA_CATALOG_TEMP_DIR = tempDir;
    const service = new MarketDataFoundationService({ upsertCatalogInstrument } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'BSE_INDEX_SECURITIES',
      importMode: 'CONFIGURED_URL',
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '^BSESN',
      providerSymbol: '^BSESN',
      sourceSymbol: 'BSE SENSEX',
      exchange: 'BSE_INDEX',
      assetType: 'INDEX',
      instrumentSegment: 'INDEX',
      catalogSource: 'BSE_INDEX_SECURITIES',
    }));
    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'BSE_INDEX_BSE_100',
      providerSymbol: null,
      sourceSymbol: 'BSE 100',
    }));
    expect(result).toMatchObject({
      sourceRows: 2,
      inserted: 2,
      downloaded: true,
      tempFileDeleted: true,
    });
    expect(fs.readdirSync(tempDir)).toHaveLength(0);
    process.env = originalEnv;
  });

  it('normalizes NSE and BSE catalog symbols into source and provider symbols', () => {
    const service = new MarketDataFoundationService({} as any, {} as any);

    expect(service.normalizeCatalogSymbol({ symbol: 'ABB', exchange: 'NSE' })).toEqual({
      sourceSymbol: 'ABB',
      providerSymbol: 'ABB.NS',
      displaySymbol: 'ABB',
    });
    expect(service.normalizeCatalogSymbol({ symbol: 'ABB', exchange: 'NSE' })).toEqual({
      sourceSymbol: 'ABB',
      providerSymbol: 'ABB.NS',
      displaySymbol: 'ABB',
    });
    expect(service.normalizeCatalogSymbol({ symbol: 'RELIANCE', providerSymbol: 'RELIANCE.NL', exchange: 'NSE' })).toEqual({
      sourceSymbol: 'RELIANCE',
      providerSymbol: 'RELIANCE.NS',
      displaySymbol: 'RELIANCE',
    });
    expect(service.normalizeCatalogSymbol({ symbol: 'ABC', exchange: 'BSE' })).toEqual({
      sourceSymbol: 'ABC',
      providerSymbol: 'ABC.BO',
      displaySymbol: 'ABC',
    });
  });

  it('backfills known NSE F&O stock underlyings as eligible and corrects invalid provider suffixes', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForCatalogBackfill: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-1',
          symbol: 'RELIANCE',
          providerSymbol: 'RELIANCE.NL',
          name: 'Reliance Industries Limited',
          region: 'IN',
          exchange: 'NSE',
          assetType: 'STOCK',
          derivativesEligible: false,
          source: 'database',
          dataStatus: 'PARTIAL',
          isActive: true,
        }],
      }),
      upsertCatalogInstrument,
    };
    const service = new MarketDataFoundationService(repository as any, { validateProviderSymbol: jest.fn() } as any);

    await service.backfillCatalogMetadata({ region: 'IN', batchSize: 25, validateProvider: false });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'RELIANCE',
      sourceSymbol: 'RELIANCE',
      providerSymbol: 'RELIANCE.NS',
      displaySymbol: 'RELIANCE',
      derivativesEligible: true,
    }));
  });

  it('backfills old NSE rows to STOCK/CASH India metadata without provider validation', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForCatalogBackfill: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-1',
          symbol: 'ABB',
          name: 'ABB India',
          region: 'IN',
          exchange: null,
          country: null,
          currency: null,
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: '1000',
          assetType: 'EQUITY',
          source: 'database',
          dataStatus: 'PARTIAL',
          isActive: true,
        }],
      }),
      upsertCatalogInstrument,
    };
    const provider = { validateProviderSymbol: jest.fn() };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.backfillCatalogMetadata({ region: 'IN', batchSize: 25, validateProvider: false });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'ABB',
      sourceSymbol: 'ABB',
      providerSymbol: 'ABB.NS',
      displaySymbol: 'ABB',
      assetType: 'STOCK',
      instrumentSegment: 'CASH',
      region: 'IN',
      country: 'India',
      currency: 'INR',
      exchange: 'NSE',
      catalogSource: 'LEGACY_DATABASE',
      providerSupportStatus: 'UNKNOWN',
    }));
    expect(provider.validateProviderSymbol).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      processedCount: 1,
      totalCount: 1,
      updated: 1,
      noOp: 0,
      hasMore: false,
    });
  });

  it('scopes catalog metadata backfill by selected catalog source', async () => {
    const repository = {
      listStocksForCatalogBackfill: jest.fn().mockResolvedValue({
        total: 0,
        stocks: [],
      }),
    };
    const service = new MarketDataFoundationService(repository as any, { validateProviderSymbol: jest.fn() } as any);

    const result = await service.backfillCatalogMetadata({
      region: 'IN',
      assetType: 'ETF',
      catalogSource: 'NSE_ETF_SECURITIES',
      batchSize: 25,
      validateProvider: false,
    });

    expect(repository.listStocksForCatalogBackfill).toHaveBeenCalledWith(expect.objectContaining({
      region: 'IN',
      assetType: 'ETF',
      catalogSource: 'NSE_ETF_SECURITIES',
      batchSize: 25,
      offset: 0,
    }));
    expect(result).toMatchObject({
      catalogSource: 'NSE_ETF_SECURITIES',
      workerConcurrency: 16,
      totalCount: 0,
    });
  });

  it('runs catalog metadata backfill with bounded parallel workers', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const repository = {
      listStocksForCatalogBackfill: jest.fn().mockResolvedValue({
        total: 4,
        stocks: ['A', 'B', 'C', 'D'].map((symbol) => ({
          symbol: `${symbol}.NS`,
          name: `${symbol} Limited`,
          region: 'IN',
          exchange: 'NSE',
          assetType: 'STOCK',
          source: 'database',
          dataStatus: 'PARTIAL',
          isActive: true,
        })),
      }),
      upsertCatalogInstrument: jest.fn().mockImplementation(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return { action: 'updated', stock: {} };
      }),
    };
    const service = new MarketDataFoundationService(repository as any, { validateProviderSymbol: jest.fn() } as any);

    const result = await service.backfillCatalogMetadata({ region: 'IN', batchSize: 4, workerConcurrency: 3, validateProvider: false });

    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(result).toMatchObject({
      processedCount: 4,
      updated: 4,
      workerConcurrency: 3,
    });
  });

  it('ignores provider validation during catalog metadata backfill when legacy flag is requested', async () => {
    const repository = {
      listStocksForCatalogBackfill: jest.fn().mockResolvedValue({
        total: 2,
        stocks: [
          { symbol: 'ABB', name: 'ABB India', region: 'IN', exchange: 'NSE', assetType: 'STOCK', source: 'database', isActive: true },
          { symbol: 'BAD', name: 'Bad Symbol', region: 'IN', exchange: 'NSE', assetType: 'STOCK', source: 'database', isActive: true },
        ],
      }),
      upsertCatalogInstrument: jest.fn().mockResolvedValue({ action: 'noOp', stock: {} }),
      updateProviderSupportStatus: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      validateProviderSymbol: jest.fn()
        .mockResolvedValueOnce({ supported: true })
        .mockResolvedValueOnce({ supported: false, message: 'not found' }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.backfillCatalogMetadata({ region: 'IN', batchSize: 1, validateProvider: true, workerConcurrency: 1 });

    expect(provider.validateProviderSymbol).not.toHaveBeenCalled();
    expect(repository.updateProviderSupportStatus).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      processedCount: 2,
      validated: 0,
      providerUnsupported: 0,
      batchSize: 1,
      nextOffset: 1,
      hasMore: true,
    });
    expect(result.warnings).toContain('Provider validation is disabled for NSE/BSE-only market data; catalog rows were imported without provider fallback checks.');
  });

  it('marks F&O underlyings as derivatives eligible without creating fake FUTURE rows', async () => {
    const rows: any[] = [];
    const upsertCatalogInstrument = jest.fn().mockImplementation((row) => {
      rows.push(row);
      return Promise.resolve({ action: row.assetType === 'INDEX' ? 'inserted' : 'updated', stock: {} });
    });
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
    } as any, {} as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
      csvText: 'SYMBOL\nRELIANCE\nNIFTY 50\n',
    });

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: 'RELIANCE',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        derivativesEligible: true,
      }),
      expect.objectContaining({
        symbol: '^NSEI',
        assetType: 'INDEX',
        instrumentSegment: 'INDEX',
        derivativesEligible: true,
      }),
    ]));
    expect(rows.some((row) => row.assetType === 'FUTURE' || row.instrumentSegment === 'FUTURES')).toBe(false);
    expect(result).toMatchObject({
      underlyingsRead: 2,
      stockUnderlyingsMatched: 1,
      newInstrumentsCreated: 1,
    });
  });

  it('imports F&O underlyings from configured URL without creating FUTURE rows', async () => {
    const originalEnv = { ...process.env };
    const csv = 'SYMBOL\nABB\n';
    const rows: any[] = [];
    const bytes = Buffer.from(csv);
    (global.fetch as jest.Mock | undefined) = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => String(bytes.length) },
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
    process.env.MARKET_DATA_CATALOG_NSE_FO_UNDERLYINGS_URL = 'https://example.com/fo.csv';
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument: jest.fn().mockImplementation((row) => {
        rows.push(row);
        return Promise.resolve({ action: 'updated', stock: {} });
      }),
    } as any, {} as any);

    await service.importCatalog({
      catalogSource: 'NSE_EQUITY_DERIVATIVES_UNDERLYINGS',
      importMode: 'CONFIGURED_URL',
    });

    expect(rows).toEqual([
      expect.objectContaining({
        symbol: 'ABB',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        derivativesEligible: true,
      }),
    ]);
    expect(rows.some((row) => row.assetType === 'FUTURE' || row.instrumentSegment === 'FUTURES')).toBe(false);
    process.env = originalEnv;
  });




  it('allows provider-supported stocks into trusted Lite review with current 120-bar OHLCV evidence', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          symbol: 'SPARSE',
          providerSymbol: 'SPARSE.NS',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
          marketCap: 1000,
          isin: 'INE123A01010',
          ipoDate: new Date('2000-01-01T00:00:00.000Z'),
          region: 'IN',
          assetType: 'STOCK',
          exchange: 'NSE',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['SPARSE.NS', {
          priceHistoryBars: 300,
          firstPriceDate: '2011-05-12',
          latestPriceDate: latestCompletedTradingDateForRegion('IN'),
          latestVolume: 100,
          latestAdjustedClose: 10,
          latestClose: 10,
          rollingWindowBars: 252,
          rollingWindowCoveragePercent: 100,
          maxPriceGapDays: 1,
          recentVolumeCoveragePercent: 100,
          adjustedCloseCoveragePercent: 100,
          usesAdjustedCloseFallback: false,
        }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.trustedReviewUniverseHealth({ region: 'IN', assetType: 'STOCK' });

    expect(result.trustedCount).toBe(1);
    expect(result.excludedCounts.requiredHistoryIncomplete).toBe(0);
    expect(result.excludedCounts.insufficientBarsUnder252).toBe(0);
    expect(result.warnings.join(' ')).not.toMatch(/15 years of daily OHLCV/);
  });

  it('reports read-only active stock missing-data diagnostics with expected-null and identity mismatch samples', async () => {
    const updateCompanyMasterData = jest.fn();
    const updateProviderSupportStatus = jest.fn();
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'good',
          symbol: 'GOOD',
          name: 'Good Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: 'Technology',
          industry: 'Software',
          currency: 'INR',
          marketCap: 1000,
          assetType: 'STOCK',
          instrumentSegment: 'CASH',
          displaySymbol: 'GOOD',
          providerSymbol: 'GOOD.NS',
          sourceSymbol: 'GOOD',
          catalogSource: 'NSE_EQUITY_SECURITIES',
          providerSupportStatus: 'SUPPORTED',
          providerError: null,
          derivativesEligible: false,
          underlyingSymbol: null,
          expiryDate: null,
          contractMonth: null,
          lotSize: null,
          contractStatus: null,
          isActive: true,
          isDelisted: false,
          ipoDate: new Date('2000-01-01T00:00:00.000Z'),
          isin: 'INE123A01010',
          source: 'catalog',
          dataStatus: 'PARTIAL',
          lastSuccessfulDataLoadTimestamp: new Date('2026-05-12T00:00:00.000Z'),
        },
        {
          id: 'bad',
          symbol: 'BROKEN',
          name: 'Broken Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'Unknown',
          sector: 'N/A',
          industry: '',
          currency: 'USD',
          marketCap: 0,
          assetType: 'STOCK',
          instrumentSegment: 'CASH',
          displaySymbol: 'BROKEN',
          providerSymbol: 'BROKEN.BO',
          sourceSymbol: 'OTHER',
          catalogSource: '',
          providerSupportStatus: 'SUPPORTED',
          providerError: 'stale provider error',
          derivativesEligible: false,
          underlyingSymbol: 'NIFTY',
          expiryDate: null,
          contractMonth: null,
          lotSize: null,
          contractStatus: null,
          isActive: true,
          isDelisted: false,
          ipoDate: null,
          isin: 'BAD',
          source: 'database',
          dataStatus: 'BAD_STATUS',
          lastSuccessfulDataLoadTimestamp: null,
        },
        {
          id: 'alt-price',
          symbol: 'CANON',
          name: 'Alternate Price Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: 'Industrials',
          industry: 'Machinery',
          currency: 'INR',
          marketCap: 500,
          assetType: 'STOCK',
          instrumentSegment: 'CASH',
          displaySymbol: 'CANON',
          providerSymbol: 'ALT.NS',
          sourceSymbol: 'CANON',
          catalogSource: 'NSE_EQUITY_SECURITIES',
          providerSupportStatus: 'SUPPORTED',
          providerError: null,
          derivativesEligible: false,
          underlyingSymbol: null,
          expiryDate: null,
          contractMonth: null,
          lotSize: null,
          contractStatus: null,
          isActive: true,
          isDelisted: false,
          ipoDate: new Date('2019-01-01T00:00:00.000Z'),
          isin: 'INE999A01010',
          source: 'catalog',
          dataStatus: 'PARTIAL',
          lastSuccessfulDataLoadTimestamp: null,
        },
        {
          id: 'inactive',
          symbol: 'INACTIVE',
          name: '',
          region: 'IN',
          isActive: false,
          isDelisted: false,
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['GOOD', { priceHistoryBars: 300 }],
        ['BROKEN', { priceHistoryBars: 0 }],
        ['BROKEN.BO', { priceHistoryBars: 10 }],
        ['CANON', { priceHistoryBars: 0 }],
        ['ALT.NS', { priceHistoryBars: 50 }],
      ])),
      updateCompanyMasterData,
      updateProviderSupportStatus,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.stockMissingDataDiagnostics({ region: 'IN', assetType: 'STOCK', sampleLimit: 2 });

    expect(result.activeStockCount).toBe(3);
    expect(result.sampleLimit).toBe(2);
    expect(repository.priceReadinessStatsForSymbols).toHaveBeenCalledWith(expect.arrayContaining([
      'GOOD',
      'GOOD.NS',
      'BROKEN',
      'BROKEN.BO',
      'CANON',
      'ALT.NS',
    ]));
    expect(result.columns.find((item) => item.column === 'sector')).toMatchObject({ nullEquivalentCount: 1, affectedCount: 1 });
    expect(result.columns.find((item) => item.column === 'industry')).toMatchObject({ blankCount: 1, affectedCount: 1 });
    expect(result.columns.find((item) => item.column === 'marketCap')).toMatchObject({ invalidCount: 1, affectedCount: 1 });
    expect(result.columns.find((item) => item.column === 'providerError')).toMatchObject({ expectedNullCount: 2, unexpectedNonNullCount: 1 });
    expect(result.columns.find((item) => item.column === 'underlyingSymbol')).toMatchObject({ expectedNullCount: 2, unexpectedNonNullCount: 1 });
    expect(result.expectedNullColumns.find((item) => item.column === 'underlyingSymbol')).toMatchObject({
      expectedNullCount: 2,
      unexpectedNonNullCount: 1,
    });
    expect(result.identityMismatches).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PROVIDER_SYMBOL_SUFFIX_MISMATCH', count: 1 }),
      expect.objectContaining({ code: 'PRICE_ROWS_UNDER_ALTERNATE_SYMBOL', count: 2 }),
      expect.objectContaining({ code: 'SUPPORTED_WITHOUT_CANONICAL_PRICES', count: 2 }),
    ]));
    expect(result.identityMismatches.find((item) => item.code === 'STOCK_SYMBOL_SUFFIX_MISMATCH')).toBeUndefined();
    expect(result.identityMismatches.find((item) => item.code === 'PRICE_ROWS_UNDER_ALTERNATE_SYMBOL')?.samples[0]).toMatchObject({
      issue: 'IDENTITY_MISMATCH',
      alternatePriceHistoryBars: expect.any(Number),
    });
    expect(result.totals.identityMismatchRows).toBe(2);
    expect(updateCompanyMasterData).not.toHaveBeenCalled();
    expect(updateProviderSupportStatus).not.toHaveBeenCalled();
  });

  it('repairs price identity only for safe provider-symbol price rows', async () => {
    const stocks = [
      {
        id: 'safe',
        symbol: 'CCL',
        name: 'CCL Products',
        region: 'IN',
        exchange: 'NSE',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        providerSymbol: 'CCL.NS',
        sourceSymbol: 'CCL',
        displaySymbol: 'CCL',
        providerSupportStatus: 'SUPPORTED',
        isActive: true,
        isDelisted: false,
      },
      {
        id: 'base-mismatch',
        symbol: 'FEL',
        name: 'Future Enterprises',
        region: 'IN',
        exchange: 'NSE',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        providerSymbol: 'FELDVR.NS',
        sourceSymbol: 'FELDVR',
        displaySymbol: 'FELDVR',
        providerSupportStatus: 'SUPPORTED',
        isActive: true,
        isDelisted: false,
      },
      {
        id: 'exchange-mismatch',
        symbol: 'BSEONLY.BO',
        name: 'BSE Only',
        region: 'IN',
        exchange: 'BSE',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        providerSymbol: 'BSEONLY.NS',
        sourceSymbol: 'BSEONLY',
        displaySymbol: 'BSEONLY',
        providerSupportStatus: 'SUPPORTED',
        isActive: true,
        isDelisted: false,
      },
      {
        id: 'dup-a',
        symbol: 'DUPA',
        name: 'Duplicate A',
        region: 'IN',
        exchange: 'NSE',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        providerSymbol: 'DUP.NS',
        sourceSymbol: 'DUP',
        displaySymbol: 'DUP',
        providerSupportStatus: 'SUPPORTED',
        isActive: true,
        isDelisted: false,
      },
      {
        id: 'dup-b',
        symbol: 'DUPB',
        name: 'Duplicate B',
        region: 'IN',
        exchange: 'NSE',
        assetType: 'STOCK',
        instrumentSegment: 'CASH',
        providerSymbol: 'DUP.NS',
        sourceSymbol: 'DUP',
        displaySymbol: 'DUP',
        providerSupportStatus: 'SUPPORTED',
        isActive: true,
        isDelisted: false,
      },
    ];
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue(stocks),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['CCL', { priceHistoryBars: 0 }],
        ['CCL.NS', { priceHistoryBars: 4036 }],
        ['FEL.NS', { priceHistoryBars: 0 }],
        ['FELDVR.NS', { priceHistoryBars: 1230 }],
        ['BSEONLY.BO', { priceHistoryBars: 0 }],
        ['BSEONLY.NS', { priceHistoryBars: 100 }],
        ['DUPA', { priceHistoryBars: 0 }],
        ['DUPB', { priceHistoryBars: 0 }],
        ['DUP.NS', { priceHistoryBars: 50 }],
      ])),
      latestPriceExists: jest.fn().mockResolvedValue(false),
      reassignPriceRowsToCanonicalSymbol: jest.fn().mockResolvedValue({ priceRowsMoved: 4036, latestPricesMoved: 1 }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const dryRun = await service.repairPriceIdentity({ region: 'IN', assetType: 'STOCK', dryRun: true, batchSize: 10 });

    expect(dryRun.dryRun).toBe(true);
    expect(dryRun.totalCandidates).toBe(5);
    expect(dryRun.repaired).toBe(0);
    expect(dryRun.samples.find((item) => item.stockId === 'safe')).toMatchObject({ action: 'DRY_RUN', skippedReason: null });
    expect(dryRun.samples.find((item) => item.stockId === 'base-mismatch')).toMatchObject({ action: 'SKIPPED' });
    expect(dryRun.samples.find((item) => item.stockId === 'exchange-mismatch')).toMatchObject({ action: 'SKIPPED' });
    expect(dryRun.samples.find((item) => item.stockId === 'dup-a')).toMatchObject({ action: 'SKIPPED' });
    expect(repository.reassignPriceRowsToCanonicalSymbol).not.toHaveBeenCalled();

    const repaired = await service.repairPriceIdentity({ region: 'IN', assetType: 'STOCK', dryRun: false, batchSize: 10 });

    expect(repaired.repaired).toBe(1);
    expect(repaired.skipped).toBe(4);
    expect(repaired.priceRowsMoved).toBe(4036);
    expect(repaired.latestPricesMoved).toBe(1);
    expect(repository.reassignPriceRowsToCanonicalSymbol).toHaveBeenCalledWith({
      stockId: 'safe',
      fromSymbol: 'CCL.NS',
      toSymbol: 'CCL',
    });
  });

  it('imports index seed rows while ignoring legacy provider validation requests', async () => {
    const upsertCatalogInstrument = jest.fn().mockResolvedValue({ action: 'inserted', stock: {} });
    const updateProviderSupportStatus = jest.fn().mockResolvedValue({});
    const provider = {
      validateProviderSymbol: jest.fn()
        .mockResolvedValueOnce({ supported: true })
        .mockResolvedValueOnce({ supported: false, message: 'not found' })
        .mockResolvedValueOnce({ supported: true }),
    };
    const service = new MarketDataFoundationService({
      upsertCatalogInstrument,
      updateProviderSupportStatus,
    } as any, provider as any);

    const result = await service.importCatalog({
      catalogSource: 'NSE_INDEX_SEED',
      validateProvider: true,
      batchSize: 3,
    });

    expect(upsertCatalogInstrument).toHaveBeenCalledWith(expect.objectContaining({
      symbol: '^NSEI',
      assetType: 'INDEX',
      instrumentSegment: 'INDEX',
      catalogSource: 'NSE_INDEX_SEED',
    }));
    expect(provider.validateProviderSymbol).not.toHaveBeenCalled();
    expect(updateProviderSupportStatus).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      sourceRows: 3,
      inserted: 3,
      providerValidated: 0,
      providerUnsupported: 0,
    });
    expect(result.warnings).toContain('Provider validation is disabled for NSE/BSE-only market data; catalog rows were imported without provider fallback checks.');
  });






  it('uses NSE UDiFF zip as the first official EOD source when available', async () => {
    const previousFlag = process.env.MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED;
    const previousFetch = global.fetch;
    process.env.MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED = 'true';
    const csvText = [
      'TckrSymb,SctySrs,TradDt,OpnPric,HghPric,LwPric,ClsPric,TtlTradgVol',
      'RELIANCE,EQ,2026-05-18,100,110,95,108,1000',
    ].join('\n');
    const payload = buildStoredZip('BhavCopy_NSE_CM_0_0_0_20260518_F_0000.csv', csvText);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => (name.toLowerCase() === 'content-length' ? String(payload.length) : null) },
      arrayBuffer: async () => payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
    }) as any;

    const repository = {
      countStaleActiveStockSyncTasks: jest.fn().mockResolvedValue(1),
      listStaleActiveStockSyncTasks: jest.fn().mockResolvedValue([{
        id: 'stock-1',
        symbol: 'RELIANCE',
        providerSymbol: 'RELIANCE.NS',
        sourceSymbol: 'RELIANCE',
        displaySymbol: 'RELIANCE',
        exchange: 'NSE',
        lastSuccessfulDataLoadTimestamp: new Date('2026-05-19T00:00:00.000Z'),
        latestStoredTimestamp: new Date('2026-05-17T00:00:00.000Z'),
      }]),
      listActiveStockSyncTasks: jest.fn(),
      upsertSyncState: jest.fn().mockResolvedValue({}),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-18'),
      getSyncState: jest.fn().mockResolvedValue({
        status: 'SYNCED',
        // Kept equal to `now` so the per-instrument sync stays RECENTLY_SYNCED
        // (skipped) — the point of this test is that the official EOD bulk
        // download still runs even when the per-instrument gate skips.
        lastCheckedAt: new Date('2026-05-18T13:15:00.000Z').toISOString(),
      }),
      updateStockLoadTimestampBySymbol: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    // Pre-warm the NSE holiday cache so syncScheduledRegion's pre-warm doesn't
    // make an extra global.fetch call that would break the toHaveBeenCalledTimes(1) assertion.
    (service as any).indiaTradingCalendar.nseTradingHolidayCache.set(2026, {
      expiresAt: Date.now() + 86400000,
      holidays: new Map<string, string>(),
      sourceUrl: 'test-prefill',
    });
    const storeHistorical = jest.spyOn(service, 'storeHistorical').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });
    const ingestSymbol = jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    try {
      const summary = await service.syncScheduledRegion('IN', {
        assetType: 'STOCK',
        batchSize: 1,
        // 13:15 UTC = 18:45 IST — past the NSE finalization grace (≈18:30 IST),
        // so today's (2026-05-18) candle is the latest completed one to fetch.
        now: new Date('2026-05-18T13:15:00.000Z'),
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_20260518_F_0000.csv.zip',
        expect.any(Object)
      );
      expect(storeHistorical).toHaveBeenCalledWith([
        expect.objectContaining({
          symbol: 'RELIANCE',
          source: 'NSE_UDIFF_CM_BHAVCOPY',
          date: new Date('2026-05-18T00:00:00.000Z'),
        }),
      ]);
      expect(ingestSymbol).not.toHaveBeenCalled();
      expect(summary).toMatchObject({
        instrumentsProcessed: 1,
        officialEodBulk: {
          attempted: true,
          sourceName: 'NSE_UDIFF_CM_BHAVCOPY',
          sourceFileName: 'BhavCopy_NSE_CM_0_0_0_20260518_F_0000.csv.zip',
          matchedInstruments: 1,
          fallbackReason: null,
        },
      });
    } finally {
      if (previousFlag === undefined) delete process.env.MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED;
      else process.env.MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED = previousFlag;
      global.fetch = previousFetch;
    }
  });

  it('records a not-available NSE UDiFF import instead of failing when the official file is unavailable', async () => {
    const previousFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
      arrayBuffer: async () => Buffer.from('').buffer,
    }) as any;
    const repository = {
      findSourceFileImportByKey: jest.fn().mockResolvedValue(null),
      upsertSourceFileImport: jest.fn().mockResolvedValue({ id: 'nse-unavailable-import-1', status: 'NOT_AVAILABLE' }),
      storeHistoricalBulk: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    try {
      const result = await service.importNseCmUdiffDaily({ tradingDate: '2026-06-01' });

      expect(result).toMatchObject({
        status: 'NOT_AVAILABLE',
        source: 'NSE',
        segment: 'CM',
        tradingDate: '2026-06-01',
        sourceFileImportId: 'nse-unavailable-import-1',
        sourceFingerprint: null,
        rowsRead: 0,
        rowsParsed: 0,
        rowsInserted: 0,
        rowsSkipped: 0,
        warningCount: 1,
        warnings: [expect.stringContaining('not available yet')],
        errors: [],
      });
      expect(repository.upsertSourceFileImport).toHaveBeenCalledWith(expect.objectContaining({
        source: 'NSE',
        segment: 'CM',
        status: 'NOT_AVAILABLE',
        rowsRaw: 0,
        rowsAccepted: 0,
        rowsRejected: 0,
        errorMessage: 'HTTP 404',
      }));
      expect(repository.storeHistoricalBulk).not.toHaveBeenCalled();
    } finally {
      global.fetch = previousFetch;
    }
  });




  it('fails closed for legacy catalog syncAll without provider workers or repository scans', async () => {
    const lastCheckedAt = new Date(Date.now() - 5 * 60_000).toISOString();
    const repository = {
      listActiveStockSyncTasks: jest.fn().mockResolvedValue([{ id: 'stock-1', symbol: 'AAPL', lastSuccessfulDataLoadTimestamp: null }]),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue(null),
      getSyncState: jest.fn().mockResolvedValue({
        status: 'SYNCED',
        lastCheckedAt,
      }),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.syncAll(1, 1, 0, { region: 'GLOBAL', assetType: 'STOCK' });

    expect(result).toMatchObject({
      success: false,
      noNewData: true,
      message: expect.stringContaining('External Yahoo/yfinance and Angel One provider paths are disabled'),
      providerFetchSkippedCount: 0,
      skippedReasonCounts: { EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY: 1 },
    });
    expect(repository.listActiveStockSyncTasks).not.toHaveBeenCalled();
    expect(repository.getSyncState).not.toHaveBeenCalled();
  });

  it('starts catalog sync runs quickly with hard caps and no immediate provider loop', async () => {
    resetCatalogSyncRuns();
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((() => 0) as any);
    const repository = {
      countActiveStockSyncTasks: jest.fn().mockResolvedValue(2916),
      listActiveStockSyncTasks: jest.fn(),
      upsertSyncState: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const ingestSpy = jest.spyOn(service, 'ingestSymbol');

    try {
      const result = await service.startCatalogSyncRun({
        region: 'IN',
        assetType: 'STOCK',
        batchSize: 500,
        workerCount: 10,
        workerConcurrency: 9,
        delayBetweenBatchesMs: 100,
        maxBatches: 500,
      });

      expect(result).toMatchObject({
        success: true,
        status: 'RUNNING',
        region: 'IN',
        assetType: 'STOCK',
        batchSize: 50,
        workerCount: 2,
        workerConcurrency: 3,
        delayBetweenBatchesMs: 1000,
        maxBatches: 100,
        totalCount: 2916,
        processedCount: 0,
      });
      expect(result.runId).toMatch(/^catalog-sync-/);
      expect(result.warningCount).toBeGreaterThanOrEqual(5);
      expect(repository.listActiveStockSyncTasks).not.toHaveBeenCalled();
      expect(ingestSpy).not.toHaveBeenCalled();
    } finally {
      timeoutSpy.mockRestore();
      resetCatalogSyncRuns();
    }
  });

  it('returns the active same-scope catalog sync run instead of starting overlap', async () => {
    resetCatalogSyncRuns();
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((() => 0) as any);
    const repository = {
      countActiveStockSyncTasks: jest.fn().mockResolvedValue(3),
      listActiveStockSyncTasks: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    try {
      const first = await service.startCatalogSyncRun({ region: 'IN', assetType: 'STOCK' });
      const second = await service.startCatalogSyncRun({ region: 'IN', assetType: 'STOCK' });

      expect(second).toMatchObject({
        runId: first.runId,
        status: 'RUNNING',
        alreadyRunning: true,
        message: 'A catalog sync is already running for IN/STOCK.',
      });
      expect(repository.countActiveStockSyncTasks).toHaveBeenCalledTimes(1);
    } finally {
      timeoutSpy.mockRestore();
      resetCatalogSyncRuns();
    }
  });

  it('processes only bounded catalog sync batches and reports partial progress/errors', async () => {
    resetCatalogSyncRuns();
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((() => 0) as any);
    const tasks = [
      { id: 'stock-1', symbol: 'AAA', providerSymbol: 'AAA', lastSuccessfulDataLoadTimestamp: null },
      { id: 'stock-2', symbol: 'BBB', providerSymbol: 'BBB', lastSuccessfulDataLoadTimestamp: null },
      { id: 'stock-3', symbol: 'CCC', providerSymbol: 'CCC', lastSuccessfulDataLoadTimestamp: null },
    ];
    const repository = {
      countActiveStockSyncTasks: jest.fn().mockResolvedValue(tasks.length),
      listActiveStockSyncTasks: jest.fn().mockImplementation((_options, take, excludeIds = []) =>
        Promise.resolve(tasks.filter((task) => !excludeIds.includes(task.id)).slice(0, take))
      ),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockImplementation((symbol: string) => {
      if (symbol === 'BBB') {
        return Promise.reject(new Error('provider timeout'));
      }
      return Promise.resolve({
        rowsReceived: 3,
        rowsInserted: 2,
        rowsUpdated: 1,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
      });
    });

    try {
      const start = await service.startCatalogSyncRun({
        region: 'IN',
        assetType: 'STOCK',
        batchSize: 2,
        workerCount: 2,
        workerConcurrency: 3,
        delayBetweenBatchesMs: 1000,
        maxBatches: 1,
        force: true,
      });

      await (service as any).processCatalogSyncRun(start.runId);
      const status = service.getCatalogSyncRun(start.runId);

      expect(repository.listActiveStockSyncTasks).toHaveBeenCalledWith(
        { region: 'IN', assetType: 'STOCK' },
        2,
        []
      );
      expect(status).toMatchObject({
        status: 'PARTIAL',
        processedCount: 2,
        succeededCount: 1,
        failedCount: 1,
        batchesExecuted: 1,
        rowsReceived: 3,
        rowsInserted: 2,
        rowsUpdated: 1,
        hasMore: true,
      });
      expect(status?.recentErrors).toEqual([
        expect.objectContaining({ symbol: 'BBB', message: 'provider timeout' }),
      ]);
      expect(repository.upsertSyncState).toHaveBeenCalledWith(expect.objectContaining({
        region: 'IN',
        assetType: 'STOCK',
        scopeType: 'CATALOG',
        status: 'FAILED',
      }));
    } finally {
      timeoutSpy.mockRestore();
      resetCatalogSyncRuns();
    }
  });

  it('continues catalog sync for stale instruments when the region-level latest candle is current', async () => {
    resetCatalogSyncRuns();
    // 13:15 UTC = 18:45 IST — past the NSE finalization grace (≈18:30 IST), so
    // the region's latest completed candle is today (2026-05-18).
    jest.useFakeTimers().setSystemTime(new Date('2026-05-18T13:15:00.000Z'));
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((() => 0) as any);
    const tasks = [
      {
        id: 'stock-1',
        symbol: 'STALE',
        providerSymbol: 'STALE.NS',
        lastSuccessfulDataLoadTimestamp: new Date('2026-05-19T00:00:00.000Z'),
        latestStoredTimestamp: new Date('2026-05-17T00:00:00.000Z'),
      },
    ];
    const repository = {
      countStaleActiveStockSyncTasks: jest.fn().mockResolvedValue(tasks.length),
      listStaleActiveStockSyncTasks: jest.fn().mockResolvedValue(tasks),
      listActiveStockSyncTasks: jest.fn(),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-18'),
      getSyncState: jest.fn().mockResolvedValue({
        status: 'SYNCED',
        // Equal to `now` so the catalog gate stays RECENTLY_SYNCED → the stale
        // catch-up branch runs with providerEndDate = end-of-day(targetTradingDate).
        lastCheckedAt: new Date('2026-05-18T13:15:00.000Z').toISOString(),
      }),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    try {
      const start = await service.startCatalogSyncRun({
        region: 'IN',
        assetType: 'STOCK',
        batchSize: 1,
        maxBatches: 1,
      });

      await (service as any).processCatalogSyncRun(start.runId);
      const status = service.getCatalogSyncRun(start.runId);

      expect(repository.countStaleActiveStockSyncTasks).toHaveBeenCalledWith(
        { region: 'IN', assetType: 'STOCK' },
        '2026-05-18'
      );
      expect(repository.listStaleActiveStockSyncTasks).toHaveBeenCalledWith(
        { region: 'IN', assetType: 'STOCK' },
        '2026-05-18',
        1,
        []
      );
      expect(repository.listActiveStockSyncTasks).not.toHaveBeenCalled();
      expect(service.ingestSymbol).toHaveBeenCalledWith(
        'STALE',
        new Date('2026-05-14T00:00:00.000Z'),
        new Date('2026-05-18T23:59:59.999Z'),
        false,
        expect.objectContaining({
          region: 'IN',
          assetType: 'STOCK',
          skipFreshnessGate: true,
        })
      );
      expect(status).toMatchObject({
        status: 'COMPLETED',
        totalCount: 1,
        processedCount: 1,
        succeededCount: 1,
        rowsInserted: 1,
      });
    } finally {
      timeoutSpy.mockRestore();
      jest.useRealTimers();
      resetCatalogSyncRuns();
    }
  });

  it('marks active catalog sync runs for cancellation without aborting the current batch', async () => {
    resetCatalogSyncRuns();
    const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((() => 0) as any);
    const service = new MarketDataFoundationService({
      countActiveStockSyncTasks: jest.fn().mockResolvedValue(2),
    } as any, {} as any);

    try {
      const start = await service.startCatalogSyncRun({ region: 'IN', assetType: 'STOCK' });
      const canceled = service.cancelCatalogSyncRun(start.runId);

      expect(canceled).toMatchObject({
        runId: start.runId,
        status: 'PARTIAL',
        cancelRequested: true,
        message: 'Cancellation requested. The current batch will finish before the run stops.',
      });
    } finally {
      timeoutSpy.mockRestore();
      resetCatalogSyncRuns();
    }
  });

  it('skips provider fetch before market open for 1D data when latest completed EOD is current', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'RELIANCE', region: 'IN', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: null }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-04'),
      getSyncState: jest.fn().mockResolvedValue(null),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.ingestSymbol('RELIANCE.NS', undefined, new Date('2026-05-05T03:00:00.000Z'));

    expect(provider.fetchHistorical).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      noNewData: true,
      skippedReasonCounts: { BEFORE_MARKET_OPEN: 1 },
    });
  });





  it('skips provider fetch when final daily candle is confirmed', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'RELIANCE', region: 'IN', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: null }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-05'),
      getSyncState: jest.fn().mockResolvedValue({
        status: 'FINAL_CONFIRMED',
        lastCheckedAt: new Date('2026-05-05T10:30:00.000Z').toISOString(),
      }),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.ingestSymbol('RELIANCE.NS', undefined, new Date('2026-05-05T11:00:00.000Z'));

    expect(provider.fetchHistorical).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      noNewData: true,
      skippedReasonCounts: { FINAL_CANDLE_CONFIRMED: 1 },
    });
  });

  it('skips provider fetch on weekends', async () => {
    const repository = {
      findStockBySymbol: jest.fn().mockResolvedValue({ symbol: 'RELIANCE', region: 'IN', assetType: 'STOCK', lastSuccessfulDataLoadTimestamp: null }),
      latestStoredTradingDateForRegion: jest.fn().mockResolvedValue('2026-05-08'),
      getSyncState: jest.fn().mockResolvedValue(null),
      upsertSyncState: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      inferRegion: jest.fn().mockReturnValue({ region: 'IN', exchange: 'NSE' }),
      fetchHistorical: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.ingestSymbol('RELIANCE.NS', undefined, new Date('2026-05-09T06:00:00.000Z'));

    expect(provider.fetchHistorical).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      noNewData: true,
      skippedReasonCounts: { WEEKEND_OR_HOLIDAY: 1 },
    });
  });













  it('enriches missing metadata from provider and manual NSE catalog fields', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForMetadataEnrichment: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-1',
          symbol: 'ABB',
          providerSymbol: 'ABB.NS',
          sourceSymbol: 'ABB',
          name: 'ABB India',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: null,
          industry: null,
          currency: 'INR',
          marketCap: null,
          assetType: 'STOCK',
          isDelisted: false,
          ipoDate: null,
          isin: null,
        }],
      }),
      updateCompanyMasterData,
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        companyName: 'ABB India Limited',
        exchange: 'NSE',
        country: 'India',
        sector: 'Industrials',
        industry: 'Electrical Equipment',
        currency: 'INR',
        marketCap: 1000,
        assetType: 'STOCK',
        isDelisted: false,
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.enrichMetadata({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nABB,ABB India Limited,EQ,INE117A01022,1999-01-01\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
    });

    expect(updateCompanyMasterData).toHaveBeenCalledWith('stock-1', expect.objectContaining({
      sector: 'Industrials',
      industry: 'Electrical Equipment',
      marketCap: 1000,
      isin: 'INE117A01022',
      ipoDate: new Date('1999-01-01T00:00:00.000Z'),
    }));
    expect(result).toMatchObject({
      processedCount: 1,
      metadataEnriched: 1,
      updated: 1,
    });
    expect(result.fieldProvenance?.[0]).toMatchObject({
      sectorSource: 'yahoo',
      industrySource: 'yahoo',
      marketCapSource: 'yahoo',
      isinSource: 'NSE_EQUITY_SECURITIES',
    });
  });

  it('preserves existing metadata when provider enrichment returns null fields', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForMetadataEnrichment: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-2',
          symbol: 'KEEP',
          providerSymbol: 'KEEP.NS',
          sourceSymbol: 'KEEP',
          name: 'Keep Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: 'Financial Services',
          industry: 'Asset Management',
          currency: 'INR',
          marketCap: 5000,
          assetType: 'STOCK',
          isDelisted: false,
          ipoDate: null,
          isin: null,
        }],
      }),
      updateCompanyMasterData,
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        companyName: null,
        exchange: null,
        country: null,
        sector: null,
        industry: null,
        currency: null,
        marketCap: null,
        assetType: null,
        isDelisted: false,
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    await service.enrichMetadata({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nKEEP,Keep Limited,EQ,INEKEEP01010,2000-01-03\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
    });

    expect(updateCompanyMasterData).toHaveBeenCalledWith('stock-2', expect.objectContaining({
      sector: 'Financial Services',
      industry: 'Asset Management',
      marketCap: 5000,
      country: 'India',
      currency: 'INR',
      isin: 'INEKEEP01010',
    }));
  });

  it('does not report metadata enrichment success when missing fields do not improve', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForMetadataEnrichment: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-3',
          symbol: 'NULL',
          providerSymbol: 'NULL.NS',
          sourceSymbol: 'NULL',
          name: 'Null Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: null,
          industry: null,
          currency: 'INR',
          marketCap: null,
          assetType: 'STOCK',
          isDelisted: false,
          ipoDate: null,
          isin: null,
          source: 'catalog',
        }],
      }),
      updateCompanyMasterData,
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        companyName: null,
        exchange: null,
        country: null,
        sector: null,
        industry: null,
        currency: null,
        marketCap: null,
        assetType: null,
        isDelisted: false,
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.enrichMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1, offset: 50 });

    expect(repository.listStocksForMetadataEnrichment).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
    expect(updateCompanyMasterData).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      updated: 0,
      skipped: 1,
      noOp: 1,
      manualRequired: 1,
      providerNotFound: 1,
      nextOffset: null,
      hasMore: false,
    });
  });

  it('treats provider MISSING master data as provider-not-found even when inferred fields exist', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForMetadataEnrichment: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-missing-provider',
          symbol: 'MISS',
          providerSymbol: 'MISS.NS',
          sourceSymbol: 'MISS',
          name: 'Missing Provider Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          sector: null,
          industry: null,
          currency: 'INR',
          marketCap: null,
          assetType: 'STOCK',
          isDelisted: false,
          ipoDate: null,
          isin: null,
          source: 'catalog',
        }],
      }),
      updateCompanyMasterData,
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        companyName: null,
        exchange: 'NSE',
        country: 'India',
        sector: null,
        industry: null,
        currency: 'INR',
        marketCap: null,
        assetType: 'STOCK',
        isDelisted: null,
        dataStatus: 'MISSING',
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.enrichMetadata({ region: 'IN', assetType: 'STOCK' });

    expect(updateCompanyMasterData).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      updated: 0,
      noOp: 1,
      providerNotFound: 1,
      manualRequired: 1,
    });
  });

  it('provider business metadata repair drains past recent no-provider attempts instead of looping', async () => {
    const attempts: Array<{ stockId: string; status: string }> = [];
    const stocks = [
      {
        id: 'stock-no-provider',
        symbol: 'NOPE',
        providerSymbol: 'NOPE.NS',
        name: 'No Provider',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        sector: null,
        industry: null,
        marketCap: null,
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
      },
      {
        id: 'stock-fills',
        symbol: 'FILL',
        providerSymbol: 'FILL.NS',
        name: 'Fill Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        sector: null,
        industry: null,
        marketCap: null,
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
      },
    ];
    const manualStateIds = new Set<string>();
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn(async ({ batchSize }: any) => {
        const available = stocks.filter((item) => !manualStateIds.has(item.id));
        return { total: available.length, stocks: available.slice(0, batchSize) };
      }),
      countStocksForBusinessMetadataRepair: jest.fn(async () => stocks.filter((item) => !manualStateIds.has(item.id)).length),
      countBusinessMetadataRepairStates: jest.fn(async ({ statuses }: any) => statuses.includes('MANUAL_REQUIRED') ? manualStateIds.size : 0),
      recordRepairAttempt: jest.fn(async (input: any) => {
        attempts.push({ stockId: input.stockId, status: input.status });
        return { id: `attempt-${attempts.length}` };
      }),
      upsertRepairState: jest.fn(async (input: any) => {
        if (input.status === 'MANUAL_REQUIRED') manualStateIds.add(input.stockId);
        if (input.status === 'RESOLVED') manualStateIds.delete(input.stockId);
      }),
      updateCompanyMasterData: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn(async (symbol: string) => symbol === 'NOPE.NS'
        ? { dataStatus: 'MISSING', country: 'India', currency: 'INR' }
        : { sector: 'Industrials', industry: 'Electrical Equipment', marketCap: 1000, dataStatus: 'PARTIAL' }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const first = await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });
    const second = await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(first).toMatchObject({
      updated: 0,
      providerNotFound: 1,
      manualRequired: 1,
    });
    expect(second).toMatchObject({
      updated: 1,
      providerBusinessMetadataRepaired: 1,
      fieldsFilled: {
        sector: 1,
        industry: 1,
        marketCap: 1,
      },
    });
    expect(repository.updateCompanyMasterData).toHaveBeenCalledWith('stock-fills', expect.objectContaining({
      sector: 'Industrials',
      industry: 'Electrical Equipment',
      marketCap: 1000,
    }));
    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-no-provider',
      status: 'NO_PROVIDER_DATA',
      manualRequiredReason: expect.any(String),
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-no-provider',
      status: 'MANUAL_REQUIRED',
      repairType: 'PROVIDER_BUSINESS_METADATA',
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-fills',
      status: 'RESOLVED',
      repairType: 'PROVIDER_BUSINESS_METADATA',
    }));
    expect(provider.fetchCompanyMasterData).toHaveBeenCalledTimes(2);
  });

  it('repairs provider business metadata with bounded parallel workers', async () => {
    let activeCalls = 0;
    let maxActiveCalls = 0;
    const stocks = Array.from({ length: 4 }, (_unused, index) => ({
      id: `stock-${index}`,
      symbol: `FAST${index}.NS`,
      providerSymbol: `FAST${index}.NS`,
      name: `Fast ${index}`,
      region: 'IN',
      exchange: 'NSE',
      country: 'India',
      currency: 'INR',
      sector: null,
      industry: null,
      marketCap: null,
      assetType: 'STOCK',
      isActive: true,
      isDelisted: false,
    }));
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue({ total: stocks.length, stocks }),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(0),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
      recordRepairAttempt: jest.fn().mockImplementation(async () => ({ id: `attempt-${repository.recordRepairAttempt.mock.calls.length}` })),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      updateCompanyMasterData: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn(async () => {
        activeCalls += 1;
        maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
        await new Promise((resolve) => setTimeout(resolve, 20));
        activeCalls -= 1;
        return {
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: 1000,
          dataStatus: 'PARTIAL',
        };
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.repairProviderBusinessMetadata({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 4,
      workerConcurrency: 3,
    });

    expect(result.workerConcurrency).toBe(3);
    expect(maxActiveCalls).toBeGreaterThan(1);
    expect(maxActiveCalls).toBeLessThanOrEqual(3);
    expect(provider.fetchCompanyMasterData).toHaveBeenCalledTimes(4);
    expect(repository.updateCompanyMasterData).toHaveBeenCalledTimes(4);
    expect(result).toMatchObject({
      processedCount: 4,
      updated: 4,
      failed: 0,
      providerBusinessMetadataRepaired: 4,
      fieldsFilled: {
        sector: 4,
        industry: 4,
        marketCap: 4,
      },
    });
  });

  it('provider business metadata no-op is not success and is marked manual-required', async () => {
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-noop',
          symbol: 'NOOP',
          providerSymbol: 'NOOP.NS',
          name: 'Noop Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: null,
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
        }],
      }),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(0),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(1),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-noop' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      updateCompanyMasterData: jest.fn(),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        companyName: 'Noop Limited',
        sector: 'Industrials',
        industry: 'Electrical Equipment',
        dataStatus: 'PARTIAL',
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.updateCompanyMasterData).not.toHaveBeenCalled();
    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-noop',
      status: 'NO_FIELDS_FILLED',
      manualRequiredReason: expect.any(String),
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-noop',
      status: 'MANUAL_REQUIRED',
      lastAttemptId: 'attempt-noop',
    }));
    expect(result).toMatchObject({
      updated: 0,
      noOp: 1,
      manualRequired: 1,
      remainingManualRequired: 1,
    });
  });

  it('provider partial business metadata fill is not resolved', async () => {
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-partial',
          symbol: 'PARTIAL',
          providerSymbol: 'PARTIAL.NS',
          name: 'Partial Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          sector: null,
          industry: null,
          marketCap: null,
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
        }],
      }),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(0),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(1),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-partial' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      updateCompanyMasterData: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        sector: 'Industrials',
        dataStatus: 'PARTIAL',
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.updateCompanyMasterData).toHaveBeenCalledWith('stock-partial', expect.objectContaining({
      sector: 'Industrials',
    }));
    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-partial',
      status: 'PARTIAL_SUCCESS',
      manualRequiredReason: expect.stringContaining('industry'),
    }));
    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      manualRequiredReason: expect.stringContaining('marketCap'),
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-partial',
      status: 'MANUAL_REQUIRED',
      manualRequiredReason: expect.stringContaining('industry'),
      resolvedAt: null,
    }));
    expect(result).toMatchObject({
      updated: 1,
      partialSuccess: 1,
      manualRequired: 1,
      fieldsFilled: { sector: 1 },
    });
    expect(result.warnings.join(' ')).toContain('industry');
    expect(result.warnings.join(' ')).toContain('marketCap');
  });

  it('provider full business metadata fill resolves current state', async () => {
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-full',
          symbol: 'FULL',
          providerSymbol: 'FULL.NS',
          name: 'Full Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          sector: null,
          industry: null,
          marketCap: null,
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
        }],
      }),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(0),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-full' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      updateCompanyMasterData: jest.fn().mockResolvedValue({}),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockResolvedValue({
        sector: 'Industrials',
        industry: 'Electrical Equipment',
        marketCap: 1000,
        dataStatus: 'PARTIAL',
      }),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-full',
      status: 'SUCCESS',
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-full',
      status: 'RESOLVED',
      resolvedAt: expect.any(Date),
      nextRetryAt: null,
    }));
  });

  it('provider business metadata errors create retryable state with next retry time', async () => {
    const repository = {
      listStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue({
        total: 1,
        stocks: [{
          id: 'stock-error',
          symbol: 'ERROR',
          providerSymbol: 'ERROR.NS',
          name: 'Error Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          sector: null,
          industry: null,
          marketCap: null,
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
        }],
      }),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(0),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-error' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
      updateCompanyMasterData: jest.fn(),
    };
    const provider = {
      fetchCompanyMasterData: jest.fn().mockRejectedValue(new Error('Yahoo timeout')),
    };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.repairProviderBusinessMetadata({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.updateCompanyMasterData).not.toHaveBeenCalled();
    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-error',
      status: 'FAILED',
      error: 'Yahoo timeout',
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-error',
      status: 'FAILED_RETRYABLE',
      nextRetryAt: expect.any(Date),
      resolvedAt: null,
    }));
    expect(result).toMatchObject({ failed: 1 });
  });

  it('repairs catalog identity from configured catalog rows instead of relying on provider metadata', async () => {
    const repairCatalogIdentityForStock = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'stock-catalog',
        symbol: 'ABB',
        providerSymbol: 'ABB.NS',
        sourceSymbol: 'ABB',
        displaySymbol: 'ABB',
        name: 'ABB India Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        sector: null,
        industry: null,
        currency: 'INR',
        marketCap: null,
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        ipoDate: null,
        isin: null,
        catalogSource: null,
      }]),
      repairCatalogIdentityForStock,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.repairCatalogIdentity({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nABB,ABB India Limited,EQ,INE117A01022,1999-01-01\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      batchSize: 1,
      offset: 0,
    });

    expect(repairCatalogIdentityForStock).toHaveBeenCalledWith('stock-catalog', expect.objectContaining({
      symbol: 'ABB',
      sourceSymbol: 'ABB',
      providerSymbol: 'ABB.NS',
      exchange: 'NSE',
      isin: 'INE117A01022',
      ipoDate: new Date('1999-01-01T00:00:00.000Z'),
      catalogSource: 'NSE_EQUITY_SECURITIES',
    }), expect.any(Object));
    expect(result).toMatchObject({
      processedCount: 1,
      updated: 1,
      catalogIdentityRepaired: 1,
      catalogRowsRead: 1,
      offset: 0,
      fieldsFilled: {
        isin: 1,
        ipoDate: 1,
        catalogSource: 1,
      },
    });
    expect(result.fieldProvenance?.[0]).toMatchObject({
      isinSource: 'NSE_EQUITY_SECURITIES',
      listingDateSource: 'NSE_EQUITY_SECURITIES',
    });
  });

  it('catalog identity repair chooses the exchange-specific matched stock id', async () => {
    const repairCatalogIdentityForStock = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-nse',
          symbol: 'DUP',
          providerSymbol: 'DUP.NS',
          sourceSymbol: 'DUP',
          displaySymbol: 'DUP',
          name: 'Duplicate Limited',
          region: 'IN',
          exchange: 'NSE',
          country: 'India',
          currency: 'INR',
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
          ipoDate: null,
          isin: null,
        },
        {
          id: 'stock-bse',
          symbol: 'DUP.BO',
          providerSymbol: 'DUP.BO',
          sourceSymbol: 'DUP',
          displaySymbol: 'DUP',
          name: 'Duplicate Limited',
          region: 'IN',
          exchange: 'BSE',
          country: 'India',
          currency: 'INR',
          assetType: 'STOCK',
          isActive: true,
          isDelisted: false,
          ipoDate: null,
          isin: null,
        },
      ]),
      repairCatalogIdentityForStock,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.repairCatalogIdentity({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nDUP,Duplicate Limited,EQ,INEDUP01010,2001-01-01\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      batchSize: 1,
    });

    expect(repairCatalogIdentityForStock).toHaveBeenCalledWith('stock-nse', expect.objectContaining({
      symbol: 'DUP',
      exchange: 'NSE',
      isin: 'INEDUP01010',
    }), expect.any(Object));
    expect(result.updated).toBe(1);
  });

  it('repairs NSE SME catalog identity rows with underscore headers', async () => {
    const repairCatalogIdentityForStock = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'stock-sme',
        symbol: 'AATMAJ',
        providerSymbol: 'AATMAJ.NS',
        sourceSymbol: 'AATMAJ',
        displaySymbol: 'AATMAJ',
        name: 'AATMAJ HEALTHCARE LIMITED',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        ipoDate: null,
        isin: null,
      }]),
      repairCatalogIdentityForStock,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.repairCatalogIdentity({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME_OF_COMPANY,SERIES,DATE_OF_LISTING,PAID_UP_VALUE,ISIN_NUMBER,FACE_VALUE\nAATMAJ,AATMAJ HEALTHCARE LIMITED,SM,19-Jun-23,10,INE0OB201016,10\n',
      catalogSource: 'NSE_SME_EQUITY_SECURITIES',
      batchSize: 1,
    });

    expect(repairCatalogIdentityForStock).toHaveBeenCalledWith('stock-sme', expect.objectContaining({
      symbol: 'AATMAJ',
      sourceSymbol: 'AATMAJ',
      providerSymbol: 'AATMAJ.NS',
      exchange: 'NSE',
      isin: 'INE0OB201016',
      ipoDate: new Date('2023-06-19T00:00:00.000Z'),
      catalogSource: 'NSE_SME_EQUITY_SECURITIES',
    }), expect.any(Object));
    expect(result).toMatchObject({
      processedCount: 1,
      updated: 1,
      catalogIdentityRepaired: 1,
      fieldsFilled: {
        isin: 1,
        ipoDate: 1,
      },
    });
  });

  it('repairs catalog listing dates in numeric Indian day-month-year format', async () => {
    const repairCatalogIdentityForStock = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'stock-gspl',
        symbol: 'GSPL',
        providerSymbol: 'GSPL.NS',
        sourceSymbol: 'GSPL',
        displaySymbol: 'GSPL',
        name: 'GUJARAT STATE PETRONET LIMITED',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        ipoDate: null,
        isin: null,
      }]),
      repairCatalogIdentityForStock,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.repairCatalogIdentity({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nGSPL,GUJARAT STATE PETRONET LIMITED,EQ,INE246F01010,16-02-2006\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      batchSize: 1,
    });

    expect(repairCatalogIdentityForStock).toHaveBeenCalledWith('stock-gspl', expect.objectContaining({
      isin: 'INE246F01010',
      ipoDate: new Date('2006-02-16T00:00:00.000Z'),
    }), expect.any(Object));
    expect(result.fieldsFilled).toMatchObject({
      isin: 1,
      ipoDate: 1,
    });
  });

  it('catalog identity repair pages over a stable catalog source list', async () => {
    const repairCatalogIdentityForStock = jest.fn().mockResolvedValue({ action: 'updated', stock: {} });
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'stock-b',
        symbol: 'BBB',
        providerSymbol: 'BBB.NS',
        sourceSymbol: 'BBB',
        displaySymbol: 'BBB',
        name: 'BBB Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        ipoDate: null,
        isin: null,
      }]),
      repairCatalogIdentityForStock,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.repairCatalogIdentity({
      region: 'IN',
      assetType: 'STOCK',
      csvText: [
        'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING',
        'AAA,AAA Limited,EQ,INEAAA01010,1998-01-01',
        'BBB,BBB Limited,EQ,INEBBB01010,1999-01-01',
      ].join('\n'),
      catalogSource: 'NSE_EQUITY_SECURITIES',
      batchSize: 1,
      offset: 1,
    });

    expect(repairCatalogIdentityForStock).toHaveBeenCalledWith('stock-b', expect.objectContaining({ symbol: 'BBB' }), expect.any(Object));
    expect(result).toMatchObject({
      processedCount: 1,
      totalCount: 2,
      offset: 1,
      nextOffset: null,
      matchedExistingRows: 1,
      updated: 1,
    });
  });

  it('catalog identity repair no-ops do not increment updated', async () => {
    const repairCatalogIdentityForStock = jest.fn();
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'stock-full',
        symbol: 'FULL',
        providerSymbol: 'FULL.NS',
        sourceSymbol: 'FULL',
        displaySymbol: 'FULL',
        name: 'Full Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        catalogSource: 'NSE_EQUITY_SECURITIES',
        isActive: true,
        isDelisted: false,
        ipoDate: new Date('1999-01-01T00:00:00.000Z'),
        isin: 'INEFULL01010',
      }]),
      repairCatalogIdentityForStock,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.repairCatalogIdentity({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'SYMBOL,NAME OF COMPANY,SERIES,ISIN,DATE OF LISTING\nFULL,Full Limited,EQ,INEFULL01010,1999-01-01\n',
      catalogSource: 'NSE_EQUITY_SECURITIES',
    });

    expect(repairCatalogIdentityForStock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      updated: 0,
      noOp: 1,
      skipped: 1,
    });
  });

  it('manual metadata import rejects null-equivalent sector and industry values', async () => {
    const updateCompanyMasterData = jest.fn();
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'manual-1',
        symbol: 'MANUAL',
        providerSymbol: 'MANUAL.NS',
        sourceSymbol: 'MANUAL',
        displaySymbol: 'MANUAL',
        name: 'Manual Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        sector: null,
        industry: null,
      }]),
      updateCompanyMasterData,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.importManualMetadata({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'symbol,sector,industry,marketCap\nMANUAL,Unknown,N/A,1000\n',
    });

    expect(updateCompanyMasterData).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(result.warnings[0]).toContain('rejected');
  });

  it('manual metadata import resolves current provider business repair state', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const recordRepairAttempt = jest.fn().mockResolvedValue({ id: 'manual-attempt-1' });
    const upsertRepairState = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'manual-2',
        symbol: 'MANUAL2',
        providerSymbol: 'MANUAL2.NS',
        sourceSymbol: 'MANUAL2',
        displaySymbol: 'MANUAL2',
        name: 'Manual Two Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        sector: null,
        industry: null,
        marketCap: null,
      }]),
      updateCompanyMasterData,
      recordRepairAttempt,
      upsertRepairState,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.importManualMetadata({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'symbol,sector,industry,marketCap\nMANUAL2,Industrials,Electrical Equipment,1000\n',
    });

    expect(updateCompanyMasterData).toHaveBeenCalledWith('manual-2', expect.objectContaining({
      sector: 'Industrials',
      industry: 'Electrical Equipment',
      marketCap: 1000,
    }));
    expect(recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'manual-2',
      repairType: 'MANUAL_METADATA_IMPORT',
      status: 'SUCCESS',
    }));
    expect(upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'manual-2',
      repairType: 'PROVIDER_BUSINESS_METADATA',
      status: 'RESOLVED',
      lastAttemptId: 'manual-attempt-1',
    }));
    expect(result).toMatchObject({
      updated: 1,
      fieldsFilled: {
        sector: 1,
        industry: 1,
        marketCap: 1,
      },
    });
  });

  it('manual metadata import rejects rows without positive marketCap', async () => {
    const updateCompanyMasterData = jest.fn().mockResolvedValue({});
    const recordRepairAttempt = jest.fn().mockResolvedValue({ id: 'manual-attempt-partial' });
    const upsertRepairState = jest.fn().mockResolvedValue({});
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'manual-partial',
        symbol: 'MANUALP',
        providerSymbol: 'MANUALP.NS',
        sourceSymbol: 'MANUALP',
        displaySymbol: 'MANUALP',
        name: 'Manual Partial Limited',
        region: 'IN',
        exchange: 'NSE',
        country: 'India',
        currency: 'INR',
        assetType: 'STOCK',
        isActive: true,
        isDelisted: false,
        sector: null,
        industry: null,
        marketCap: null,
      }]),
      updateCompanyMasterData,
      recordRepairAttempt,
      upsertRepairState,
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.importManualMetadata({
      region: 'IN',
      assetType: 'STOCK',
      csvText: 'symbol,sector,industry,marketCap\nMANUALP,Industrials,Electrical Equipment,0\n',
    });

    expect(updateCompanyMasterData).not.toHaveBeenCalled();
    expect(recordRepairAttempt).not.toHaveBeenCalled();
    expect(upsertRepairState).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      updated: 0,
      failed: 1,
      manualRequired: 1,
    });
    expect(result.warnings.join(' ')).toContain('positive numeric marketCap');
  });

  it('manual metadata template exports only unresolved business metadata rows', async () => {
    const service = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          symbol: 'COMPLETE',
          providerSupportStatus: 'SUPPORTED',
          providerSymbol: 'COMPLETE.NS',
          name: 'Complete Limited',
          exchange: 'NSE',
          isActive: true,
          isDelisted: false,
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: 1000,
        },
        {
          symbol: 'MISSING_SECTOR',
          providerSupportStatus: 'SUPPORTED',
          providerSymbol: 'MISSING_SECTOR.NS',
          name: 'Missing Sector Limited',
          exchange: 'NSE',
          isActive: true,
          isDelisted: false,
          sector: null,
          industry: 'Electrical Equipment',
          marketCap: 1000,
        },
        {
          symbol: 'MISSING_MCAP',
          providerSupportStatus: 'SUPPORTED',
          providerSymbol: 'MISSING_MCAP.NS',
          name: 'Missing Market Cap Limited',
          exchange: 'NSE',
          isActive: true,
          isDelisted: false,
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: null,
        },
      ]),
    } as any, {} as any);

    const result = await service.manualMetadataTemplate({ region: 'IN', assetType: 'STOCK' });

    expect(result.count).toBe(2);
    expect(result.rows.map((row) => row.symbol)).toEqual(['MISSING_SECTOR', 'MISSING_MCAP']);
    expect(result.rows[0].requiredFields).toContain('sector');
    expect(result.rows[1].requiredFields).toContain('marketCap');
    expect(result.csvText).toContain('symbol,providerSymbol,companyName,exchange,currentSector,currentIndustry,currentMarketCap,sector,industry,marketCap,requiredFields,suggestedSource,notes');
  });

  it('plans provider, price, metadata, and manual repair counts', async () => {
    const service = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'UNKNOWN', providerSupportStatus: 'UNKNOWN', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: null, ipoDate: null, providerSymbol: 'UNKNOWN.NS', country: 'India', currency: 'INR' },
        { symbol: 'FAILED', providerSupportStatus: 'VALIDATION_FAILED', isActive: true, isDelisted: false, sector: 'Tech', industry: 'Software', marketCap: 1, isin: 'INE', ipoDate: new Date(), providerSymbol: 'FAILED.NS', sourceSymbol: 'FAILED', displaySymbol: 'FAILED', exchange: 'NSE', catalogSource: 'NSE_EQUITY_SECURITIES', country: 'India', currency: 'INR' },
        { symbol: 'PRICE', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, sector: 'Tech', industry: 'Software', marketCap: 1, isin: 'INE2', ipoDate: new Date(), providerSymbol: 'PRICE.NS', sourceSymbol: 'PRICE', displaySymbol: 'PRICE', exchange: 'NSE', catalogSource: 'NSE_EQUITY_SECURITIES', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['UNKNOWN.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['FAILED.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['PRICE.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(1),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
    } as any, {} as any);

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      providerValidationNeeded: 1,
      retryFailedValidations: 1,
      providerUnknownValidationNeeded: 1,
      providerRetryValidationNeeded: 1,
      providerValidationFailed: 1,
      catalogIdentityRepairNeeded: 1,
      priceBackfillNeeded: 1,
      businessMetadataRepairNeeded: 1,
      businessMetadataAutoRepairable: 1,
      businessMetadataManualRequired: 0,
      businessMetadataRetryBlocked: 0,
      businessMetadataRetryEligible: 0,
      businessMetadataRecentlyAttempted: 0,
      metadataEnrichmentNeeded: 1,
      manualMetadataRequired: 1,
      manualBusinessMetadataRequired: 0,
      missingIsin: 1,
      missingListingDate: 1,
      missingSector: 1,
      missingIndustry: 1,
      missingMarketCap: 1,
      manualSectorIndustryRequired: 1,
    });
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PROVIDER_VALIDATION_RETRY_FAILED_REMAINING', nextAction: 'RETRY_FAILED_PROVIDERS', count: 1 }),
    ]));
  });

  it('normalizes trusted universe repair workbench lanes with bounded IN/STOCK actions', async () => {
    const service = new MarketDataFoundationService({} as any, {} as any);
    jest.spyOn(service, 'reviewReadinessSummary').mockResolvedValue({
      scope: { region: 'IN', assetType: 'STOCK' },
      generatedAt: '2026-05-13T00:00:00.000Z',
      reviewMode: 'NO_REVIEW',
      trustStatus: 'NOT_TRUSTWORTHY',
      userDecision: 'REPAIR_DATA',
      reviewUniverse: {
        catalogCount: 10,
        providerSupportedCount: 3,
        trustedCount: 1,
        targetTradingDate: '2026-05-12',
        requiredDataThroughDate: '2026-05-12',
        storedDataThroughDate: '2026-05-10',
      },
      readinessCounts: {
        priceReady: 1,
        contextReady: 1,
        reviewReady: 1,
        missingLatestPrice: 2,
        staleLatestPrice: 2,
        inadequateHistory: 1,
        missingRecentVolume: 1,
        providerUnknown: 4,
        providerValidationFailedRetryable: 1,
        unsupportedExcluded: 0,
      },
      blockers: [
        {
          category: 'PROVIDER_VALIDATION',
          severity: 'HARD_BLOCKER',
          affectedCount: 5,
          explanation: 'Provider support is not proven.',
          nextActionCode: 'VALIDATE_PROVIDERS',
          nextActionLabel: 'Validate unknown providers',
          boundedRequest: { region: 'IN', assetType: 'STOCK', batchSize: 50 },
        },
        {
          category: 'INSUFFICIENT_TRUSTED_UNIVERSE',
          severity: 'HARD_BLOCKER',
          affectedCount: 99,
          explanation: 'Below minimum trusted universe.',
          nextActionCode: 'REVIEW_REPAIR_PLAN',
          nextActionLabel: 'Review bounded repair plan',
          boundedRequest: { region: 'IN', assetType: 'STOCK', batchSize: 50 },
        },
      ],
      nextAction: {
        code: 'VALIDATE_PROVIDERS',
        label: 'Validate unknown providers',
        boundedRequest: { region: 'IN', assetType: 'STOCK', batchSize: 50 },
      },
      warnings: ['Today Review remains NO_REVIEW.'],
    });
    jest.spyOn(service, 'repairPlan').mockResolvedValue({
      scope: { region: 'IN', assetType: 'STOCK' },
      generatedAt: '2026-05-13T00:00:00.000Z',
      totalCatalogInstruments: 10,
      providerUnknownValidationNeeded: 4,
      providerRetryValidationNeeded: 1,
      providerUnsupportedExcluded: 0,
      providerValidationFailed: 1,
      providerValidationNeeded: 4,
      retryFailedValidations: 1,
      supportedCatalogIdentityRepairNeeded: 2,
      supportedBusinessMetadataRepairNeeded: 3,
      supportedPriceBackfillNeeded: 2,
      unsupportedExcluded: 0,
      catalogIdentityRepairNeeded: 2,
      priceBackfillNeeded: 2,
      businessMetadataRepairNeeded: 3,
      businessMetadataAutoRepairable: 1,
      businessMetadataManualRequired: 1,
      businessMetadataRetryBlocked: 1,
      businessMetadataRetryEligible: 1,
      businessMetadataRecentlyAttempted: 2,
      metadataEnrichmentNeeded: 3,
      manualMetadataRequired: 1,
      manualBusinessMetadataRequired: 1,
      missingIsin: 2,
      missingListingDate: 2,
      missingSector: 1,
      missingIndustry: 1,
      missingMarketCap: 1,
      manualSectorIndustryRequired: 1,
      topActions: [],
      warnings: ['Repair lanes available.'],
      universeSignoff: {
        status: 'FAIL',
        minReviewReadyRequired: 300,
        reviewReadyActual: 1,
        blockers: [],
        nextAction: 'VALIDATE_PROVIDERS',
        downstreamAllowed: false,
      },
    });
    jest.spyOn(service, 'latestRepairRun').mockResolvedValue({
      id: 'run-1',
      scope: { region: 'IN', assetType: 'STOCK' },
      status: 'PARTIAL',
      startedAt: '2026-05-13T01:00:00.000Z',
      completedAt: '2026-05-13T01:01:00.000Z',
      beforeHealth: null,
      afterHealth: null,
      beforeRepairPlan: null,
      afterRepairPlan: null,
      actions: [
        {
          action: 'VALIDATE_PROVIDERS',
          label: 'Validate unknown providers',
          estimatedTotal: 5,
          estimatedBatchCount: 1,
          batchesPlanned: 1,
          batchesExecuted: 1,
          dryRun: false,
          hasMore: false,
          anotherRunNeeded: false,
          totals: { processedCount: 5, updated: 4, skipped: 0, failed: 1, noOp: 0, manualRequired: 0 },
          summaries: [],
          warnings: ['One provider failed.'],
        },
      ],
      summary: {
        actionsRequested: ['VALIDATE_PROVIDERS'],
        batchesExecuted: 1,
        updated: 4,
        skipped: 0,
        failed: 1,
        noOp: 0,
        manualRequired: 0,
      },
      warnings: ['One provider failed.'],
      anotherRunNeeded: true,
      hardBlockersRemaining: [],
      expectedNextAction: 'CATALOG_IDENTITY_REPAIR',
      afterTrustStatus: 'NOT_TRUSTWORTHY',
      universeSignoff: null,
    });

    const result = await service.trustedUniverseRepairWorkbench({ region: 'US', assetType: 'ETF' });

    expect(result.scope).toEqual({ region: 'IN', assetType: 'STOCK' });
    expect(result.recommendedNextLane).toBe('PROVIDER_VALIDATION');
    expect(result.lanes.map((lane) => lane.code)).toEqual([
      'PROVIDER_VALIDATION',
      'PRICE_BACKFILL',
      'STALE_EOD',
      'CATALOG_IDENTITY',
      'PROVIDER_BUSINESS_METADATA',
      'MANUAL_METADATA_IMPORT',
      'INSUFFICIENT_TRUSTED_UNIVERSE',
    ]);
    expect(result.lanes[0]).toMatchObject({
      affectedCount: 5,
      eligibleNowCount: 5,
      retryableFailureCount: 1,
      boundedBatchSize: 50,
      lastRun: {
        id: 'run-1',
        status: 'PARTIAL',
        successCount: 4,
        failureCount: 1,
        skippedCount: 0,
        warningCount: 1,
      },
      nextAction: {
        enabled: true,
        actionCode: 'VALIDATE_PROVIDERS',
        endpoint: '/api/v1/market-data/provider/validate',
        request: { region: 'IN', assetType: 'STOCK', batchSize: 50, offset: 0, queueMode: 'UNKNOWN_FIRST' },
      },
    });
    expect(result.lanes.find((lane) => lane.code === 'MANUAL_METADATA_IMPORT')).toMatchObject({
      manualRequiredCount: 1,
      nextAction: {
        enabled: false,
        disabledReason: 'Requires explicit manual metadata CSV payload.',
      },
    });
    expect(result.lanes.find((lane) => lane.code === 'INSUFFICIENT_TRUSTED_UNIVERSE')).toMatchObject({
      affectedCount: 99,
      nextAction: { enabled: false },
    });
  });

  it('repair plan counts market-cap-only gaps in the manual business metadata path', async () => {
    const service = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          symbol: 'MCAPONLY',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          sector: 'Industrials',
          industry: 'Electrical Equipment',
          marketCap: null,
          isin: 'INE123A01010',
          ipoDate: new Date('2000-01-01T00:00:00.000Z'),
          providerSymbol: 'MCAPONLY.NS',
          sourceSymbol: 'MCAPONLY',
          displaySymbol: 'MCAPONLY',
          exchange: 'NSE',
          catalogSource: 'NSE_EQUITY_SECURITIES',
          country: 'India',
          currency: 'INR',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['MCAPONLY.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(1),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
    } as any, {} as any);

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });
    const manualImportAction = result.topActions.find((item) => item.action === 'MANUAL_METADATA_IMPORT');

    expect(result).toMatchObject({
      businessMetadataRepairNeeded: 1,
      manualBusinessMetadataRequired: 1,
      manualSectorIndustryRequired: 0,
      missingMarketCap: 1,
      missingSector: 0,
      missingIndustry: 0,
    });
    expect(manualImportAction).toMatchObject({ count: 1 });
    expect(result.warnings.join(' ')).toContain('manual business metadata');
    expect(result.warnings.join(' ')).toContain('market cap');
  });

  it('exposes business metadata blocker diagnostics by missing-field set for IN/STOCK supported rows', async () => {
    const service = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'COMPLETE', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, sector: 'Industrials', industry: 'Electrical Equipment', marketCap: 100, isin: 'INE000A01001', ipoDate: new Date('2000-01-01T00:00:00.000Z'), providerSymbol: 'COMPLETE.NS', sourceSymbol: 'COMPLETE', displaySymbol: 'COMPLETE', exchange: 'NSE', catalogSource: 'NSE_EQUITY_SECURITIES', country: 'India', currency: 'INR' },
        { symbol: 'S_ONLY', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, sector: '-', industry: 'Electrical Equipment', marketCap: 100, isin: 'INE000A01002', ipoDate: new Date('2000-01-01T00:00:00.000Z'), providerSymbol: 'S_ONLY.NS', sourceSymbol: 'S_ONLY', displaySymbol: 'S_ONLY', exchange: 'NSE', catalogSource: 'NSE_EQUITY_SECURITIES', country: 'India', currency: 'INR' },
        { symbol: 'I_MCAP', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, sector: 'Industrials', industry: '--', marketCap: 0, isin: 'INE000A01003', ipoDate: new Date('2000-01-01T00:00:00.000Z'), providerSymbol: 'I_MCAP.NS', sourceSymbol: 'I_MCAP', displaySymbol: 'I_MCAP', exchange: 'NSE', catalogSource: 'NSE_EQUITY_SECURITIES', country: 'India', currency: 'INR' },
        { symbol: 'ALL3', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, sector: '  ', industry: null, marketCap: -10, isin: 'INE000A01004', ipoDate: new Date('2000-01-01T00:00:00.000Z'), providerSymbol: 'ALL3.NS', sourceSymbol: 'ALL3', displaySymbol: 'ALL3', exchange: 'NSE', catalogSource: 'NSE_EQUITY_SECURITIES', country: 'India', currency: 'INR' },
        { symbol: 'UNSUPPORTED', providerSupportStatus: 'UNSUPPORTED', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: 'INE000A01005', ipoDate: new Date('2000-01-01T00:00:00.000Z'), providerSymbol: 'UNSUPPORTED.NS', sourceSymbol: 'UNSUPPORTED', displaySymbol: 'UNSUPPORTED', exchange: 'NSE', catalogSource: 'NSE_EQUITY_SECURITIES', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['COMPLETE.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['S_ONLY.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['I_MCAP.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['ALL3.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['UNSUPPORTED.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(3),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
    } as any, {} as any);

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result.businessMetadataBlockerDiagnostics).toEqual({
      requiredFields: ['sector', 'industry', 'marketCap'],
      unresolvedTotal: 3,
      missingSector: 2,
      missingIndustry: 2,
      missingMarketCap: 2,
      byMissingFieldSet: {
        sector: 1,
        'industry+marketCap': 1,
        'sector+industry+marketCap': 1,
      },
    });
  });

  it('omits business metadata blocker diagnostics outside IN/STOCK scope', async () => {
    const service = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'USMISS', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: 0, isin: 'US0000000001', ipoDate: new Date('2000-01-01T00:00:00.000Z'), providerSymbol: 'USMISS', sourceSymbol: 'USMISS', displaySymbol: 'USMISS', exchange: 'NASDAQ', catalogSource: 'LEGACY_DATABASE', country: 'United States', currency: 'USD' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['USMISS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(1),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
    } as any, {} as any);

    const result = await service.repairPlan({ region: 'US', assetType: 'STOCK' });

    expect(result.businessMetadataBlockerDiagnostics).toBeUndefined();
  });

  it('excludes unknown, retry-failed, and unsupported rows from supported metadata and price blockers', async () => {
    const service = new MarketDataFoundationService({
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'UNKNOWN', providerSupportStatus: 'UNKNOWN', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: null, ipoDate: null, providerSymbol: 'UNKNOWN.NS', country: 'India', currency: 'INR' },
        { symbol: 'RETRY', providerSupportStatus: 'VALIDATION_FAILED', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: null, ipoDate: null, providerSymbol: 'RETRY.NS', country: 'India', currency: 'INR' },
        { symbol: 'UNSUPPORTED', providerSupportStatus: 'UNSUPPORTED', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: null, ipoDate: null, providerSymbol: 'UNSUPPORTED.NS', country: 'India', currency: 'INR' },
        { symbol: 'SUPPORTED', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, sector: null, industry: null, marketCap: null, isin: null, ipoDate: null, providerSymbol: 'SUPPORTED.NS', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['UNKNOWN.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['RETRY.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['UNSUPPORTED.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['SUPPORTED.NS', { priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      countStocksForBusinessMetadataRepair: jest.fn().mockResolvedValue(1),
      countBusinessMetadataRepairStates: jest.fn().mockResolvedValue(0),
    } as any, {} as any);

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      providerValidationNeeded: 1,
      retryFailedValidations: 1,
      providerUnsupportedExcluded: 1,
      supportedCatalogIdentityRepairNeeded: 1,
      supportedBusinessMetadataRepairNeeded: 1,
      supportedPriceBackfillNeeded: 1,
      manualBusinessMetadataRequired: 1,
    });
  });

  const reviewReadyStock = (overrides: any = {}) => ({
    symbol: 'READY',
    providerSymbol: 'READY.NS',
    sourceSymbol: 'READY',
    displaySymbol: 'READY',
    name: 'Ready Limited',
    providerSupportStatus: 'SUPPORTED',
    isActive: true,
    isDelisted: false,
    sector: 'Industrials',
    industry: 'Electrical Equipment',
    marketCap: 1000,
    isin: 'INE123A01010',
    ipoDate: new Date('2000-01-01T00:00:00.000Z'),
    exchange: 'NSE',
    catalogSource: 'NSE_EQUITY_SECURITIES',
    country: 'India',
    currency: 'INR',
    region: 'IN',
    assetType: 'STOCK',
    ...overrides,
  });

  const reviewReadyPriceStats = (overrides: any = {}) => ({
    priceHistoryBars: 3820,
    firstPriceDate: '2011-05-12',
    latestPriceDate: latestCompletedTradingDateForRegion('IN'),
    latestVolume: 1000,
    latestAdjustedClose: 100,
    latestClose: 100,
    rollingWindowBars: 252,
    rollingWindowCoveragePercent: 100,
    maxPriceGapDays: 1,
    recentVolumeCoveragePercent: 100,
    adjustedCloseCoveragePercent: 100,
    usesAdjustedCloseFallback: false,
    ...overrides,
  });

  const planServiceForStock = (stockRow: any, priceStats: any) => new MarketDataFoundationService({
    listStocksForUniverseHealth: jest.fn().mockResolvedValue([stockRow]),
    priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([[stockRow.symbol, priceStats]])),
  } as any, {} as any);

  it('signoff fails with provider unknown remaining', async () => {
    const service = planServiceForStock(
      reviewReadyStock({ providerSupportStatus: 'UNKNOWN' }),
      reviewReadyPriceStats({ priceHistoryBars: 0, latestPriceDate: null, latestVolume: null })
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result.universeSignoff).toMatchObject({
      status: 'FAIL',
      downstreamAllowed: false,
      nextAction: 'VALIDATE_PROVIDERS',
    });
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PROVIDER_UNKNOWN_REMAINING', count: 1, required: 0 }),
    ]));
  });

  it('signoff fails with missing business metadata', async () => {
    const service = planServiceForStock(
      reviewReadyStock({ sector: null, industry: 'Electrical Equipment', marketCap: 1000 }),
      reviewReadyPriceStats()
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result.manualBusinessMetadataRequired).toBe(1);
    expect(result.universeSignoff).toMatchObject({
      status: 'FAIL',
      downstreamAllowed: false,
      nextAction: 'PROVIDER_BUSINESS_METADATA_REPAIR',
    });
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'BUSINESS_METADATA_AUTO_REPAIRABLE_REMAINING', count: 1 }),
      expect.objectContaining({ code: 'MANUAL_BUSINESS_METADATA_REQUIRED', count: 1 }),
    ]));
  });

  it('signoff fails with price backfill needed', async () => {
    const service = planServiceForStock(
      reviewReadyStock(),
      reviewReadyPriceStats({ priceHistoryBars: 0, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null })
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result.priceBackfillNeeded).toBe(1);
    expect(result.universeSignoff).toMatchObject({
      status: 'FAIL',
      downstreamAllowed: false,
      nextAction: 'BACKFILL_PRICES',
    });
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PRICE_BACKFILL_REMAINING', count: 1 }),
    ]));
  });

  it('repair plan keeps 15-year history gaps in the backfill queue even when 252-bar readiness passes', async () => {
    const service = planServiceForStock(
      reviewReadyStock(),
      reviewReadyPriceStats({
        priceHistoryBars: 300,
        firstPriceDate: '2020-01-01',
        rollingWindowBars: 252,
        rollingWindowCoveragePercent: 100,
      })
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      priceBackfillNeeded: 1,
      supportedPriceBackfillNeeded: 1,
      historyCoverageIncomplete: 1,
      historyCoverageListingDateMissing: 0,
    });
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('15-year/listing-date daily OHLCV window'),
    ]));
  });

  it('does not treat sparse 15-year boundary rows as complete required history coverage', async () => {
    const service = planServiceForStock(
      reviewReadyStock(),
      reviewReadyPriceStats({
        priceHistoryBars: 300,
        firstPriceDate: '2011-05-12',
        latestPriceDate: latestCompletedTradingDateForRegion('IN'),
        rollingWindowBars: 252,
        rollingWindowCoveragePercent: 100,
      })
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      priceBackfillNeeded: 1,
      historyCoverageIncomplete: 1,
    });
  });

  it('accepts a first stored price shortly after a weekend or holiday 15-year boundary', async () => {
    const latestCompleted = latestCompletedTradingDateForRegion('IN');
    const requiredStart = new Date(`${latestCompleted}T00:00:00.000Z`);
    requiredStart.setUTCFullYear(requiredStart.getUTCFullYear() - 15);
    const firstTradingAfterBoundary = new Date(requiredStart);
    firstTradingAfterBoundary.setUTCDate(firstTradingAfterBoundary.getUTCDate() + 1);
    const service = planServiceForStock(
      reviewReadyStock(),
      reviewReadyPriceStats({
        priceHistoryBars: 3820,
        firstPriceDate: firstTradingAfterBoundary.toISOString().slice(0, 10),
        latestPriceDate: latestCompleted,
        rollingWindowBars: 252,
        rollingWindowCoveragePercent: 100,
      })
    );

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      priceBackfillNeeded: 0,
      historyCoverageIncomplete: 0,
    });
  });

  it('signoff fails when review-ready count is below configured minimum', async () => {
    const service = planServiceForStock(reviewReadyStock(), reviewReadyPriceStats());

    const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(result.universeSignoff).toMatchObject({
      status: 'FAIL',
      downstreamAllowed: false,
      reviewReadyActual: 1,
      minReviewReadyRequired: 300,
    });
    expect(result.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'REVIEW_READY_BELOW_MINIMUM', count: 1, required: 300 }),
    ]));
  });

  it('signoff passes only when every threshold passes', async () => {
    const previousThreshold = process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY;
    process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY = '1';
    try {
      const service = planServiceForStock(reviewReadyStock(), reviewReadyPriceStats());

      const result = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

      expect(result.universeSignoff).toMatchObject({
        status: 'PASS',
        downstreamAllowed: true,
        reviewReadyActual: 1,
        minReviewReadyRequired: 1,
        blockers: [],
        nextAction: null,
      });
    } finally {
      if (previousThreshold === undefined) delete process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY;
      else process.env.MARKET_DATA_SIGNOFF_MIN_REVIEW_READY = previousThreshold;
    }
  });

  it('backfills prices in bounded batches for provider-supported price gaps', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'PRICE', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'PRICE.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['PRICE.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 252,
      rowsInserted: 252,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1, offset: 0 });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    const deepStartDate = ingestCall[1] as Date;
    const cappedEndDate = ingestCall[2] as Date;
    const latestCompletedEod = latestCompletedTradingDateForRegion('IN');
    const expectedDeepStart = new Date(`${latestCompletedEod}T00:00:00.000Z`);
    expectedDeepStart.setUTCFullYear(expectedDeepStart.getUTCFullYear() - 15);
    expect(cappedEndDate.toISOString().slice(0, 10)).toBe(latestCompletedTradingDateForRegion('IN'));
    expect(deepStartDate.toISOString()).toBe(expectedDeepStart.toISOString());
    expect(service.ingestSymbol).toHaveBeenCalledWith('PRICE', deepStartDate, cappedEndDate, false, expect.objectContaining({
      force: false,
      region: 'IN',
      assetType: 'STOCK',
      skipFreshnessGate: true,
      preserveProviderSupportOnZeroRows: true,
    }));
    expect(result).toMatchObject({
      processedCount: 1,
      updated: 1,
      priceRowsReceived: 252,
      priceRowsInserted: 252,
      deepReloaded: 1,
      incrementalCaughtUp: 0,
      latestCompletedEodDate: latestCompletedEod,
      targetEndDate: cappedEndDate.toISOString(),
      remainingCandidates: 1,
      hasMore: true,
      nextOffset: 0,
      stillUnder120: 1,
      stillUnder200: 1,
      stillUnder252: 1,
      historyCoverageIncomplete: 1,
      historyCoverageListingDateMissing: 1,
      requiredHistoryCoverageStatus: 'NEEDS_BACKFILL',
    });
    expect(result.sampleCoverageResults?.[0]).toMatchObject({
      symbol: 'PRICE',
      listingDateMissing: true,
      storedHistoryStartDate: null,
      storedHistoryEndDate: null,
      requiredHistoryComplete: false,
      coverageStatus: 'NEEDS_BACKFILL',
    });
  });

  it('keeps startup incremental-latest backfill from deep-loading history-current gaps', async () => {
    const latestCompleted = latestCompletedTradingDateForRegion('IN') || '2026-05-25';
    const staleDate = new Date(`${latestCompleted}T00:00:00.000Z`);
    staleDate.setUTCDate(staleDate.getUTCDate() - 1);
    const staleLatest = staleDate.toISOString().slice(0, 10);
    const stocks = [
      { id: 'deep-only-id', symbol: 'DEEPONLY', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'DEEPONLY.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
      { id: 'stale-id', symbol: 'STALE', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'STALE.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
    ];
    const repository = {
      listStocksForUniverseHealth: jest.fn()
        .mockResolvedValueOnce(stocks)
        .mockResolvedValueOnce([stocks[0]]),
      priceReadinessStatsForSymbols: jest.fn()
        .mockResolvedValueOnce(new Map([
          ['DEEPONLY.NS', { priceHistoryBars: 120, firstPriceDate: null, latestPriceDate: latestCompleted, latestVolume: 100, latestAdjustedClose: 100, latestClose: 100 }],
          ['STALE.NS', { priceHistoryBars: 4000, firstPriceDate: '2010-01-01', latestPriceDate: staleLatest, latestVolume: 100, latestAdjustedClose: 100, latestClose: 100 }],
        ]))
        .mockResolvedValueOnce(new Map([
          ['DEEPONLY.NS', { priceHistoryBars: 120, firstPriceDate: null, latestPriceDate: latestCompleted, latestVolume: 100, latestAdjustedClose: 100, latestClose: 100 }],
        ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 1,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.backfillPrices({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 10,
      policy: 'INCREMENTAL_LATEST_ONLY',
    });

    expect(service.ingestSymbol).toHaveBeenCalledTimes(1);
    expect((service.ingestSymbol as jest.Mock).mock.calls[0][0]).toBe('STALE');
    expect(result).toMatchObject({
      processedCount: 1,
      incrementalCaughtUp: 1,
      deepReloaded: 0,
      processedStockIds: ['stale-id'],
      remainingCandidates: 0,
      hasMore: false,
    });
  });

  it('uses one official NSE EOD bulk file for the full incremental latest price queue before provider fallback', async () => {
    const previousFlag = process.env.MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED;
    const previousFetch = global.fetch;
    process.env.MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED = 'true';
    const latestCompleted = latestCompletedTradingDateForRegion('IN') || '2026-05-25';
    const [year, month, day] = latestCompleted.split('-');
    const staleDate = new Date(`${latestCompleted}T00:00:00.000Z`);
    staleDate.setUTCDate(staleDate.getUTCDate() - 1);
    const staleLatest = staleDate.toISOString().slice(0, 10);
    const csvText = [
      'SYMBOL,SERIES,DATE1,OPEN_PRICE,HIGH_PRICE,LOW_PRICE,CLOSE_PRICE,TTL_TRD_QNTY',
      `RELIANCE,EQ,${day}-${month}-${year},100,110,95,108,1000`,
      `TCS,EQ,${day}-${month}-${year},200,220,195,218,2000`,
    ].join('\n');
    const payload = Buffer.from(csvText);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (name: string) => (name.toLowerCase() === 'content-length' ? String(payload.length) : null) },
      arrayBuffer: async () => payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
    }) as any;

    const repository = {
      listStocksForUniverseHealth: jest.fn()
        .mockResolvedValueOnce([
          {
            id: 'reliance-id',
            symbol: 'RELIANCE',
            providerSymbol: 'RELIANCE.NS',
            sourceSymbol: 'RELIANCE',
            displaySymbol: 'RELIANCE',
            exchange: 'NSE',
            providerSupportStatus: 'SUPPORTED',
            isActive: true,
            isDelisted: false,
            sector: 'Energy',
            industry: 'Oil & Gas',
            country: 'India',
            currency: 'INR',
          },
          {
            id: 'tcs-id',
            symbol: 'TCS',
            providerSymbol: 'TCS.NS',
            sourceSymbol: 'TCS',
            displaySymbol: 'TCS',
            exchange: 'NSE',
            providerSupportStatus: 'SUPPORTED',
            isActive: true,
            isDelisted: false,
            sector: 'Technology',
            industry: 'IT Services',
            country: 'India',
            currency: 'INR',
          },
        ])
        .mockResolvedValueOnce([]),
      priceReadinessStatsForSymbols: jest.fn()
        .mockResolvedValueOnce(new Map([
          ['RELIANCE', { priceHistoryBars: 4000, firstPriceDate: '2010-01-01', latestPriceDate: staleLatest, latestVolume: 100, latestAdjustedClose: 100, latestClose: 100 }],
          ['TCS', { priceHistoryBars: 4000, firstPriceDate: '2010-01-01', latestPriceDate: staleLatest, latestVolume: 200, latestAdjustedClose: 200, latestClose: 200 }],
        ]))
        .mockResolvedValueOnce(new Map()),
      updateStockLoadTimestampBySymbol: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const storeHistorical = jest.spyOn(service, 'storeHistorical').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 1,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });
    const ingestSymbol = jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 1,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    try {
      const result = await service.backfillPrices({
        region: 'IN',
        assetType: 'STOCK',
        batchSize: 1,
        policy: 'INCREMENTAL_LATEST_ONLY',
      });

      expect(storeHistorical).toHaveBeenCalledWith([
        expect.objectContaining({
          symbol: 'RELIANCE',
          source: 'NSE_SECURITY_BHAVDATA',
          date: new Date(`${latestCompleted}T00:00:00.000Z`),
        }),
      ]);
      expect(storeHistorical).toHaveBeenCalledWith([
        expect.objectContaining({
          symbol: 'TCS',
          source: 'NSE_SECURITY_BHAVDATA',
          date: new Date(`${latestCompleted}T00:00:00.000Z`),
        }),
      ]);
      expect(repository.updateStockLoadTimestampBySymbol).toHaveBeenCalledWith('RELIANCE');
      expect(repository.updateStockLoadTimestampBySymbol).toHaveBeenCalledWith('TCS');
      expect(ingestSymbol).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        processedCount: 2,
        updated: 2,
        priceRowsUpdated: 2,
        processedStockIds: ['reliance-id', 'tcs-id'],
        remainingCandidates: 0,
        hasMore: false,
        officialEodBulk: {
          attempted: true,
          sourceName: 'NSE_SECURITY_BHAVDATA',
          matchedInstruments: 2,
        },
      });
    } finally {
      if (previousFlag === undefined) delete process.env.MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED;
      else process.env.MARKET_DATA_NSE_OFFICIAL_EOD_BULK_ENABLED = previousFlag;
      global.fetch = previousFetch;
    }
  });


  it('skips already-attempted price backfill stock ids so background runs keep draining', async () => {
    const stocks = [
      { id: 'done-id', symbol: 'DONE', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'DONE.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
      { id: 'next-id', symbol: 'NEXT', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'NEXT.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
    ];
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue(stocks),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map(stocks.map((stock) => [
        stock.symbol,
        { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null },
      ]))),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 1,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.backfillPrices({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 1,
      excludeStockIds: ['done-id'],
    });

    expect(service.ingestSymbol).toHaveBeenCalledTimes(1);
    expect((service.ingestSymbol as jest.Mock).mock.calls[0][0]).toBe('NEXT');
    expect(result).toMatchObject({
      processedCount: 1,
      processedStockIds: ['next-id'],
      remainingCandidates: 0,
      hasMore: false,
    });
  });

  it('requires explicit force or fullReload for forced price backfill', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'FORCE', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'FORCE.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['FORCE.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });
    await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1, force: true });
    await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1, fullReload: true });

    expect((service.ingestSymbol as jest.Mock).mock.calls[0][4]).toMatchObject({ force: false });
    expect((service.ingestSymbol as jest.Mock).mock.calls[1][4]).toMatchObject({ force: true });
    expect((service.ingestSymbol as jest.Mock).mock.calls[2][4]).toMatchObject({ force: true });
  });

  it('runs price backfill with bounded worker concurrency', async () => {
    const originalThrottle = process.env.MARKET_DATA_PRICE_BACKFILL_PROVIDER_THROTTLE_MS;
    process.env.MARKET_DATA_PRICE_BACKFILL_PROVIDER_THROTTLE_MS = '1250';
    const stocks = ['AAA.NS', 'BBB.NS', 'CCC.NS'].map((symbol) => ({
      symbol,
      providerSupportStatus: 'SUPPORTED',
      isActive: true,
      isDelisted: false,
      providerSymbol: symbol,
      sector: 'Tech',
      industry: 'Software',
      country: 'India',
      currency: 'INR',
    }));
    const repository = {
      listStocksForUniverseHealth: jest.fn()
        .mockResolvedValueOnce(stocks)
        .mockResolvedValueOnce([]),
      priceReadinessStatsForSymbols: jest.fn()
        .mockResolvedValueOnce(new Map(stocks.map((stock) => [
          stock.symbol,
          { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null },
        ])))
        .mockResolvedValueOnce(new Map()),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const throttleSpy = jest.spyOn(service as any, 'throttleIngestion').mockResolvedValue(undefined);
    let active = 0;
    let maxActive = 0;
    jest.spyOn(service, 'ingestSymbol').mockImplementation(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active -= 1;
      return {
        rowsReceived: 10,
        rowsInserted: 10,
        rowsUpdated: 0,
        rowsSkipped: 0,
        rowsNoOp: 0,
        warningCount: 0,
        warnings: [],
      };
    });

    const result = await service.backfillPrices({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 3,
      workerConcurrency: 2,
    });

    expect(maxActive).toBe(2);
    expect(result.workerConcurrency).toBe(2);
    expect(result.providerThrottleMs).toBe(1250);
    expect(result.processedCount).toBe(3);
    expect(result.updated).toBe(3);
    expect(throttleSpy).toHaveBeenCalledTimes(3);
    expect(throttleSpy).toHaveBeenCalledWith(1250);
    if (originalThrottle === undefined) {
      delete process.env.MARKET_DATA_PRICE_BACKFILL_PROVIDER_THROTTLE_MS;
    } else {
      process.env.MARKET_DATA_PRICE_BACKFILL_PROVIDER_THROTTLE_MS = originalThrottle;
    }
  });

  it('deep-backfills shallow supported rows without operator fullReload despite recent load timestamp', async () => {
    const latestCompletedEod = latestCompletedTradingDateForRegion('IN');
    const repository = {
      listStocksForUniverseHealth: jest.fn()
        .mockResolvedValueOnce([
          {
            symbol: 'SHALLOW',
            providerSupportStatus: 'SUPPORTED',
            isActive: true,
            isDelisted: false,
            providerSymbol: 'SHALLOW.NS',
            lastSuccessfulDataLoadTimestamp: new Date('2026-05-11T00:00:00.000Z'),
            sector: 'Tech',
            industry: 'Software',
            country: 'India',
            currency: 'INR',
          },
        ])
        .mockResolvedValueOnce([]),
      priceReadinessStatsForSymbols: jest.fn()
        .mockResolvedValueOnce(new Map([
          ['SHALLOW.NS', { priceHistoryBars: 20, firstPriceDate: '2026-04-15', latestPriceDate: '2026-05-11', latestVolume: 100, latestAdjustedClose: null, latestClose: 10, rollingWindowBars: 20, recentVolumeCoveragePercent: 100 }],
        ]))
        .mockResolvedValueOnce(new Map()),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 300,
      rowsInserted: 280,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 20,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1, fullReload: false });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    const startDate = ingestCall[1] as Date;
    const expectedDeepStart = new Date(`${latestCompletedEod}T00:00:00.000Z`);
    expectedDeepStart.setUTCFullYear(expectedDeepStart.getUTCFullYear() - 15);
    expect(startDate.toISOString()).toBe(expectedDeepStart.toISOString());
    expect(ingestCall[3]).toBe(false);
    expect(result).toMatchObject({
      deepReloaded: 1,
      incrementalCaughtUp: 0,
      remainingCandidates: 0,
      stillUnder120: 0,
      stillUnder200: 0,
      stillUnder252: 0,
    });
  });

  it('uses listing date as the deep backfill start for companies listed less than 15 years', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn()
        .mockResolvedValueOnce([
          {
            symbol: 'YOUNG',
            providerSupportStatus: 'SUPPORTED',
            isActive: true,
            isDelisted: false,
            providerSymbol: 'YOUNG.NS',
            ipoDate: new Date('2020-08-10T00:00:00.000Z'),
            sector: 'Tech',
            industry: 'Software',
            country: 'India',
            currency: 'INR',
          },
        ])
        .mockResolvedValueOnce([]),
      priceReadinessStatsForSymbols: jest.fn()
        .mockResolvedValueOnce(new Map([
          ['YOUNG.NS', { priceHistoryBars: 252, firstPriceDate: '2021-01-01', latestPriceDate: latestCompletedTradingDateForRegion('IN'), latestVolume: 100, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
        ]))
        .mockResolvedValueOnce(new Map()),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 10,
      rowsInserted: 10,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    const startDate = ingestCall[1] as Date;
    expect(startDate.toISOString()).toBe('2020-08-10T00:00:00.000Z');
    expect(result).toMatchObject({
      deepReloaded: 1,
      historyCoverageIncomplete: 0,
      historyCoverageListingDateMissing: 0,
    });
    expect(result.sampleCoverageResults?.[0]).toMatchObject({
      symbol: 'YOUNG',
      requiredHistoryStartDate: '2020-08-10',
      listingDate: '2020-08-10',
      storedHistoryStartDate: '2021-01-01',
      requiredHistoryComplete: false,
    });
  });


  it('records Yahoo zero-row price backfill as manual official fallback required', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-empty',
          symbol: 'EMPTY',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'EMPTY.NS',
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['EMPTY.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listBlockedPriceBackfillStockIds: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['stock-empty']),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-empty' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 0,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 1,
      warnings: ['Provider returned zero usable historical price rows.'],
    });

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-empty',
      repairType: 'PRICE_BACKFILL',
      status: 'YAHOO_ZERO_ROWS',
      provider: 'yahoo',
      manualRequiredReason: expect.stringContaining('official/public exchange fallback'),
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-empty',
      repairType: 'PRICE_BACKFILL',
      status: 'MANUAL_REQUIRED',
      provider: 'yahoo',
      lastAttemptId: 'attempt-empty',
      manualRequiredReason: expect.stringContaining('official/public exchange fallback'),
      nextRetryAt: null,
    }));
    expect(result).toMatchObject({
      zeroRowProviderReturns: 1,
      historyCoverageFallbackRequired: 1,
      remainingCandidates: 0,
      hasMore: false,
    });
  });

  it('records Yahoo provider-error price backfill as retryable repair state', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-error',
          symbol: 'ERROR',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'ERROR.NS',
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['ERROR.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listBlockedPriceBackfillStockIds: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['stock-error']),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-error' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockRejectedValue(new Error('provider timeout'));

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-error',
      repairType: 'PRICE_BACKFILL',
      status: 'YAHOO_PROVIDER_ERROR',
      provider: 'yahoo',
      error: 'provider timeout',
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-error',
      repairType: 'PRICE_BACKFILL',
      status: 'FAILED_RETRYABLE',
      provider: 'yahoo',
      lastAttemptId: 'attempt-error',
      error: 'provider timeout',
      nextRetryAt: expect.any(Date),
    }));
    expect(result).toMatchObject({
      failed: 1,
      historyCoverageFallbackRequired: 1,
      remainingCandidates: 0,
      hasMore: false,
    });
  });

  it('records Angel One token misses as manual symbol lifecycle review instead of retryable fetch failures', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-token-miss',
          symbol: 'TOKENMISS',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'TOKENMISS.NS',
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['TOKENMISS.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listBlockedPriceBackfillStockIds: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['stock-token-miss']),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-token-miss' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockRejectedValue(new Error('Angel One scrip master token not found for TOKENMISS.NS.'));

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-token-miss',
      repairType: 'PRICE_BACKFILL',
      status: 'ANGEL_ONE_TOKEN_NOT_FOUND',
      manualRequiredReason: expect.stringContaining('broker-symbol mapping'),
      error: 'Angel One scrip master token not found for TOKENMISS.NS.',
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-token-miss',
      repairType: 'PRICE_BACKFILL',
      status: 'MANUAL_REQUIRED',
      lastAttemptId: 'attempt-token-miss',
      nextRetryAt: null,
    }));
    expect(result).toMatchObject({
      failed: 0,
      manualRequired: 1,
      historyCoverageFallbackRequired: 1,
      remainingCandidates: 0,
      hasMore: false,
    });
  });

  it('records Yahoo rate limits as retryable cooldown instead of fallback-required missing data', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-rate',
          symbol: 'RATE',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'RATE.NS',
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['RATE.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listBlockedPriceBackfillStockIds: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['stock-rate']),
      recordRepairAttempt: jest.fn().mockResolvedValue({ id: 'attempt-rate' }),
      upsertRepairState: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockRejectedValue(new Error('Edge: Too Many Requests'));

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect(repository.recordRepairAttempt).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-rate',
      repairType: 'PRICE_BACKFILL',
      status: 'YAHOO_RATE_LIMITED',
      provider: 'yahoo',
      error: 'Edge: Too Many Requests',
      manualRequiredReason: null,
    }));
    expect(repository.upsertRepairState).toHaveBeenCalledWith(expect.objectContaining({
      stockId: 'stock-rate',
      repairType: 'PRICE_BACKFILL',
      status: 'FAILED_RETRYABLE',
      provider: 'yahoo',
      lastAttemptId: 'attempt-rate',
      error: 'Edge: Too Many Requests',
      manualRequiredReason: null,
      nextRetryAt: expect.any(Date),
    }));
    expect(result).toMatchObject({
      failed: 1,
      providerRetryableFailures: 1,
      historyCoverageFallbackRequired: 0,
      remainingCandidates: 0,
      hasMore: false,
    });
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('rate limit hit'),
    ]));
    expect(result.sampleCoverageResults?.[0]).toMatchObject({
      symbol: 'RATE',
      sourceFallbackReason: 'YAHOO_RATE_LIMITED',
    });
  });

  it('skips blocked price backfill rows so supported candidates can keep draining', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-blocked',
          symbol: 'BLOCKED',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'BLOCKED.NS',
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
        },
        {
          id: 'stock-next',
          symbol: 'NEXT',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'NEXT.NS',
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['BLOCKED.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['NEXT.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listBlockedPriceBackfillStockIds: jest.fn().mockResolvedValue(['stock-blocked']),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    expect((service.ingestSymbol as jest.Mock).mock.calls.map((call) => call[0])).toEqual(['NEXT']);
  });

  it('allows forced price backfill to retry cooldown rows while still excluding manual-required rows', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-manual',
          symbol: 'MANUAL',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'MANUAL.NS',
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
          ipoDate: new Date('2020-01-01T00:00:00.000Z'),
        },
        {
          id: 'stock-retry',
          symbol: 'RETRY',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'RETRY.NS',
          sector: 'Tech',
          industry: 'Software',
          country: 'India',
          currency: 'INR',
          ipoDate: new Date('2020-01-01T00:00:00.000Z'),
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['MANUAL.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
        ['RETRY.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listBlockedPriceBackfillStockIds: jest.fn(async (options: any) => (
        options.includeRetryable ? ['stock-manual'] : ['stock-manual', 'stock-retry']
      )),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 1,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1, force: true });

    expect(repository.listBlockedPriceBackfillStockIds).toHaveBeenCalledWith(expect.objectContaining({
      includeRetryable: true,
    }));
    expect((service.ingestSymbol as jest.Mock).mock.calls.map((call) => call[0])).toEqual(['RETRY']);
  });

  it('keeps blocked price fallback rows out of the automatic backfill action count', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-blocked',
          symbol: 'BLOCKED',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'BLOCKED.NS',
          sector: 'Tech',
          industry: 'Software',
          marketCap: 100000000,
          country: 'India',
          currency: 'INR',
          isin: 'INE000A01000',
          ipoDate: new Date('2020-01-01T00:00:00.000Z'),
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['BLOCKED.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listBlockedPriceBackfillStockIds: jest.fn().mockResolvedValue(['stock-blocked']),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const plan = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(plan).toMatchObject({
      supportedPriceBackfillNeeded: 0,
      priceBackfillNeeded: 0,
      historyCoverageFallbackRequired: 1,
    });
    expect(plan.topActions.map((action) => action.action)).not.toContain('BACKFILL_PRICES');
    expect(plan.universeSignoff.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'PRICE_BACKFILL_FALLBACK_REQUIRED',
        nextAction: null,
      }),
    ]));
  });

  it('does not count retry-cooling price rows as fallback-required in repair plan', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        {
          id: 'stock-rate',
          symbol: 'RATE',
          providerSupportStatus: 'SUPPORTED',
          isActive: true,
          isDelisted: false,
          providerSymbol: 'RATE.NS',
          sector: 'Tech',
          industry: 'Software',
          marketCap: 100000000,
          country: 'India',
          currency: 'INR',
          isin: 'INE000A01000',
          ipoDate: new Date('2020-01-01T00:00:00.000Z'),
        },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['RATE.NS', { priceHistoryBars: 0, firstPriceDate: null, latestPriceDate: null, latestVolume: null, latestAdjustedClose: null, latestClose: null }],
      ])),
      listRepairStatesForStocks: jest.fn().mockResolvedValue(new Map([
        ['stock-rate', [{ repairType: 'PRICE_BACKFILL', status: 'FAILED_RETRYABLE', nextRetryAt: new Date(Date.now() + 60 * 60 * 1000) }]],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const plan = await service.repairPlan({ region: 'IN', assetType: 'STOCK' });

    expect(plan).toMatchObject({
      supportedPriceBackfillNeeded: 0,
      priceBackfillNeeded: 0,
      historyCoverageFallbackRequired: 0,
    });
    expect(plan.topActions.map((action) => action.action)).not.toContain('BACKFILL_PRICES');
    expect(plan.universeSignoff.blockers).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PRICE_BACKFILL_FALLBACK_REQUIRED' }),
      expect.objectContaining({ code: 'PRICE_BACKFILL_REMAINING' }),
    ]));
  });

  it('uses incremental catch-up for stale rows that already have complete required history coverage', async () => {
    const latestCompletedEod = latestCompletedTradingDateForRegion('IN')!;
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'STALE', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'STALE.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['STALE.NS', { priceHistoryBars: 3820, firstPriceDate: '2011-05-12', latestPriceDate: '2026-01-01', latestVolume: 100, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 5,
      rowsInserted: 5,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    const result = await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1 });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    const startDate = ingestCall[1] as Date;
    const expectedStart = new Date(`${latestCompletedEod}T00:00:00.000Z`);
    expectedStart.setUTCDate(expectedStart.getUTCDate() - 30);
    expect(startDate.toISOString()).toBe(expectedStart.toISOString());
    expect(result).toMatchObject({ deepReloaded: 0, incrementalCaughtUp: 1 });
  });

  it('forces deep repair for all selected candidates when fullReload is true', async () => {
    const latestCompletedEod = latestCompletedTradingDateForRegion('IN')!;
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'FORCE', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'FORCE.NS', sector: 'Tech', industry: 'Software', country: 'India', currency: 'INR' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['FORCE.NS', { priceHistoryBars: 300, latestPriceDate: '2026-01-01', latestVolume: 100, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: 252, rollingWindowCoveragePercent: 100, recentVolumeCoveragePercent: 100 }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 1,
      rowsSkipped: 0,
      rowsNoOp: 0,
      warningCount: 0,
      warnings: [],
    });

    await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 1, fullReload: true });

    const ingestCall = (service.ingestSymbol as jest.Mock).mock.calls[0];
    const expectedDeepStart = new Date(`${latestCompletedEod}T00:00:00.000Z`);
    expectedDeepStart.setUTCFullYear(expectedDeepStart.getUTCFullYear() - 15);
    expect((ingestCall[1] as Date).toISOString()).toBe(expectedDeepStart.toISOString());
    expect(ingestCall[3]).toBe(true);
  });

  it('orders price backfill candidates by missing latest, shallow depth, stale latest, then symbol', async () => {
    const rows = [
      ['STALE.NS', 300, '2026-01-01'],
      ['U230.NS', 230, '2026-05-11'],
      ['MISSING.NS', 0, null],
      ['U180.NS', 180, '2026-05-11'],
      ['U119.NS', 119, '2026-05-11'],
    ] as const;
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue(rows.map(([symbol]) => ({
        symbol,
        providerSupportStatus: 'SUPPORTED',
        isActive: true,
        isDelisted: false,
        providerSymbol: symbol,
        sector: 'Tech',
        industry: 'Software',
        country: 'India',
        currency: 'INR',
      }))),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map(rows.map(([symbol, bars, latestPriceDate]) => [
        symbol,
        { priceHistoryBars: bars, latestPriceDate, latestVolume: 100, latestAdjustedClose: 10, latestClose: 10, rollingWindowBars: Math.min(bars, 252), rollingWindowCoveragePercent: Math.min(100, (bars / 252) * 100), recentVolumeCoveragePercent: 100 },
      ]))),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'ingestSymbol').mockResolvedValue({
      rowsReceived: 1,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsSkipped: 0,
      rowsNoOp: 1,
      warningCount: 0,
      warnings: [],
    });

    await service.backfillPrices({ region: 'IN', assetType: 'STOCK', batchSize: 5 });

    expect((service.ingestSymbol as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      'MISSING.NS',
      'U119.NS',
      'U180.NS',
      'U230.NS',
      'STALE.NS',
    ]);
  });

  it('skips provider fetch and reports MARKET_CALENDAR_UNCERTAIN when no latest completed EOD is available', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        { symbol: 'GLOBAL', providerSupportStatus: 'SUPPORTED', isActive: true, isDelisted: false, providerSymbol: 'GLOBAL', sector: 'Tech', industry: 'Software', country: 'US', currency: 'USD' },
      ]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['GLOBAL', { priceHistoryBars: 20, latestPriceDate: '2026-05-11', latestVolume: 100, latestAdjustedClose: null, latestClose: 10, rollingWindowBars: 20, recentVolumeCoveragePercent: 100 }],
      ])),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const ingestSpy = jest.spyOn(service, 'ingestSymbol');

    const result = await service.backfillPrices({ region: 'GLOBAL', assetType: 'STOCK', batchSize: 1 });

    expect(ingestSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      processedCount: 0,
      latestCompletedEodDate: null,
      remainingCandidates: 1,
      stillUnder120: 1,
      stillUnder200: 1,
      stillUnder252: 1,
    });
    expect(result.warnings.join('\n')).toContain('MARKET_CALENDAR_UNCERTAIN');
  });

  it('chunks recent price-window reads by symbol count and preserves per-instrument limits', async () => {
    const stocks = Array.from({ length: 205 }, (_value, index) => ({
      ...stock,
      id: `stock-${index + 1}`,
      symbol: `SYM${index + 1}`,
    }));
    const priceRows = (symbol: string) => [0, 1, 2].map((index) => ({
      symbol,
      timestamp: new Date(Date.UTC(2026, 4, 25 - index)),
      open: 100 - index,
      high: 101 - index,
      low: 99 - index,
      close: 100 - index,
      adjustedClose: null,
      volume: 1_000_000 - index,
      source: 'database',
      ingestionTimestamp: new Date('2026-05-25T03:00:00.000Z'),
      lastUpdatedTimestamp: new Date('2026-05-25T03:00:00.000Z'),
      dataStatus: 'COMPLETE',
    }));
    const repository = {
      prisma: {
        stock: {
          findMany: jest.fn().mockResolvedValue(stocks),
        },
      },
      // FIX-D: the service now reads price windows via the repository's raw-SQL chunk method
      // (CAST(volume AS float8) to avoid the Prisma6 NAPI BigInt crash), chunked by 50.
      listPriceWindowsForSymbolChunk: jest.fn(async (symbols: string[]) => (
        symbols.flatMap((symbol: string) => priceRows(symbol))
      )),
    };
    const provider = { fetchHistorical: jest.fn() };
    const service = new MarketDataFoundationService(repository as any, provider as any);

    const result = await service.listRecentPriceWindowsByInstrumentIds(stocks.map((item) => item.id), 2, {
      region: 'IN',
      assetType: 'STOCK',
    });

    expect(repository.listPriceWindowsForSymbolChunk).toHaveBeenCalledTimes(5);
    expect(repository.listPriceWindowsForSymbolChunk.mock.calls.map(([symbols]) => symbols.length)).toEqual([50, 50, 50, 50, 5]);
    expect(result.size).toBe(205);
    expect(result.get('stock-1')).toHaveLength(2);
    expect(result.get('stock-205')).toHaveLength(2);
    expect(provider.fetchHistorical).not.toHaveBeenCalled();
  });


});

describe('MarketDataFoundationService operational repair run', () => {
  const health = (overrides: any = {}) => {
    const { counts: countOverrides = {}, coverage: coverageOverrides = {}, topBlockers, ...rest } = overrides;
    return {
      scope: { region: 'IN', assetType: 'STOCK' },
      generatedAt: '2026-05-12T00:00:00.000Z',
      latestStoredEodDate: '2026-05-08',
      expectedLatestTradingDate: '2026-05-11',
      counts: {
      CATALOG_ONLY: 2,
      PROVIDER_SUPPORTED: 1,
      PRICE_READY: 0,
      CONTEXT_READY: 0,
      REVIEW_READY: 0,
      UNSUPPORTED: 0,
      STALE_OR_INCOMPLETE: 1,
      DELISTED_OR_INACTIVE: 0,
      totalCatalogInstruments: 3,
      activeInstruments: 3,
      inactiveOrDelistedInstruments: 0,
      providerSupported: 1,
      providerUnknown: 2,
      providerUnknownValidationNeeded: countOverrides.providerUnknownValidationNeeded ?? countOverrides.providerUnknown ?? 2,
      providerRetryValidationNeeded: countOverrides.providerRetryValidationNeeded ?? countOverrides.providerValidationFailed ?? 0,
      providerUnsupportedExcluded: countOverrides.providerUnsupportedExcluded ?? countOverrides.unsupportedExcluded ?? 0,
      providerValidationFailed: countOverrides.providerValidationFailed ?? countOverrides.providerRetryValidationNeeded ?? 0,
      unsupported: 0,
      unsupportedExcluded: countOverrides.unsupportedExcluded ?? countOverrides.providerUnsupportedExcluded ?? 0,
      supportedCatalogIdentityRepairNeeded: countOverrides.supportedCatalogIdentityRepairNeeded ?? 1,
      supportedBusinessMetadataRepairNeeded: countOverrides.supportedBusinessMetadataRepairNeeded ?? 1,
      supportedPriceBackfillNeeded: countOverrides.supportedPriceBackfillNeeded ?? 1,
      catalogOnly: 2,
      priceReady: 0,
      contextReady: 0,
      reviewReady: 0,
      staleOrIncomplete: 1,
      missingLatestPrice: 2,
      staleLatestPrice: 1,
      missingOrInadequatePriceHistory: 2,
      missingRecentVolume: 2,
      missingSector: 2,
      missingIndustry: 2,
      missingCountry: 0,
      missingCurrency: 0,
      missingMarketCap: 2,
      missingIsin: 2,
        missingListingDate: 2,
        ...countOverrides,
      },
      coverage: {
        priceCoveragePercentage: 0,
        metadataCoveragePercentage: 0,
        reviewReadyPercentage: 0,
        ...coverageOverrides,
      },
      topBlockers: topBlockers || [
        { code: 'PROVIDER_UNKNOWN', label: 'Provider support unknown', count: 2, severity: 'critical' },
      ],
      warnings: [],
      trustStatus: 'NOT_TRUSTWORTHY',
      trustReasons: ['Review-ready universe is empty under strict rules.'],
      universeSignoff: {
        status: 'FAIL',
        minReviewReadyRequired: 300,
        reviewReadyActual: 0,
        blockers: [
          { code: 'PROVIDER_UNKNOWN_REMAINING', severity: 'critical', count: 2, required: 0, nextAction: 'VALIDATE_PROVIDERS' },
        ],
        nextAction: 'VALIDATE_PROVIDERS',
        downstreamAllowed: false,
      },
      ...rest,
    };
  };

  const plan = (overrides: any = {}) => {
    const base = {
    scope: { region: 'IN', assetType: 'STOCK' },
    generatedAt: '2026-05-12T00:00:00.000Z',
    totalCatalogInstruments: 3,
    providerUnknownValidationNeeded: 2,
    providerRetryValidationNeeded: 0,
    providerUnsupportedExcluded: 0,
    providerValidationFailed: 0,
    providerValidationNeeded: 2,
    retryFailedValidations: 0,
    supportedCatalogIdentityRepairNeeded: 2,
    supportedBusinessMetadataRepairNeeded: 2,
    supportedPriceBackfillNeeded: 1,
    unsupportedExcluded: 0,
    catalogIdentityRepairNeeded: 2,
    priceBackfillNeeded: 1,
    businessMetadataRepairNeeded: 2,
    businessMetadataAutoRepairable: 2,
    businessMetadataManualRequired: 0,
    businessMetadataRetryBlocked: 0,
    businessMetadataRetryEligible: 0,
    businessMetadataRecentlyAttempted: 0,
    metadataEnrichmentNeeded: 2,
    manualMetadataRequired: 2,
    manualBusinessMetadataRequired: 2,
    missingIsin: 2,
    missingListingDate: 2,
    missingSector: 2,
    missingIndustry: 2,
    missingMarketCap: 2,
    manualSectorIndustryRequired: 2,
    topActions: [],
    warnings: [],
    universeSignoff: {
      status: 'FAIL',
      minReviewReadyRequired: 300,
      reviewReadyActual: 0,
      blockers: [
        { code: 'PROVIDER_UNKNOWN_REMAINING', severity: 'critical', count: 2, required: 0, nextAction: 'VALIDATE_PROVIDERS' },
      ],
      nextAction: 'VALIDATE_PROVIDERS',
      downstreamAllowed: false,
    },
    };
    const merged = { ...base, ...overrides };
    merged.providerUnknownValidationNeeded = overrides.providerUnknownValidationNeeded ?? overrides.providerValidationNeeded ?? merged.providerUnknownValidationNeeded;
    merged.providerRetryValidationNeeded = overrides.providerRetryValidationNeeded ?? overrides.retryFailedValidations ?? merged.providerRetryValidationNeeded;
    merged.supportedCatalogIdentityRepairNeeded = overrides.supportedCatalogIdentityRepairNeeded ?? overrides.catalogIdentityRepairNeeded ?? merged.supportedCatalogIdentityRepairNeeded;
    merged.supportedPriceBackfillNeeded = overrides.supportedPriceBackfillNeeded ?? overrides.priceBackfillNeeded ?? merged.supportedPriceBackfillNeeded;
    return merged;
  };

  const summary = (overrides: any = {}) => ({
    scope: { region: 'IN', assetType: 'STOCK' },
    processedCount: 1,
    totalCount: 1,
    batchSize: 50,
    offset: 0,
    nextOffset: null,
    hasMore: false,
    updated: 1,
    skipped: 0,
    failed: 0,
    warnings: [],
    durationMs: 1,
    ...overrides,
  });

  const catalogRow = (symbol: string, index = 1) => ({
    symbol,
    name: `${symbol} Limited`,
    region: 'IN',
    exchange: 'NSE',
    assetType: 'STOCK',
    instrumentSegment: 'CASH',
    displaySymbol: symbol,
    sourceSymbol: symbol,
    providerSymbol: `${symbol}.NS`,
    catalogSource: 'NSE_EQUITY_SECURITIES',
    country: 'India',
    currency: 'INR',
    isin: `INE000A0${String(index).padStart(3, '0')}`,
    ipoDate: new Date('2020-01-01T00:00:00.000Z'),
  });

  const catalogStock = (symbol: string) => ({
    id: `stock-${symbol}`,
    symbol,
    name: `${symbol} Limited`,
    region: 'IN',
    exchange: 'NSE',
    assetType: 'STOCK',
    displaySymbol: symbol,
    sourceSymbol: symbol,
    providerSymbol: `${symbol}.NS`,
    catalogSource: 'NSE_EQUITY_SECURITIES',
    isActive: true,
    isDelisted: false,
    isin: null,
    ipoDate: null,
  });

  const catalogSourceSnapshot = (fingerprint = 'catalog-same', rows: any[] = [catalogRow('ABB')]) => ({
    fingerprint,
    identity: {
      action: 'CATALOG_IDENTITY_REPAIR',
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL',
      rowCount: rows.length,
      contentSha256: `${fingerprint}-content`,
      rowsSha256: `${fingerprint}-rows`,
    },
    catalogSnapshot: {
      catalogSource: 'NSE_EQUITY_SECURITIES',
      rows,
      warnings: [],
      downloaded: true,
      sourceFingerprint: fingerprint,
      sourceIdentity: {
        action: 'CATALOG_IDENTITY_REPAIR',
        catalogSource: 'NSE_EQUITY_SECURITIES',
        importMode: 'CONFIGURED_URL',
        rowCount: rows.length,
        contentSha256: `${fingerprint}-content`,
        rowsSha256: `${fingerprint}-rows`,
      },
    },
  });

  it('dry-run reports planned actions without mutating or persisting', async () => {
    const repository = {
      createRepairRun: jest.fn(),
      updateRepairRun: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-drain-blocked'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan());
    const validateSpy = jest.spyOn(service, 'validateProviders');

    const result = await service.repairRun({ region: 'IN', assetType: 'STOCK', dryRun: true, batchSize: 50 });

    expect(repository.createRepairRun).not.toHaveBeenCalled();
    expect(validateSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: true,
      status: 'COMPLETED',
      expectedNextAction: 'VALIDATE_PROVIDERS',
      summary: { batchesExecuted: 0 },
    });
    expect(result.actions.map((action) => action.action)).toEqual([
      'VALIDATE_PROVIDERS',
      'CATALOG_IDENTITY_REPAIR',
      'PROVIDER_BUSINESS_METADATA_REPAIR',
      'BACKFILL_PRICES',
    ]);
    expect(result.actions[0]).toMatchObject({ estimatedTotal: 2, estimatedBatchCount: 1 });
    expect(service.universeHealth).toHaveBeenCalledTimes(1);
    expect(service.repairPlan).toHaveBeenCalledTimes(1);
  });

  it('dry-run reuses one universe snapshot for before health and plan', async () => {
    const repository = {
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([{
        id: 'stock-aaa',
        symbol: 'AAA',
        providerSupportStatus: 'SUPPORTED',
        isActive: true,
        isDelisted: false,
        providerSymbol: 'AAA.NS',
        sector: 'Tech',
        industry: 'Software',
        marketCap: 100000000,
        country: 'India',
        currency: 'INR',
        isin: 'INE000A01001',
        ipoDate: new Date('2020-01-01T00:00:00.000Z'),
        assetType: 'STOCK',
        exchange: 'NSE',
      }]),
      priceReadinessStatsForSymbols: jest.fn().mockResolvedValue(new Map([
        ['AAA.NS', {
          priceHistoryBars: 350,
          firstPriceDate: '2020-01-01',
          latestPriceDate: '2026-05-11',
          latestVolume: 1200,
          latestAdjustedClose: 100,
          latestClose: 100,
          rollingWindowBars: 252,
          rollingWindowCoveragePercent: 100,
          recentVolumeCoveragePercent: 100,
          adjustedCloseCoveragePercent: 100,
          maxPriceGapDays: 0,
        }],
      ])),
      listBlockedPriceBackfillStockIds: jest.fn().mockResolvedValue([]),
      createRepairRun: jest.fn(),
      updateRepairRun: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    await service.repairRun({ region: 'IN', assetType: 'STOCK', dryRun: true, batchSize: 50 });

    expect(repository.createRepairRun).not.toHaveBeenCalled();
    expect(repository.updateRepairRun).not.toHaveBeenCalled();
    expect(repository.listStocksForUniverseHealth).toHaveBeenCalledTimes(1);
    expect(repository.priceReadinessStatsForSymbols).toHaveBeenCalledTimes(1);
    expect(repository.listBlockedPriceBackfillStockIds).toHaveBeenCalledTimes(1);
  });

  it('executes repair actions in dependency order', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const calls: string[] = [];
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-order'),
    });
    jest.spyOn(service, 'universeHealth')
      .mockResolvedValueOnce(health())
      .mockResolvedValueOnce(health({ counts: { providerSupported: 2, providerUnknown: 1 } }));
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan())
      .mockResolvedValueOnce(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 0,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
      }));
    jest.spyOn(service, 'validateProviders').mockImplementation(async () => {
      calls.push('VALIDATE_PROVIDERS');
      return summary({ providerSupported: 1 });
    });
    jest.spyOn(service as any, 'repairCatalogIdentityFromRows').mockImplementation(async () => {
      calls.push('CATALOG_IDENTITY_REPAIR');
      return summary({ catalogIdentityRepaired: 1, sourceFingerprint: 'catalog-order' });
    });
    jest.spyOn(service, 'repairProviderBusinessMetadata').mockImplementation(async () => {
      calls.push('PROVIDER_BUSINESS_METADATA_REPAIR');
      return summary({ providerBusinessMetadataRepaired: 1 });
    });
    jest.spyOn(service, 'backfillPrices').mockImplementation(async () => {
      calls.push('BACKFILL_PRICES');
      return summary({ priceRowsReceived: 252 });
    });

    const result = await service.repairRun({ region: 'IN', assetType: 'STOCK', batchSize: 50 });

    expect(calls).toEqual([
      'VALIDATE_PROVIDERS',
      'CATALOG_IDENTITY_REPAIR',
    ]);
    expect(result.actions.find((action) => action.action === 'PROVIDER_BUSINESS_METADATA_REPAIR')?.warnings.join(' '))
      .toContain('EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY');
    expect(result.actions.find((action) => action.action === 'BACKFILL_PRICES')?.warnings.join(' '))
      .toContain('EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY');
    expect(result.status).toBe('PARTIAL');
    expect(repository.createRepairRun).toHaveBeenCalledWith(expect.objectContaining({
      status: 'RUNNING',
      beforeHealthJson: expect.objectContaining({ trustStatus: 'NOT_TRUSTWORTHY' }),
    }));
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
      status: 'PARTIAL',
      afterHealthJson: expect.objectContaining({ counts: expect.objectContaining({ providerSupported: 2 }) }),
    }));
  });

  it('blocks operational provider business metadata repair runs under the NSE/BSE-only policy', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-provider-metadata' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({});
    jest.spyOn(service, 'universeHealth')
      .mockResolvedValueOnce(health())
      .mockResolvedValueOnce(health({ counts: { providerSupported: 1, reviewReady: 1 } }));
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 0,
        businessMetadataAutoRepairable: 1,
        priceBackfillNeeded: 0,
        manualBusinessMetadataRequired: 0,
      }))
      .mockResolvedValueOnce(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 0,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
        manualBusinessMetadataRequired: 0,
      }));
    const repairSpy = jest.spyOn(service, 'repairProviderBusinessMetadata').mockResolvedValue(summary({
      processedCount: 1,
      updated: 1,
      providerBusinessMetadataRepaired: 1,
    }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      actions: ['PROVIDER_BUSINESS_METADATA_REPAIR'],
      batchSize: 50,
      workerConcurrency: 5,
    });

    expect(repairSpy).not.toHaveBeenCalled();
    expect(result.actions[0]).toMatchObject({ action: 'PROVIDER_BUSINESS_METADATA_REPAIR', batchesExecuted: 1 });
    expect(result.actions[0].warnings.join(' ')).toContain('EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY');
  });

  it('blocks repair-run provider price backfill under the NSE/BSE-only policy', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-backfill-force' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({});
    jest.spyOn(service, 'universeHealth')
      .mockResolvedValue(health({ counts: { providerSupported: 1, reviewReady: 0 } }));
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValue(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 0,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 1,
        manualBusinessMetadataRequired: 0,
      }));
    const backfillSpy = jest.spyOn(service, 'backfillPrices').mockResolvedValue(summary({
      processedCount: 1,
      updated: 1,
      priceRowsReceived: 1,
    }));

    const first = await service.repairRun({ region: 'IN', assetType: 'STOCK', actions: ['BACKFILL_PRICES'], batchSize: 50 });
    const second = await service.repairRun({ region: 'IN', assetType: 'STOCK', actions: ['BACKFILL_PRICES'], batchSize: 50, force: true });
    const third = await service.repairRun({ region: 'IN', assetType: 'STOCK', actions: ['BACKFILL_PRICES'], batchSize: 50, fullReload: true });

    expect(backfillSpy).not.toHaveBeenCalled();
    expect(first.actions[0].warnings.join(' ')).toContain('EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY');
    expect(second.actions[0].warnings.join(' ')).toContain('EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY');
    expect(third.actions[0].warnings.join(' ')).toContain('EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY');
  });

  it('drain mode executes actions in dependency order as queues clear', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-drain-order' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const calls: string[] = [];
    const passSignoff = {
      status: 'PASS',
      minReviewReadyRequired: 300,
      reviewReadyActual: 300,
      blockers: [],
      nextAction: null,
      downstreamAllowed: true,
    };
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-drain-order'),
    });
    jest.spyOn(service, 'universeHealth')
      .mockResolvedValueOnce(health())
      .mockResolvedValueOnce(health({ trustStatus: 'OK', counts: { providerUnknown: 0, reviewReady: 300 }, coverage: { reviewReadyPercentage: 10 } }));
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan())
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, manualBusinessMetadataRequired: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, catalogIdentityRepairNeeded: 0, manualBusinessMetadataRequired: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, manualBusinessMetadataRequired: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0, manualBusinessMetadataRequired: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0, manualBusinessMetadataRequired: 0, universeSignoff: passSignoff }));
    jest.spyOn(service, 'validateProviders').mockImplementation(async () => {
      calls.push('VALIDATE_PROVIDERS');
      return summary({ providerSupported: 1 });
    });
    jest.spyOn(service as any, 'repairCatalogIdentityFromRows').mockImplementation(async () => {
      calls.push('CATALOG_IDENTITY_REPAIR');
      return summary({ catalogIdentityRepaired: 1, sourceFingerprint: 'catalog-drain-order' });
    });
    jest.spyOn(service, 'repairProviderBusinessMetadata').mockImplementation(async () => {
      calls.push('PROVIDER_BUSINESS_METADATA_REPAIR');
      return summary({ providerBusinessMetadataRepaired: 1 });
    });
    jest.spyOn(service, 'backfillPrices').mockImplementation(async () => {
      calls.push('BACKFILL_PRICES');
      return summary({ priceRowsReceived: 252 });
    });

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      batchSize: 50,
      maxBatchesPerAction: 2,
    });

    expect(calls).toEqual([
      'VALIDATE_PROVIDERS',
      'CATALOG_IDENTITY_REPAIR',
    ]);
    expect(result.actions.find((action) => action.action === 'PROVIDER_BUSINESS_METADATA_REPAIR')?.warnings.join(' '))
      .toContain('EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY');
    expect(result.actions.find((action) => action.action === 'BACKFILL_PRICES')?.warnings.join(' '))
      .toContain('EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY');
    expect(result.status).toBe('COMPLETED');
    expect(result.anotherRunNeeded).toBe(false);
  });


  it('drain mode treats UNKNOWN rows moved to VALIDATION_FAILED as progress', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-unknown-failed' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const queues: string[] = [];
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-unknown-failed'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, retryFailedValidations: 0, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    jest.spyOn(service, 'validateProviders').mockImplementation(async (request: any) => {
      queues.push(request.providerValidationQueue);
      return request.providerValidationQueue === 'UNKNOWN_FIRST'
        ? summary({ updated: 1, failed: 1, validationFailed: 1 })
        : summary({ updated: 0, failed: 1, validationFailed: 1 });
    });

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      batchSize: 50,
      maxBatchesPerAction: 1,
    });

    expect(queues).toEqual(['UNKNOWN_FIRST', 'RETRY_FAILED']);
    expect(result.status).toBe('PARTIAL_BLOCKED');
    expect(result.warnings.join(' ')).toContain('Retry failed provider validations did not reduce');
    expect(result.warnings.join(' ')).not.toContain('Validate unknown providers did not reduce');
  });

  it('drain mode reports retry/provider diagnosis when retry-failed queue does not reduce', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-retry-blocked' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-retry-blocked'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 2, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 2, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 0, retryFailedValidations: 2, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    jest.spyOn(service, 'validateProviders').mockResolvedValue(summary({ updated: 0, failed: 1, validationFailed: 1 }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      batchSize: 50,
      maxBatchesPerAction: 1,
    });

    expect(result.status).toBe('PARTIAL_BLOCKED');
    expect(result.actions.find((action) => action.action === 'VALIDATE_PROVIDERS')?.batchesExecuted).toBe(0);
    expect(result.actions.find((action) => action.action === 'RETRY_FAILED_PROVIDERS')?.batchesExecuted).toBe(1);
    expect(result.warnings.join(' ')).toContain('Retry failed provider validations did not reduce; manual/provider diagnosis required.');
  });

  it('drain mode stops as PARTIAL_BLOCKED when a queue does not decrease', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-drain-blocked' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-drain-blocked'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }))
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    jest.spyOn(service, 'validateProviders').mockResolvedValue(summary({ updated: 1, providerValidated: 1 }));
    const catalogSpy = jest.spyOn(service as any, 'repairCatalogIdentityFromRows');

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      actions: ['VALIDATE_PROVIDERS', 'CATALOG_IDENTITY_REPAIR'],
      batchSize: 50,
      maxBatchesPerAction: 1,
    });

    expect(result.status).toBe('PARTIAL_BLOCKED');
    expect(result.anotherRunNeeded).toBe(true);
    expect(result.warnings.join(' ')).toContain('Validate unknown providers did not reduce its queue');
    expect(catalogSpy).not.toHaveBeenCalled();
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-drain-blocked', expect.objectContaining({
      status: 'PARTIAL_BLOCKED',
    }));
  });

  it('drain mode reports PARTIAL_MANUAL_REQUIRED when only manual metadata remains', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-manual-required' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({});
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health({
      counts: { providerUnknown: 0, reviewReady: 7 },
      topBlockers: [{ code: 'MISSING_MARKET_CAP', label: 'Missing market cap', count: 2, severity: 'critical' }],
      universeSignoff: {
        status: 'FAIL',
        minReviewReadyRequired: 300,
        reviewReadyActual: 7,
        blockers: [
          { code: 'MANUAL_BUSINESS_METADATA_REQUIRED', severity: 'critical', count: 2, required: 0, nextAction: 'MANUAL_METADATA_IMPORT' },
        ],
        nextAction: 'MANUAL_METADATA_IMPORT',
        downstreamAllowed: false,
      },
    }));
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan({
      providerValidationNeeded: 0,
      retryFailedValidations: 0,
      catalogIdentityRepairNeeded: 0,
      businessMetadataAutoRepairable: 0,
      businessMetadataRetryEligible: 0,
      priceBackfillNeeded: 0,
      manualBusinessMetadataRequired: 2,
      universeSignoff: {
        status: 'FAIL',
        minReviewReadyRequired: 300,
        reviewReadyActual: 7,
        blockers: [
          { code: 'MANUAL_BUSINESS_METADATA_REQUIRED', severity: 'critical', count: 2, required: 0, nextAction: 'MANUAL_METADATA_IMPORT' },
        ],
        nextAction: 'MANUAL_METADATA_IMPORT',
        downstreamAllowed: false,
      },
    }));
    const validateSpy = jest.spyOn(service, 'validateProviders');

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      mode: 'DRAIN_UNTIL_BLOCKED',
      batchSize: 50,
      maxBatchesPerAction: 1,
    });

    expect(validateSpy).not.toHaveBeenCalled();
    expect(result.status).toBe('PARTIAL_MANUAL_REQUIRED');
    expect(result.anotherRunNeeded).toBe(true);
    expect(result.expectedNextAction).toBe('MANUAL_METADATA_IMPORT');
    expect(result.universeSignoff).toMatchObject({
      status: 'FAIL',
      downstreamAllowed: false,
      nextAction: 'MANUAL_METADATA_IMPORT',
    });
  });

  it('stops safely on action failure and persists PARTIAL snapshots', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-failure'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan());
    jest.spyOn(service, 'validateProviders').mockResolvedValue(summary());
    jest.spyOn(service as any, 'repairCatalogIdentityFromRows').mockRejectedValue(new Error('catalog source unavailable'));
    const metadataSpy = jest.spyOn(service, 'repairProviderBusinessMetadata');

    const result = await service.repairRun({ region: 'IN', assetType: 'STOCK', batchSize: 50 });

    expect(result.status).toBe('PARTIAL');
    expect(result.error).toBe('catalog source unavailable');
    expect(metadataSpy).not.toHaveBeenCalled();
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
      status: 'PARTIAL',
      error: 'catalog source unavailable',
    }));
  });

  it('honors max batches so shrinking queues cannot loop indefinitely', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan({ catalogIdentityRepairNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    const validateSpy = jest.spyOn(service, 'validateProviders').mockResolvedValue(summary({
      processedCount: 1,
      totalCount: 10,
      hasMore: true,
      nextOffset: 0,
    }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 1,
      maxBatchesPerAction: 2,
      actions: ['VALIDATE_PROVIDERS'],
    });

    expect(validateSpy).toHaveBeenCalledTimes(2);
    expect(result.actions[0]).toMatchObject({
      batchesExecuted: 2,
      anotherRunNeeded: true,
    });
    expect(result.anotherRunNeeded).toBe(true);
    expect(result.status).toBe('PARTIAL');
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-1', expect.objectContaining({
      status: 'PARTIAL',
    }));
  });

  it('resumes stable source-list actions from the latest persisted next offset', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-2' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      latestRepairRun: jest.fn().mockResolvedValue({
        summaryJson: {
          actions: [
            {
              action: 'CATALOG_IDENTITY_REPAIR',
              sourceFingerprint: 'catalog-same',
              summaries: [{ hasMore: true, nextOffset: 100 }],
            },
          ],
        },
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-same'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan({ providerValidationNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    const catalogSpy = jest.spyOn(service as any, 'repairCatalogIdentityFromRows').mockResolvedValue(summary({
      offset: 100,
      processedCount: 50,
      totalCount: 200,
      hasMore: true,
      nextOffset: 150,
      sourceFingerprint: 'catalog-same',
    }));

    await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      maxBatchesPerAction: 1,
      actions: ['CATALOG_IDENTITY_REPAIR'],
    });

    expect(catalogSpy).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 100 }),
      expect.objectContaining({ sourceFingerprint: 'catalog-same' }),
      expect.objectContaining({ actionableOnly: true })
    );
  });

  it('resets catalog source-list offset when configured URL content fingerprint changes', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-3' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      latestRepairRun: jest.fn().mockResolvedValue({
        summaryJson: {
          actions: [
            {
              action: 'CATALOG_IDENTITY_REPAIR',
              sourceFingerprint: 'catalog-old',
              summaries: [{ hasMore: true, nextOffset: 100, sourceFingerprint: 'catalog-old' }],
            },
          ],
        },
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      CATALOG_IDENTITY_REPAIR: catalogSourceSnapshot('catalog-new'),
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan({ providerValidationNeeded: 0, businessMetadataAutoRepairable: 0, priceBackfillNeeded: 0 }));
    const catalogSpy = jest.spyOn(service as any, 'repairCatalogIdentityFromRows').mockResolvedValue(summary({
      offset: 0,
      processedCount: 50,
      totalCount: 200,
      hasMore: true,
      nextOffset: 50,
      sourceFingerprint: 'catalog-new',
    }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      maxBatchesPerAction: 1,
      actions: ['CATALOG_IDENTITY_REPAIR'],
      catalogSource: 'BSE_EQUITY_SECURITIES',
    });

    expect(catalogSpy).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 }),
      expect.objectContaining({ sourceFingerprint: 'catalog-new' }),
      expect.objectContaining({ actionableOnly: true })
    );
    expect(result.actions[0].warnings.join(' ')).toContain('Source changed; restart from offset 0');
  });

  it('loads catalog source once per operational repair action and reuses the same fingerprint for all batches', async () => {
    const rows = [catalogRow('ABB', 1), catalogRow('ACC', 2), catalogRow('AARTIIND', 3), catalogRow('AXISBANK', 4)];
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-source-snapshot' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      listStocksForUniverseHealth: jest.fn().mockResolvedValue(rows.map((row: any) => catalogStock(row.sourceSymbol))),
      repairCatalogIdentityForStock: jest.fn().mockResolvedValue({ action: 'updated' }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    const loadSpy = jest.spyOn(service as any, 'loadCatalogIdentityRows').mockResolvedValue({
      rows,
      warnings: [],
      downloaded: true,
      sourceFingerprint: 'catalog-stable',
      sourceIdentity: {
        action: 'CATALOG_IDENTITY_REPAIR',
        catalogSource: 'NSE_EQUITY_SECURITIES',
        importMode: 'CONFIGURED_URL',
        rowCount: rows.length,
        contentSha256: 'stable-content',
        rowsSha256: 'stable-rows',
      },
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: rows.length,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
      }))
      .mockResolvedValueOnce(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 1,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
      }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 1,
      maxBatchesPerAction: 3,
      actions: ['CATALOG_IDENTITY_REPAIR'],
    });

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(repository.repairCatalogIdentityForStock).toHaveBeenCalledTimes(3);
    expect(result.status).toBe('PARTIAL');
    expect(result.actions[0]).toMatchObject({
      sourceFingerprint: 'catalog-stable',
      batchesExecuted: 3,
      anotherRunNeeded: true,
    });
    expect(result.actions[0].summaries).toHaveLength(3);
    expect(result.actions[0].summaries.every((item) => item.sourceFingerprint === 'catalog-stable')).toBe(true);
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-source-snapshot', expect.objectContaining({
      status: 'PARTIAL',
      summaryJson: expect.objectContaining({
        actions: [
          expect.objectContaining({
            sourceFingerprint: 'catalog-stable',
            summaries: expect.arrayContaining([
              expect.objectContaining({ sourceFingerprint: 'catalog-stable' }),
            ]),
          }),
        ],
      }),
    }));
  });

  it('uses actionable catalog identity rows for operational repair-run batches', async () => {
    const rows = [catalogRow('COMPLETE', 1), catalogRow('GAPONE', 2), catalogRow('GAPTWO', 3)];
    const complete = {
      ...catalogStock('COMPLETE'),
      isin: rows[0].isin,
      ipoDate: rows[0].ipoDate,
      catalogSource: rows[0].catalogSource,
    };
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-actionable-catalog' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        complete,
        catalogStock('GAPONE'),
        catalogStock('GAPTWO'),
      ]),
      repairCatalogIdentityForStock: jest.fn().mockResolvedValue({ action: 'updated' }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service as any, 'loadCatalogIdentityRows').mockResolvedValue({
      rows,
      warnings: [],
      downloaded: true,
      sourceFingerprint: 'catalog-actionable',
      sourceIdentity: {
        action: 'CATALOG_IDENTITY_REPAIR',
        catalogSource: 'NSE_EQUITY_SECURITIES',
        importMode: 'CONFIGURED_URL',
        rowCount: rows.length,
        contentSha256: 'actionable-content',
        rowsSha256: 'actionable-rows',
      },
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 2,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
      }))
      .mockResolvedValue(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 0,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
      }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 1,
      maxBatchesPerAction: 2,
      actions: ['CATALOG_IDENTITY_REPAIR'],
    });

    expect(repository.repairCatalogIdentityForStock).toHaveBeenCalledTimes(2);
    expect(repository.repairCatalogIdentityForStock).toHaveBeenNthCalledWith(1, 'stock-GAPONE', expect.objectContaining({ symbol: 'GAPONE' }), expect.any(Object));
    expect(repository.repairCatalogIdentityForStock).toHaveBeenNthCalledWith(2, 'stock-GAPTWO', expect.objectContaining({ symbol: 'GAPTWO' }), expect.any(Object));
    expect(result.actions[0].totals).toMatchObject({
      processedCount: 2,
      updated: 2,
      skipped: 0,
      noOp: 0,
    });
    expect(result.actions[0].summaries[0]).toMatchObject({
      totalCount: 2,
      catalogRowsRead: 3,
    });
  });

  it('repairs safe duplicate local rows from one operational catalog identity row', async () => {
    const row = catalogRow('DUPSAFE', 1);
    const duplicate = {
      ...catalogStock('DUPSAFE'),
      id: 'stock-DUPSAFE-bare',
      symbol: 'DUPSAFE',
    };
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-duplicate-catalog' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      listStocksForUniverseHealth: jest.fn().mockResolvedValue([
        catalogStock('DUPSAFE'),
        duplicate,
      ]),
      repairCatalogIdentityForStock: jest.fn().mockResolvedValue({ action: 'updated' }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service as any, 'loadCatalogIdentityRows').mockResolvedValue({
      rows: [row],
      warnings: [],
      downloaded: true,
      sourceFingerprint: 'catalog-duplicate',
      sourceIdentity: {
        action: 'CATALOG_IDENTITY_REPAIR',
        catalogSource: 'NSE_EQUITY_SECURITIES',
        importMode: 'CONFIGURED_URL',
        rowCount: 1,
        contentSha256: 'duplicate-content',
        rowsSha256: 'duplicate-rows',
      },
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 2,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
      }))
      .mockResolvedValue(plan({
        providerValidationNeeded: 0,
        catalogIdentityRepairNeeded: 0,
        businessMetadataAutoRepairable: 0,
        priceBackfillNeeded: 0,
      }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 10,
      maxBatchesPerAction: 1,
      actions: ['CATALOG_IDENTITY_REPAIR'],
    });

    expect(repository.repairCatalogIdentityForStock).toHaveBeenCalledTimes(2);
    expect(repository.repairCatalogIdentityForStock).toHaveBeenCalledWith('stock-DUPSAFE', expect.objectContaining({ symbol: 'DUPSAFE' }), expect.any(Object));
    expect(repository.repairCatalogIdentityForStock).toHaveBeenCalledWith('stock-DUPSAFE-bare', expect.objectContaining({ symbol: 'DUPSAFE' }), expect.any(Object));
    expect(result.actions[0].totals).toMatchObject({
      processedCount: 2,
      updated: 2,
      skipped: 0,
      noOp: 0,
    });
  });

  it('fails catalog repair runs before processing offsets when source snapshot loading fails', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-source-error' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      latestRepairRun: jest.fn().mockResolvedValue({
        summaryJson: {
          actions: [
            {
              action: 'CATALOG_IDENTITY_REPAIR',
              sourceFingerprint: 'catalog-old',
              summaries: [{ hasMore: true, nextOffset: 100, sourceFingerprint: 'catalog-old' }],
            },
          ],
        },
      }),
      listStocksForUniverseHealth: jest.fn(),
      repairCatalogIdentityForStock: jest.fn(),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service as any, 'loadCatalogIdentityRows').mockRejectedValue(new Error('configured catalog download failed'));
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan({
      providerValidationNeeded: 0,
      catalogIdentityRepairNeeded: 2,
      businessMetadataAutoRepairable: 0,
      priceBackfillNeeded: 0,
    }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      batchSize: 50,
      maxBatchesPerAction: 3,
      actions: ['CATALOG_IDENTITY_REPAIR'],
    });

    expect(result.status).toBe('PARTIAL');
    expect(result.error).toContain('Catalog identity repair source could not be loaded');
    expect(result.actions[0]).toMatchObject({
      batchesExecuted: 0,
      summaries: [],
      resumeOffset: 0,
    });
    expect(repository.listStocksForUniverseHealth).not.toHaveBeenCalled();
    expect(repository.repairCatalogIdentityForStock).not.toHaveBeenCalled();
    expect(repository.updateRepairRun).toHaveBeenCalledWith('run-source-error', expect.objectContaining({
      status: 'PARTIAL',
      error: expect.stringContaining('Catalog identity repair source could not be loaded'),
    }));
  });

  it('resumes manual CSV imports only when the CSV fingerprint matches', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-4' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      latestRepairRun: jest.fn().mockResolvedValue({
        summaryJson: {
          actions: [
            {
              action: 'MANUAL_METADATA_IMPORT',
              sourceFingerprint: 'manual-same',
              summaries: [{ hasMore: true, nextOffset: 50, sourceFingerprint: 'manual-same' }],
            },
          ],
        },
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      MANUAL_METADATA_IMPORT: { fingerprint: 'manual-same', identity: { action: 'MANUAL_METADATA_IMPORT', importMode: 'MANUAL_CSV' } },
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan());
    const manualSpy = jest.spyOn(service, 'importManualMetadata').mockResolvedValue(summary({
      offset: 50,
      processedCount: 50,
      totalCount: 100,
      hasMore: false,
      nextOffset: null,
      sourceFingerprint: 'manual-same',
    }));

    await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      actions: ['MANUAL_METADATA_IMPORT'],
      csvText: 'symbol,sector,industry\nABB,Industrials,Equipment\n',
    });

    expect(manualSpy).toHaveBeenCalledWith(expect.objectContaining({ offset: 50 }));
  });

  it('restarts manual CSV import when the CSV fingerprint changes', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-5' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
      latestRepairRun: jest.fn().mockResolvedValue({
        summaryJson: {
          actions: [
            {
              action: 'MANUAL_METADATA_IMPORT',
              sourceFingerprint: 'manual-old',
              summaries: [{ hasMore: true, nextOffset: 50, sourceFingerprint: 'manual-old' }],
            },
          ],
        },
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    (service as any).repairRunSourceFingerprints = jest.fn().mockResolvedValue({
      MANUAL_METADATA_IMPORT: { fingerprint: 'manual-new', identity: { action: 'MANUAL_METADATA_IMPORT', importMode: 'MANUAL_CSV' } },
    });
    jest.spyOn(service, 'universeHealth').mockResolvedValue(health());
    jest.spyOn(service, 'repairPlan').mockResolvedValue(plan());
    const manualSpy = jest.spyOn(service, 'importManualMetadata').mockResolvedValue(summary({
      offset: 0,
      processedCount: 50,
      totalCount: 100,
      hasMore: true,
      nextOffset: 50,
      sourceFingerprint: 'manual-new',
    }));

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      actions: ['MANUAL_METADATA_IMPORT'],
      csvText: 'symbol,sector,industry\nACC,Materials,Cement\n',
    });

    expect(manualSpy).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
    expect(result.actions[0].warnings.join(' ')).toContain('Source changed; restart from offset 0');
  });

  it('reports hard blockers and keeps strict review-ready logic visible', async () => {
    const repository = {
      createRepairRun: jest.fn().mockResolvedValue({ id: 'run-1' }),
      updateRepairRun: jest.fn().mockResolvedValue({}),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);
    jest.spyOn(service, 'universeHealth')
      .mockResolvedValueOnce(health())
      .mockResolvedValueOnce(health({
        counts: { reviewReady: 0, providerUnknown: 1 },
        topBlockers: [
          { code: 'MISSING_MARKET_CAP', label: 'Missing market cap', count: 2, severity: 'critical' },
        ],
      }));
    jest.spyOn(service, 'repairPlan')
      .mockResolvedValueOnce(plan())
      .mockResolvedValueOnce(plan({ providerValidationNeeded: 1, manualBusinessMetadataRequired: 2 }));
    jest.spyOn(service, 'validateProviders').mockResolvedValue(summary());

    const result = await service.repairRun({
      region: 'IN',
      assetType: 'STOCK',
      actions: ['VALIDATE_PROVIDERS'],
    });

    expect(result.afterHealth.counts.reviewReady).toBe(0);
    expect(result.hardBlockersRemaining).toEqual([
      expect.objectContaining({ code: 'MISSING_MARKET_CAP' }),
    ]);
    expect(result.warnings.join(' ')).toContain('Today Plan remains blocked');
  });

  it('latest repair run exposes operator follow-up fields', async () => {
    const repository = {
      latestRepairRun: jest.fn().mockResolvedValue({
        id: 'run-latest',
        region: 'IN',
        assetType: 'STOCK',
        status: 'PARTIAL',
        startedAt: new Date('2026-05-12T01:00:00.000Z'),
        completedAt: new Date('2026-05-12T01:01:00.000Z'),
        beforeHealthJson: null,
        afterHealthJson: { trustStatus: 'NOT_TRUSTWORTHY' },
        beforeRepairPlanJson: null,
        afterRepairPlanJson: null,
        summaryJson: {
          actions: [],
          summary: { updated: 0 },
          anotherRunNeeded: true,
          expectedNextAction: 'CATALOG_IDENTITY_REPAIR',
          hardBlockersRemaining: [{ code: 'MISSING_ISIN', count: 10, severity: 'critical' }],
          afterTrustStatus: 'NOT_TRUSTWORTHY',
        },
        warningsJson: ['Repair catalog identity: another bounded run is needed.'],
        error: null,
      }),
    };
    const service = new MarketDataFoundationService(repository as any, {} as any);

    const result = await service.latestRepairRun({ region: 'IN', assetType: 'STOCK' });

    expect(result).toMatchObject({
      status: 'PARTIAL',
      anotherRunNeeded: true,
      expectedNextAction: 'CATALOG_IDENTITY_REPAIR',
      afterTrustStatus: 'NOT_TRUSTWORTHY',
      hardBlockersRemaining: [expect.objectContaining({ code: 'MISSING_ISIN' })],
    });
  });
});
