/**
 * Fill missing marketCap for active IN/STOCK from BSE's free scrip master,
 * joined by ISIN. BSE Mktcap is in crore; stored marketCap is in rupees (×1e7).
 * Only fills rows where marketCap is null/<=0 (does not overwrite existing).
 * Run: npx ts-node --transpile-only scripts/fill-marketcap-bse.ts
 */
import prisma from '../src/db/prisma';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36';

async function main() {
  const res = await fetch('https://api.bseindia.com/BseIndiaAPI/api/ListofScripData/w?Group=&Scripcode=&industry=&segment=Equity&status=Active',
    { headers: { 'User-Agent': UA, Accept: 'application/json, text/plain, */*', Referer: 'https://www.bseindia.com/' } });
  const json: any = await res.json();
  const rows: any[] = Array.isArray(json) ? json : (json.Table || []);
  const mcapByIsin = new Map<string, number>();
  for (const r of rows) {
    const isin = (r.ISIN_NUMBER ?? '').toString().trim().toUpperCase();
    const cr = Number(r.Mktcap);
    if (isin && Number.isFinite(cr) && cr > 0) mcapByIsin.set(isin, cr);
  }
  console.log(`BSE scrips with mktcap: ${mcapByIsin.size}`);

  const gaps = await prisma.stock.findMany({
    where: { region: 'IN', assetType: 'STOCK', isActive: true, isDelisted: false, OR: [{ marketCap: null }, { marketCap: { lte: 0 } }] },
    select: { id: true, symbol: true, isin: true },
  });
  console.log(`marketCap gaps: ${gaps.length}`);

  let filled = 0, noMatch = 0;
  for (const s of gaps) {
    const cr = mcapByIsin.get((s.isin ?? '').toString().trim().toUpperCase());
    if (!cr) { noMatch += 1; continue; }
    await prisma.stock.update({ where: { id: s.id }, data: { marketCap: cr * 1e7 } }); // crore -> rupees
    filled += 1;
  }
  console.log(`filled ${filled} marketCaps from BSE; ${noMatch} had no BSE match (SME/NSE-only).`);

  const remaining = await prisma.stock.count({ where: { region: 'IN', assetType: 'STOCK', isActive: true, isDelisted: false, OR: [{ marketCap: null }, { marketCap: { lte: 0 } }] } });
  console.log(`marketCap still missing after BSE fill: ${remaining}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
