/**
 * Feasibility analysis: how much of our sector/industry + market-cap gaps can
 * BSE's free scrip master fill (joined by ISIN, which we have for all stocks)?
 * Read-only (no writes).
 * Run: npx ts-node --transpile-only scripts/analyze-bse-coverage.ts
 */
import prisma from '../src/db/prisma';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36';

async function fetchBse(): Promise<any[]> {
  const url = 'https://api.bseindia.com/BseIndiaAPI/api/ListofScripData/w?Group=&Scripcode=&industry=&segment=Equity&status=Active';
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', Referer: 'https://www.bseindia.com/' } });
  const json: any = await res.json();
  return Array.isArray(json) ? json : (json.Table || json.data || []);
}

function norm(v: any): string { return (v ?? '').toString().trim().toUpperCase(); }

async function main() {
  const bse = await fetchBse();
  console.log(`BSE rows: ${bse.length}`);
  const sample = bse[0] || {};
  console.log('BSE keys:', Object.keys(sample).join(', '));
  const industryNonNull = bse.filter((r) => norm(r.INDUSTRY)).length;
  const mktcapNonNull = bse.filter((r) => Number(r.Mktcap) > 0).length;
  console.log(`BSE INDUSTRY populated: ${industryNonNull}/${bse.length}; Mktcap populated: ${mktcapNonNull}/${bse.length}`);

  const byIsin = new Map<string, any>();
  for (const r of bse) { const isin = norm(r.ISIN_NUMBER); if (isin) byIsin.set(isin, r); }

  const stocks = await prisma.stock.findMany({
    where: { region: 'IN', assetType: 'STOCK', isActive: true, isDelisted: false },
    select: { symbol: true, isin: true, sector: true, marketCap: true, catalogSource: true },
  });
  const sectorMissing = stocks.filter((s) => !s.sector || !s.sector.trim());
  const mcMissing = stocks.filter((s) => s.marketCap == null || Number(s.marketCap) <= 0);

  const sectorFillable = sectorMissing.filter((s) => { const r = byIsin.get(norm(s.isin)); return r && norm(r.INDUSTRY); });
  const mcFillable = mcMissing.filter((s) => { const r = byIsin.get(norm(s.isin)); return r && Number(r.Mktcap) > 0; });

  const smeSectorMissing = sectorMissing.filter((s) => s.catalogSource === 'NSE_SME_EQUITY_SECURITIES');
  const smeMatchedInBse = smeSectorMissing.filter((s) => byIsin.has(norm(s.isin)));
  const smeIndustryFillable = smeSectorMissing.filter((s) => { const r = byIsin.get(norm(s.isin)); return r && norm(r.INDUSTRY); });

  console.log(`\n--- sector gap (${sectorMissing.length}) ---`);
  console.log(`  fillable from BSE INDUSTRY (by ISIN): ${sectorFillable.length}`);
  console.log(`  of which SME: matched-in-BSE=${smeMatchedInBse.length}/${smeSectorMissing.length}, industry-fillable=${smeIndustryFillable.length}`);
  console.log(`\n--- marketCap gap (${mcMissing.length}) ---`);
  console.log(`  fillable from BSE Mktcap (by ISIN): ${mcFillable.length}`);
  console.log(`\nSample SME BSE row:`, (() => { const s = smeMatchedInBse[0]; const r = s && byIsin.get(norm(s.isin)); return r ? { sym: s.symbol, industry: r.INDUSTRY, mktcap: r.Mktcap, group: r.GROUP } : 'none matched'; })());
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
