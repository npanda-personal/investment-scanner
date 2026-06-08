/**
 * Smoke test: NR-103 Index Constituents — ts-node script.
 * Reads a few Nifty 50 members with their signal + price from the DB.
 * Run: npx ts-node src/scripts/smokeIndexConstituents.ts
 */
import prisma from '../db/prisma';
import { IndexConstituentsService } from '../modules/market-intelligence/index-constituents.service';

async function main() {
  const service = new IndexConstituentsService();

  console.log('=== Nifty 50 ===');
  const n50 = await service.constituentsForIndex('NIFTY_50');
  console.log(`availability : ${n50.availability}`);
  console.log(`count        : ${n50.count}`);
  console.log(`breadth      : ${n50.breadth.headline}`);
  console.log(`warnings     : ${n50.warnings.length > 0 ? n50.warnings.join('; ') : 'none'}`);
  console.log('--- Sample rows (first 5) ---');
  n50.constituents.slice(0, 5).forEach((row, i) => {
    console.log(
      `  ${i + 1}. ${row.symbol.padEnd(12)} | price=${row.latestPrice ?? 'N/A'} | 1D%=${row.change1D !== null ? row.change1D.toFixed(2) + '%' : 'N/A'} | signal=${row.signalDirection ?? 'none'} (score=${row.signalScore !== null ? row.signalScore.toFixed(1) : 'N/A'}) | sector=${row.sector ?? 'N/A'} | mktcap=${row.marketCap !== null ? Math.round(row.marketCap / 1e7) + ' Cr' : 'N/A'}`,
    );
  });

  console.log('\n=== Nifty Bank ===');
  const bank = await service.constituentsForIndex('NIFTY_BANK');
  console.log(`availability : ${bank.availability}`);
  console.log(`count        : ${bank.count}`);
  console.log(`breadth      : ${bank.breadth.headline}`);
  bank.constituents.slice(0, 5).forEach((row, i) => {
    console.log(
      `  ${i + 1}. ${row.symbol.padEnd(12)} | price=${row.latestPrice ?? 'N/A'} | 1D%=${row.change1D !== null ? row.change1D.toFixed(2) + '%' : 'N/A'} | signal=${row.signalDirection ?? 'none'}`,
    );
  });

  console.log('\n=== Invalid index ===');
  const bad = await service.constituentsForIndex('BAD_INDEX');
  console.log(`availability : ${bad.availability} — ${bad.message}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
