import type { OHLCVBar } from '../types';

export type ChartTimeframe = '1D' | '1W' | '1M';

/** Aggregate daily OHLCV bars into weekly or monthly bars. '1D' is a pass-through. */
export function aggregateBars(bars: OHLCVBar[], tf: ChartTimeframe): OHLCVBar[] {
  if (tf === '1D' || bars.length === 0) return bars;

  const groups = new Map<string, OHLCVBar[]>();
  for (const bar of bars) {
    const key = tf === '1W' ? isoWeekMonday(bar.time) : bar.time.slice(0, 7) + '-01';
    let bucket = groups.get(key);
    if (!bucket) { bucket = []; groups.set(key, bucket); }
    bucket.push(bar);
  }

  const result: OHLCVBar[] = [];
  for (const [time, bucket] of groups) {
    let high = -Infinity;
    let low = Infinity;
    let volSum: number | null = null;
    for (const b of bucket) {
      if (b.high > high) high = b.high;
      if (b.low < low) low = b.low;
      if (b.volume != null) volSum = (volSum ?? 0) + b.volume;
    }
    result.push({
      time,
      open: bucket[0].open,
      high,
      low,
      close: bucket[bucket.length - 1].close,
      volume: volSum,
    });
  }
  return result;
}

/** Return the Monday (YYYY-MM-DD) of the ISO week containing the given date string. */
function isoWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}
