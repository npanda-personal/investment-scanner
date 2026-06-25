/**
 * Ranking table components: StockInterestTable, CompounderTable, TraderSetupTable, RiskTable,
 * and the generic RankingTable shell they rely on.
 */
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { SortableTableCell } from '@/shared/components';
import { useTableSort, sortRows } from '@/shared/hooks';
import type {
  CompounderSnapshot,
  RiskRadarSnapshot,
  StockInterestSnapshot,
  TraderSetupSnapshot,
} from '../types';
import {
  ReasonTags,
  RiskTags,
  formatDate,
  formatOptional,
} from './marketIntelligencePrimitives';

// ---------------------------------------------------------------------------
// StockInterestTable
// ---------------------------------------------------------------------------

type StockInterestSortKey = 'symbol' | 'company' | 'sector' | 'score' | 'direction' | 'freshness' | 'dataThrough';

function stockInterestSortValue(row: StockInterestSnapshot, key: StockInterestSortKey): unknown {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'company': return row.company;
    case 'sector': return row.sector;
    case 'score': return row.score;
    case 'direction': return row.direction;
    case 'freshness': return row.freshness;
    case 'dataThrough': return row.dataThroughDate;
  }
}

export function StockInterestTable({ rows }: { rows: StockInterestSnapshot[] }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const { sortKey, sortDirection, handleSort } = useTableSort<StockInterestSortKey>(null, 'desc', () => setPage(0));

  // Reset to page 0 whenever the filtered row set changes (tab/scope change).
  useEffect(() => { setPage(0); }, [rows]);

  // Default (no active sort) preserves the per-tab upstream ordering; a column click sorts client-side.
  const sortedRows = sortRows(rows, sortKey, sortDirection, stockInterestSortValue);
  const pagedRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const columns: Array<{ label: string; align?: 'right' | 'left'; sortKey?: StockInterestSortKey }> = [
    { label: 'Symbol', sortKey: 'symbol' },
    { label: 'Company', sortKey: 'company' },
    { label: 'Sector', sortKey: 'sector' },
    { label: 'Interest Score', align: 'right', sortKey: 'score' },
    { label: 'Direction', sortKey: 'direction' },
    { label: 'Reasons' },
    { label: 'Risks' },
    { label: 'Freshness', sortKey: 'freshness' },
    { label: 'Data Through', sortKey: 'dataThrough' },
    { label: 'Workspace' },
  ];

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              col.sortKey
                ? (
                  <SortableTableCell
                    key={col.label}
                    label={col.label}
                    columnKey={col.sortKey}
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                    align={col.align}
                  />
                )
                : <TableCell key={col.label} align={col.align}>{col.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedRows.map((row, rowIndex) => {
            const sectorDisplay = (!row.sector || row.sector === 'Unavailable') ? '—' : row.sector;
            const sectorTitle = (!row.sector || row.sector === 'Unavailable') ? 'Sector metadata not available for this instrument' : undefined;
            return (
              <TableRow key={rowIndex}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.symbol}</TableCell>
                <TableCell sx={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.company}>{row.company}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap', color: sectorDisplay === '—' ? 'text.disabled' : undefined }} title={sectorTitle}>{sectorDisplay}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatOptional(row.score)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.direction}</TableCell>
                <TableCell><ReasonTags tags={row.reasonTags} /></TableCell>
                <TableCell><RiskTags tags={row.riskTags} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.freshness || '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.dataThroughDate)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Button size="small" component={RouterLink} to={`/instrument-workspace/${encodeURIComponent(row.symbol)}`}>Open</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              count={rows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_event, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}

// ---------------------------------------------------------------------------
// Generic RankingTable shell
// ---------------------------------------------------------------------------

function RankingTable<T>({ rows, columns, renderRow }: { rows: T[]; columns: string[]; renderRow: (row: T) => ReactNode[] }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>{columns.map((column) => <TableCell key={column}>{column}</TableCell>)}</TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {renderRow(row).map((cell, cellIndex) => <TableCell key={`${rowIndex}:${cellIndex}`}>{cell}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ---------------------------------------------------------------------------
// CompounderTable, TraderSetupTable, RiskTable
// ---------------------------------------------------------------------------

export function CompounderTable({ rows }: { rows: CompounderSnapshot[] }) {
  return (
    <RankingTable
      rows={rows}
      columns={['Symbol', 'Compounder Score', 'Growth', 'Quality', 'Trend', 'Reasons', 'Risks', 'Freshness']}
      renderRow={(row) => [
        row.symbol,
        formatOptional(row.compounderScore),
        formatOptional(row.growthScore),
        formatOptional(row.qualityScore),
        formatOptional(row.trendScore),
        <ReasonTags key="reasons" tags={row.reasonTags} />,
        <RiskTags key="risks" tags={row.riskTags} />,
        row.freshness || 'Unavailable',
      ]}
    />
  );
}

export function TraderSetupTable({ rows }: { rows: TraderSetupSnapshot[] }) {
  return (
    <RankingTable
      rows={rows}
      columns={['Symbol', 'Setup Type', 'Setup Score', 'Timeframe', 'Reasons', 'Risks', 'Freshness']}
      renderRow={(row) => [
        row.symbol,
        row.setupType,
        formatOptional(row.setupScore),
        row.timeframe,
        <ReasonTags key="reasons" tags={row.reasonTags} />,
        <RiskTags key="risks" tags={row.riskTags} />,
        row.freshness || 'Unavailable',
      ]}
    />
  );
}

export function RiskTable({ rows }: { rows: RiskRadarSnapshot[] }) {
  return (
    <RankingTable
      rows={rows}
      columns={['Symbol', 'Risk Score', 'Risk Category', 'Reasons', 'Freshness']}
      renderRow={(row) => [
        row.symbol,
        formatOptional(row.riskScore),
        row.riskCategory,
        <ReasonTags key="reasons" tags={row.reasonTags} />,
        row.freshness || 'Unavailable',
      ]}
    />
  );
}
