import { TableCell, TableSortLabel } from '@mui/material';
import type { ScreenerRow } from '../types';

export type SortKey = 'signalScore' | 'rsPercentile' | 'scoreDeltaPrev' | 'price' | 'range52wPositionPct' | 'deliveryPct' | 'symbol' | 'smartMoneyScore';

export function sortScreenerRows(rows: ScreenerRow[], key: SortKey, dir: 'asc' | 'desc'): ScreenerRow[] {
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === 'string' && typeof bv === 'string') {
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });
}

/** Sortable table header cell — keeps ScreenerPage header markup to one line per column. */
export function SortHead({
  label, colKey, sortKey, sortDir, onSort, align,
}: {
  label: string;
  colKey: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <TableCell align={align} sortDirection={sortKey === colKey ? sortDir : false}>
      <TableSortLabel
        active={sortKey === colKey}
        direction={sortKey === colKey ? sortDir : 'desc'}
        onClick={() => onSort(colKey)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}
