/**
 * Ingest fetched NSE corporate-actions JSON (backend/tmp/nse-ca/*.json) into the
 * CorporateAction table via the tested parser + repository mapper. No recompute
 * here — adjustedClose is recomputed separately (batch).
 *
 * Run: npx ts-node --transpile-only scripts/ingest-nse-corporate-actions.ts
 */
import fs from 'fs';
import path from 'path';
import prisma from '../src/db/prisma';
import { MarketDataFoundationRepository } from '../src/modules/market-data-foundation/market-data-foundation.repository';
import {
  parseNseCorporateActions,
  importNseCorporateActions,
} from '../src/modules/market-data-foundation/market-data-foundation.corporate-actions-source';

async function main() {
  const dir = path.resolve(__dirname, '../tmp/nse-ca');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const rows: any[] = [];
  for (const f of files) {
    try {
      const arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (Array.isArray(arr)) rows.push(...arr);
    } catch { /* skip bad file */ }
  }
  console.log('raw CA rows:', rows.length);

  const { parsed, skipped, warnings } = parseNseCorporateActions(rows);
  const byType: Record<string, number> = {};
  for (const p of parsed) byType[p.actionType] = (byType[p.actionType] || 0) + 1;
  console.log('parsed:', parsed.length, '| skipped:', skipped, '| warnings:', warnings.length);
  console.log('by type:', byType);

  // symbol -> stockId (IN/STOCK)
  const stocks = await prisma.stock.findMany({
    where: { region: 'IN', assetType: 'STOCK' },
    select: { id: true, symbol: true },
  });
  const map = new Map(stocks.map((s) => [s.symbol.toUpperCase(), s.id]));
  const symbolToStockId = (sym: string) => map.get(sym.toUpperCase());

  const repo = new MarketDataFoundationRepository();
  const result = await importNseCorporateActions(
    parsed,
    symbolToStockId,
    (stockId: string, actions: any[]) => (repo as any).upsertCorporateActions(stockId, actions),
    {},
  );
  console.log('import result:', JSON.stringify(result));

  // Verify RELIANCE got its real bonuses
  const rel = await prisma.stock.findFirst({ where: { symbol: 'RELIANCE' } });
  if (rel) {
    const cas = await prisma.corporateAction.findMany({
      where: { stockId: rel.id },
      orderBy: { effectiveDate: 'asc' },
      select: { actionType: true, effectiveDate: true, splitRatio: true, amount: true, source: true },
    });
    const bonuses = cas.filter((c) => c.actionType === 'bonus');
    console.log('RELIANCE total CAs:', cas.length,
      '| bonuses:', bonuses.map((b) => `${b.effectiveDate.toISOString().slice(0, 10)} r=${b.splitRatio}`));
  }

  const totalCAs = await prisma.corporateAction.count();
  const stocksWithCAs = await prisma.corporateAction.findMany({ distinct: ['stockId'], select: { stockId: true } });
  console.log('TOTAL corporate_actions:', totalCAs, '| stocks with CAs:', stocksWithCAs.length);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
