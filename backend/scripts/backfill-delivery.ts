/**
 * Backfill NSE DELIVERY (security bhavdata) for missing trading dates.
 * Last completed: DELIVERY=2026-06-01. Backfills 2026-06-02 through 2026-06-10.
 * Holidays/weekends simply fail to download → logged and skipped.
 */
import { MarketDataFoundationService } from '../src/modules/market-data-foundation/market-data-foundation.service';
import { runScript } from './_run-script';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getTradingDays(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const cur = new Date(fromDate);
  const end = new Date(toDate);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

async function main() {
  const svc = new MarketDataFoundationService();
  const missingDates = getTradingDays('2026-06-02', '2026-06-10');
  console.log(`\n=== NSE Delivery Backfill ===`);
  console.log(`Dates to process (${missingDates.length}): ${missingDates.join(', ')}\n`);

  const results: Array<{ date: string; status: string; detail: string }> = [];
  for (const date of missingDates) {
    console.log(`\n[${date}] Calling importNseDeliveryOfficialDaily...`);
    try {
      const result = await svc.importNseDeliveryOfficialDaily({ tradingDate: date, force: false });
      const detail = `status=${result.status} rows=${(result as any).rowsAccepted ?? 'N/A'}`;
      console.log(`[${date}] ${detail}`);
      results.push({ date, status: String(result.status), detail });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error(`[${date}] ERROR: ${msg}`);
      results.push({ date, status: 'ERROR', detail: msg });
    }
    await sleep(4000);
  }

  console.log('\n=== SUMMARY ===');
  for (const r of results) console.log(`${r.date} | ${r.status} | ${r.detail}`);
}

runScript(main);
