import { useCallback, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

/**
 * Compare two cell values for table sorting.
 * Null / undefined / blank values always sort LAST regardless of direction,
 * mirroring the nulls-last convention used by the app's existing sortable tables
 * (Conviction, Top F&O Readiness, Index Constituents).
 */
export function compareSortValues(a: unknown, b: unknown, direction: SortDirection): number {
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'asc' ? a - b : b - a;
  }
  const as = String(a).toLowerCase();
  const bs = String(b).toLowerCase();
  if (as === bs) return 0;
  const cmp = as < bs ? -1 : 1;
  return direction === 'asc' ? cmp : -cmp;
}

/**
 * Interactive column-sort state for a data table.
 * Clicking the active column flips its direction; clicking a different column
 * selects it and defaults to descending (highest-first), matching the other
 * sortable tables in the app. Pass `onChange` to react to a sort change
 * (e.g. resetting pagination to the first page).
 */
export function useTableSort<K extends string>(
  initialKey: K | null = null,
  initialDirection: SortDirection = 'desc',
  onChange?: () => void,
) {
  const [sortKey, setSortKey] = useState<K | null>(initialKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const handleSort = useCallback(
    (key: K) => {
      setSortKey((prevKey) => {
        if (prevKey === key) {
          setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          return prevKey;
        }
        setSortDirection('desc');
        return key;
      });
      onChange?.();
    },
    [onChange],
  );

  return { sortKey, sortDirection, handleSort };
}

/**
 * Return a sorted copy of `rows` for the active sort key, using `accessor`
 * to pull the comparable value for a given key. Returns the input array
 * unchanged when no column is active (preserving the upstream default order).
 */
export function sortRows<T, K extends string>(
  rows: T[],
  sortKey: K | null,
  sortDirection: SortDirection,
  accessor: (row: T, key: K) => unknown,
): T[] {
  if (!sortKey) return rows;
  return [...rows].sort((a, b) =>
    compareSortValues(accessor(a, sortKey), accessor(b, sortKey), sortDirection),
  );
}
