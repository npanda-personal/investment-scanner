/**
 * Read-only status check: freshness per source segment, earnings official dates,
 * signal outcome benchmark columns, market pulse snapshot date. No writes.
 */
import prisma from '../src/db/prisma';

async function main() {
  const segments = await prisma.$queryRawUnsafe<Array<{ segment: string; latest: Date | null; cnt: bigint }>>(
    `SELECT segment, MAX("tradingDate") AS latest, COUNT(*) AS cnt
     FROM source_file_imports WHERE status = 'COMPLETED'
     GROUP BY segment ORDER BY segment`
  );
  console.log('--- source_file_imports latest COMPLETED per segment ---');
  for (const s of segments) console.log(`${s.segment.padEnd(14)} ${s.latest?.toISOString().slice(0, 10)} (rows=${s.cnt})`);

  const official = await prisma.$queryRawUnsafe<Array<{ total: bigint; with_official: bigint }>>(
    `SELECT COUNT(*) AS total, COUNT("officialResultDate") AS with_official FROM fundamentals`
  );
  console.log('--- fundamentals officialResultDate ---');
  console.log(`total=${official[0].total} withOfficialDate=${official[0].with_official}`);

  const earnSnap = await prisma.$queryRawUnsafe<Array<{ src: string; cnt: bigint }>>(
    `SELECT "resultDateSource" AS src, COUNT(*) AS cnt FROM earnings_intelligence_snapshots
     WHERE "snapshotDate" = (SELECT MAX("snapshotDate") FROM earnings_intelligence_snapshots)
     GROUP BY "resultDateSource"`
  );
  console.log('--- latest earnings snapshot resultDateSource breakdown ---');
  for (const r of earnSnap) console.log(`${r.src.padEnd(36)} ${r.cnt}`);

  const outcomes = await prisma.$queryRawUnsafe<Array<{ total: bigint; with_bench: bigint; with_alpha: bigint }>>(
    `SELECT COUNT(*) AS total, COUNT("benchmarkReturnPercent") AS with_bench, COUNT("alphaPercent") AS with_alpha
     FROM signal_outcomes WHERE "dataComplete" = true`
  );
  console.log('--- signal_outcomes (mature) benchmark columns ---');
  console.log(`mature=${outcomes[0].total} withBenchmark=${outcomes[0].with_bench} withAlpha=${outcomes[0].with_alpha}`);

  const pulse = await prisma.$queryRawUnsafe<Array<{ region: string; snapshotDate: Date; dataThroughDate: Date | null; marketHealthLabel: string | null }>>(
    `SELECT region, "snapshotDate", "dataThroughDate", "marketHealthLabel" FROM market_pulse_snapshots
     ORDER BY "snapshotDate" DESC LIMIT 3`
  );
  console.log('--- latest market_pulse_snapshots ---');
  for (const p of pulse) console.log(`${p.region} snap=${p.snapshotDate.toISOString().slice(0, 10)} through=${p.dataThroughDate?.toISOString().slice(0, 10)} label=${p.marketHealthLabel}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
