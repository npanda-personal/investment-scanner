import { TableCell, TableSortLabel } from '@mui/material';
import type { ReactNode } from 'react';
import type { SortDirection } from '../hooks/useTableSort';

interface SortableTableCellProps<K extends string> {
  label: ReactNode;
  /** Stable key identifying this column for sort state. */
  columnKey: K;
  /** The currently-active sort key (null when unsorted). */
  activeKey: K | null;
  direction: SortDirection;
  onSort: (key: K) => void;
  align?: 'left' | 'center' | 'right';
  /** Optional native tooltip, preserved for columns that already carry one. */
  title?: string;
  padding?: 'normal' | 'checkbox' | 'none';
}

/**
 * A table header cell wrapping its label in an interactive MUI sort label.
 * Pairs with {@link useTableSort} / {@link sortRows} for client-side column sorting.
 */
export function SortableTableCell<K extends string>({
  label,
  columnKey,
  activeKey,
  direction,
  onSort,
  align,
  title,
  padding,
}: SortableTableCellProps<K>) {
  const active = activeKey === columnKey;
  return (
    <TableCell align={align} padding={padding} sortDirection={active ? direction : false} title={title}>
      <TableSortLabel
        active={active}
        direction={active ? direction : 'asc'}
        onClick={() => onSort(columnKey)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}
