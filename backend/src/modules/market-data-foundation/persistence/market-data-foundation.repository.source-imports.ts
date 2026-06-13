import { PrismaClient } from '@prisma/client';
import { normalizeUtcDay } from './market-data-foundation.repository.helpers';

export type SourceFileImportInput = {
  source: string;
  segment: string;
  tradingDate: Date;
  fileName: string;
  fileUrl?: string | null;
  fileHash: string;
  fileSize?: number | null;
  status: string;
  rowsRaw?: number;
  rowsAccepted?: number;
  rowsRejected?: number;
  parserVersion: string;
  errorMessage?: string | null;
};

export class SourceImportsRepository {
  constructor(private readonly prisma: PrismaClient) {}



  async upsertSourceFileImport(input: SourceFileImportInput) {
    const tradingDate = normalizeUtcDay(input.tradingDate);
    const data = {
      source: input.source,
      segment: input.segment,
      tradingDate,
      fileName: input.fileName,
      fileUrl: input.fileUrl ?? null,
      fileHash: input.fileHash,
      fileSize: input.fileSize ?? null,
      status: input.status,
      rowsRaw: input.rowsRaw ?? 0,
      rowsAccepted: input.rowsAccepted ?? 0,
      rowsRejected: input.rowsRejected ?? 0,
      parserVersion: input.parserVersion,
      errorMessage: input.errorMessage ?? null,
    };

    return (this.prisma as any).sourceFileImport.upsert({
      where: {
        source_segment_tradingDate_fileHash: {
          source: input.source,
          segment: input.segment,
          tradingDate,
          fileHash: input.fileHash,
        },
      },
      create: data,
      update: {
        fileName: input.fileName,
        fileUrl: input.fileUrl ?? null,
        fileSize: input.fileSize ?? null,
        status: input.status,
        rowsRaw: input.rowsRaw ?? 0,
        rowsAccepted: input.rowsAccepted ?? 0,
        rowsRejected: input.rowsRejected ?? 0,
        parserVersion: input.parserVersion,
        errorMessage: input.errorMessage ?? null,
      },
    });
  }



  async findSourceFileImportByKey(input: Pick<SourceFileImportInput, 'source' | 'segment' | 'tradingDate' | 'fileHash'>) {
    return (this.prisma as any).sourceFileImport.findUnique({
      where: {
        source_segment_tradingDate_fileHash: {
          source: input.source,
          segment: input.segment,
          tradingDate: normalizeUtcDay(input.tradingDate),
          fileHash: input.fileHash,
        },
      },
    });
  }



  async listCompletedSourceFileImportDates(input: {
    source: string;
    segment: string;
    startDate: Date;
    endDate: Date;
  }): Promise<Date[]> {
    const rows = await (this.prisma as any).sourceFileImport.findMany({
      where: {
        source: input.source,
        segment: input.segment,
        status: 'COMPLETED',
        tradingDate: {
          gte: normalizeUtcDay(input.startDate),
          lte: normalizeUtcDay(input.endDate),
        },
      },
      orderBy: { tradingDate: 'asc' },
      select: { tradingDate: true },
    });
    return rows.map((row: { tradingDate: Date }) => normalizeUtcDay(row.tradingDate));
  }



  async listCompletedOfficialNseIndexImportDates(input: {
    startDate: Date;
    endDate: Date;
  }): Promise<Date[]> {
    const rows = await (this.prisma as any).sourceFileImport.findMany({
      where: {
        source: 'NSE',
        segment: 'INDEX',
        status: 'COMPLETED',
        fileName: { startsWith: 'ind_close_all_' },
        parserVersion: 'nse-index-eod-v1',
        tradingDate: {
          gte: normalizeUtcDay(input.startDate),
          lte: normalizeUtcDay(input.endDate),
        },
      },
      orderBy: { tradingDate: 'asc' },
      select: { tradingDate: true },
    });
    return rows.map((row: { tradingDate: Date }) => normalizeUtcDay(row.tradingDate));
  }



  async listSourceFileImports(input: {
    source?: string;
    segment?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    sortBy?: 'importedAt' | 'tradingDate';
    sortDirection?: 'asc' | 'desc';
  } = {}) {
    const where: any = {
      // Exclude TEST_% fixture rows from the admin list by default
      source: { not: { startsWith: 'TEST_' } },
    };
    if (input.source) where.source = input.source.trim().toUpperCase();
    if (input.segment) where.segment = input.segment.trim().toUpperCase();
    if (input.status) where.status = input.status.trim().toUpperCase();
    if (input.startDate || input.endDate) {
      where.tradingDate = {};
      if (input.startDate) where.tradingDate.gte = normalizeUtcDay(input.startDate);
      if (input.endDate) where.tradingDate.lte = normalizeUtcDay(input.endDate);
    }
    const take = Math.max(1, Math.min(input.limit || 50, 200));
    const sortBy = input.sortBy === 'tradingDate' ? 'tradingDate' : 'importedAt';
    const sortDirection = input.sortDirection === 'asc' ? 'asc' : 'desc';
    const secondarySort = sortBy === 'importedAt'
      ? [{ tradingDate: sortDirection }, { updatedAt: sortDirection }]
      : [{ importedAt: sortDirection }, { updatedAt: sortDirection }];
    return (this.prisma as any).sourceFileImport.findMany({
      where,
      orderBy: [{ [sortBy]: sortDirection }, ...secondarySort],
      take,
      select: {
        id: true,
        source: true,
        segment: true,
        tradingDate: true,
        fileName: true,
        fileUrl: true,
        fileHash: true,
        fileSize: true,
        status: true,
        rowsRaw: true,
        rowsAccepted: true,
        rowsRejected: true,
        parserVersion: true,
        importedAt: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
