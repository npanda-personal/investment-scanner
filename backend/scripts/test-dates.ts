import { YahooFinanceIngestionService } from '../src/modules/market-data-foundation';
import { PrismaClient } from '@prisma/client';

async function test() {
  const p = new PrismaClient();
  const svc = new YahooFinanceIngestionService(p);
  const result = await svc.fetchHistorical('AAPL', new Date('2026-05-01'), new Date('2026-05-03'));
  for (const q of result) {
    console.log(`Original Date Object: ${q.date.toISOString()}`);
    const d = new Date(q.date);
    d.setUTCHours(0, 0, 0, 0);
    console.log(`Normalized: ${d.toISOString()}`);
  }
  await p.$disconnect();
}

test();