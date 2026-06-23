/**
 * Post-backfill refresh:
 *  1. Re-materialise the IN market pulse snapshot (freshness picks up the new
 *     INDEX/SECTOR_INDEX/DELIVERY imports).
 *  2. Loop signal-quality recalculate with persistOutcomes=true until done so
 *     benchmarkReturnPercent/alphaPercent get populated for the track record.
 */
import { MarketPulseSnapshotService } from '../src/modules/market-context-intelligence/market-pulse-snapshot.service';
import { SignalQualityLabService } from '../src/modules/signal-quality-lab/signal-quality-lab.service';
import { runScript } from './_run-script';

async function main() {
  const pulse = new MarketPulseSnapshotService();
  console.log('=== Market pulse refresh (IN/STOCK/1d) ===');
  const snap = await pulse.refreshSnapshot({ region: 'IN', assetType: 'STOCK', timeframe: '1d' } as any);
  const summary = (snap as any).sourceSummaryJson;
  console.log(`snapshotDate=${(snap as any).snapshotDate?.toISOString?.().slice(0, 10)} dataThrough=${(snap as any).dataThroughDate?.toISOString?.().slice(0, 10)} label=${(snap as any).marketHealthLabel} freshness=${summary?.status} score=${summary?.score}`);
  if (summary?.segments) {
    for (const [seg, info] of Object.entries<any>(summary.segments)) {
      console.log(`  ${seg.padEnd(13)} ${info?.status} ${info?.tradingDate ?? ''}`);
    }
  }

  console.log('\n=== Signal outcome recalculate (persistOutcomes) ===');
  const lab = new SignalQualityLabService();
  let offset = 0;
  let batch = 0;
  for (;;) {
    const res = await lab.recalculate({ persistOutcomes: true, batchSize: 100, offset } as any);
    batch += 1;
    console.log(`batch=${batch} offset=${offset} processed=${res.processedCount}/${res.totalCount} inserted=${res.insertedCount} updated=${res.updatedCount} failed=${res.failedCount} hasMore=${res.hasMore}`);
    if (!res.hasMore || res.nextOffset === null) break;
    offset = res.nextOffset;
    if (batch > 500) { console.log('safety stop at 500 batches'); break; }
  }
  console.log('done');
}

runScript(main);
