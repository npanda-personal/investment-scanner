import { Prisma, PrismaClient } from '@prisma/client';
import type { FxRateInput } from '../market-data-foundation.types';

export class FxRepository {
  constructor(private readonly prisma: PrismaClient) {}



  async upsertFxRate(input: FxRateInput) {
    return (this.prisma as any).fxRate.upsert({
      where: { pair: input.pair },
      update: {
        rate: new Prisma.Decimal(input.rate),
        rateTimestamp: input.rateTimestamp,
        source: input.source,
        dataStatus: input.dataStatus ?? 'COMPLETE',
      },
      create: {
        pair: input.pair,
        baseCurrency: input.baseCurrency,
        quoteCurrency: input.quoteCurrency,
        rate: new Prisma.Decimal(input.rate),
        rateTimestamp: input.rateTimestamp,
        source: input.source,
        dataStatus: input.dataStatus ?? 'COMPLETE',
      },
    });
  }



  async listFxRates() {
    return (this.prisma as any).fxRate.findMany({ orderBy: { pair: 'asc' } });
  }



  async findFxRate(pair: string) {
    return (this.prisma as any).fxRate.findUnique({ where: { pair } });
  }
}
