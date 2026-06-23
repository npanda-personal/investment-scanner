/**
 * Backfill NSE INDEX (+ SECTOR_INDEX + VIX) for missing trading dates.
 * Last completed: INDEX=2026-06-01, SECTOR_INDEX=2026-05-29
 * We go from 2026-06-02 through 2026-06-10 for INDEX.
 * Trading days (Mon-Fri, no weekends): 2026-06-02(Mon),03(Tue),04(Wed),05(Thu),06(Fri),09(Mon),10(Tue)
 * Holidays simply 404 → logged and skipped.
 */
import { MarketDataFoundationService } from '../src/modules/market-data-foundation/market-data-foundation.service';
import { runScript } from './_run-script';

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// NSE trading days from 2026-06-02 through 2026-06-10 (weekdays only)
function getTradingDays(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) {
      dates.push(cur.toISOString().split('T')[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

async function main() {
  const svc = new MarketDataFoundationService();

  // INDEX last = 2026-06-01, SECTOR_INDEX last = 2026-05-29
  // We start from 2026-06-02 to cover both
  const missingDates = getTradingDays('2026-06-02', '2026-06-10');
  console.log(`\n=== NSE Index EOD Backfill ===`);
  console.log(`Missing dates to process (${missingDates.length}): ${missingDates.join(', ')}\n`);

  const results: Array<{ date: string; status: string; detail: string }> = [];

  for (const date of missingDates) {
    console.log(`\n[${date}] Calling importNseIndexOfficialDaily...`);
    try {
      const result = await svc.importNseIndexOfficialDaily({ tradingDate: date, force: false });
      const detail = `status=${result.status} segments=[${result.segments?.join(',') ?? 'N/A'}] rows=${result.rowsAccepted ?? 'N/A'}`;
      console.log(`[${date}] ${detail}`);
      results.push({ date, status: result.status, detail });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error(`[${date}] ERROR: ${msg}`);
      results.push({ date, status: 'ERROR', detail: msg });
    }
    await sleep(3000);
  }

  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`${r.date} | ${r.status} | ${r.detail}`);
  }
}

runScript(main);
