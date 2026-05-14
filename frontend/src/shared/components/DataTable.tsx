import React from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';

export type SortDirection = 'asc' | 'desc';

export type DataTableColumn<T> = {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  density?: 'compact' | 'comfortable';
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  page: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: number[];
  sortBy?: string;
  sortDirection?: SortDirection;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange?: (sortBy: string, sortDirection: SortDirection) => void;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  density = 'compact',
  loading = false,
  error,
  emptyMessage = 'No records found.',
  page,
  pageSize,
  totalCount,
  pageSizeOptions = [10, 25, 50, 100],
  sortBy,
  sortDirection = 'asc',
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onRowClick,
}: DataTableProps<T>) {
  const colSpan = Math.max(columns.length, 1);
  const isCompact = density === 'compact';

  return (
    <Paper variant="outlined" sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 720, maxWidth: '100%', overflowX: 'auto' }}>
        <Table
          stickyHeader
          size={isCompact ? 'small' : 'medium'}
          sx={{
            minWidth: 900,
            '& .MuiTableCell-root': {
              py: isCompact ? 1 : 1.35,
            },
            '& .MuiTableHead-root .MuiTableCell-root': {
              py: isCompact ? 1 : 1.25,
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiTableBody-root .MuiTableRow-root': {
              '&:last-of-type .MuiTableCell-root': {
                borderBottom: 'none',
              },
            },
          }}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align}>
                  {column.sortable && onSortChange ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortDirection : 'asc'}
                      onClick={() => onSortChange(column.id, sortBy === column.id && sortDirection === 'asc' ? 'desc' : 'asc')}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={colSpan}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={28} />
                  </Box>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                  <Typography color="error">{error}</Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            ) : rows.map((row) => (
              <TableRow
                key={getRowId(row)}
                hover={Boolean(onRowClick)}
                onClick={() => onRowClick?.(row)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '& .MuiTableCell-root': {
                    py: isCompact ? 0.95 : 1.2,
                  },
                }}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align}>{column.render(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        rowsPerPage={pageSize}
        rowsPerPageOptions={pageSizeOptions}
        onPageChange={(_event, nextPage) => onPageChange(nextPage)}
        onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      />
    </Paper>
  );
}
