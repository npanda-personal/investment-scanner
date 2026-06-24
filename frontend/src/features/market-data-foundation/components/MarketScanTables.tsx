/**
 * MarketScanTables — result tables for the Market Scans page (52-week high/low,
 * delivery spike, volume spike).
 *
 * Extracted from MarketScansPage.tsx (over the source-file line cap) so the table
 * presentation lives in one cohesive place. Each table feeds the Stock Workspace rail
 * with its own row set via StockWorkspaceLink, so opening a row lets the user step
 * through that scan without leaving the chart. Presentational only — renders from the
 * already-fetched rows, research-support framing, no fetching.
 */
import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { money } from '@/shared/format/money';
import { StockWorkspaceLink } from '@/shared/workspace/StockWorkspaceLink';
import { SortableTableCell } from '@/shared/components';
import { useTableSort, sortRows } from '@/shared/hooks';
import type { WorkspaceSource } from '@/shared/workspace/types';
import type {
  MarketScanRow52w,
  MarketScanRowDeliverySpike,
  MarketScanRowVolumeSpike,
} from '../types';
import type { MarketScanRowPotentialMovers } from '../types.potential-movers';

function SectorChip({ sector }: { sector: string | null }) {
  if (!sector) return <Typography variant="body2" color="text.disabled">—</Typography>;
  return <Chip label={sector} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />;
}

function SignalChip({ direction, score }: { direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null; score: number | null }) {
  if (!direction) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const color = direction === 'BULLISH' ? 'success' : direction === 'BEARISH' ? 'error' : 'default';
  const label = score != null ? `${direction} ${Math.round(score)}` : direction;
  return (
    <Tooltip title={`Signal: ${direction}${score != null ? ` (score ${Math.round(score)})` : ''}`}>
      <Chip label={label} size="small" color={color} sx={{ fontSize: '0.7rem', fontWeight: 600 }} />
    </Tooltip>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}

function pctColor(pct: number): string {
  if (pct > 0) return 'success.main';
  if (pct < 0) return 'error.main';
  return 'text.secondary';
}

function formatPct(val: number): string {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

function formatVolume(vol: number): string {
  if (vol >= 1e7) return `${(vol / 1e7).toFixed(1)}Cr`;
  if (vol >= 1e5) return `${(vol / 1e5).toFixed(1)}L`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return String(Math.round(vol));
}

interface PaginationProps {
  page: number;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newRowsPerPage: number) => void;
}

// All three scan-row shapes share instrumentId/symbol/companyName — build the rail
// source from whichever scan the user opened from.
function sourceFrom(
  label: string,
  rows: { instrumentId: string; symbol: string; companyName: string }[],
): WorkspaceSource {
  return {
    label,
    items: rows.map((r) => ({ instrumentId: r.instrumentId, symbol: r.symbol, companyName: r.companyName })),
  };
}

// ─── Table52w ────────────────────────────────────────────────────────────────

type Sort52wKey = 'symbol' | 'company' | 'currentPrice' | 'high52w' | 'low52w' | 'pctFromHigh' | 'pctFromLow';

function sort52wValue(row: MarketScanRow52w, key: Sort52wKey): unknown {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'company': return row.companyName;
    case 'currentPrice': return row.currentPrice;
    case 'high52w': return row.high52w;
    case 'low52w': return row.low52w;
    case 'pctFromHigh': return row.pctFromHigh;
    case 'pctFromLow': return row.pctFromLow;
  }
}

export function Table52w({ rows, scanType, currency, page, rowsPerPage, onPageChange, onRowsPerPageChange }: { rows: MarketScanRow52w[]; scanType: '52w-high' | '52w-low'; currency?: string } & PaginationProps) {
  const { sortKey, sortDirection, handleSort } = useTableSort<Sort52wKey>(null, 'desc', () => onPageChange(0));
  if (!rows.length) {
    return <EmptyState message="No instruments found matching the scan criteria." />;
  }
  const sortedRows = sortRows(rows, sortKey, sortDirection, sort52wValue);
  const source = sourceFrom(scanType === '52w-high' ? '52-Week Highs' : '52-Week Lows', sortedRows);
  const visibleRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const sortable = (label: React.ReactNode, columnKey: Sort52wKey, align?: 'left' | 'center' | 'right', title?: string) => (
    <SortableTableCell label={label} columnKey={columnKey} activeKey={sortKey} direction={sortDirection} onSort={handleSort} align={align} title={title} />
  );

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {sortable('Symbol', 'symbol')}
              {sortable('Company', 'company')}
              <TableCell>Sector</TableCell>
              {sortable('Current Price', 'currentPrice', 'right')}
              {sortable('52W High', 'high52w', 'right')}
              {sortable('52W Low', 'low52w', 'right')}
              {sortable('% from High', 'pctFromHigh', 'right')}
              {sortable('% from Low', 'pctFromLow', 'right')}
              <TableCell>Basis</TableCell>
              <TableCell>Signal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.instrumentId} hover>
                <TableCell>
                  <StockWorkspaceLink instrumentId={row.instrumentId} symbol={row.symbol} source={source} />
                </TableCell>
                <TableCell>
                  <Tooltip title={row.companyName}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                      {row.companyName}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell><SectorChip sector={row.sector} /></TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600}>{money(row.currentPrice, currency)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={scanType === '52w-high' ? 'success.main' : 'text.secondary'}>
                    {money(row.high52w, currency)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={scanType === '52w-low' ? 'error.main' : 'text.secondary'}>
                    {money(row.low52w, currency)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={pctColor(row.pctFromHigh)} fontWeight={scanType === '52w-high' ? 700 : 400}>
                    {formatPct(row.pctFromHigh)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={pctColor(row.pctFromLow)} fontWeight={scanType === '52w-low' ? 700 : 400}>
                    {formatPct(row.pctFromLow)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {row.priceBasis === 'ADJUSTED_CLOSE' ? 'Adj' : 'Raw'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <SignalChip direction={row.signalDirection} score={row.signalScore} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        onPageChange={(_e, newPage) => onPageChange(newPage)}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
      />
    </>
  );
}

// ─── TableDeliverySpike ───────────────────────────────────────────────────────

type SortDeliverySpikeKey = 'symbol' | 'company' | 'deliveryPct' | 'avgDeliveryPct' | 'spikeRatio' | 'lookbackBars';

function sortDeliverySpikeValue(row: MarketScanRowDeliverySpike, key: SortDeliverySpikeKey): unknown {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'company': return row.companyName;
    case 'deliveryPct': return row.deliveryPct;
    case 'avgDeliveryPct': return row.avgDeliveryPct;
    case 'spikeRatio': return row.spikeRatio;
    case 'lookbackBars': return row.lookbackBars;
  }
}

export function TableDeliverySpike({ rows, page, rowsPerPage, onPageChange, onRowsPerPageChange }: { rows: MarketScanRowDeliverySpike[] } & PaginationProps) {
  const { sortKey, sortDirection, handleSort } = useTableSort<SortDeliverySpikeKey>(null, 'desc', () => onPageChange(0));
  if (!rows.length) {
    return <EmptyState message="No delivery-spike candidates found. Delivery data covers NSE-listed stocks only." />;
  }
  const sortedRows = sortRows(rows, sortKey, sortDirection, sortDeliverySpikeValue);
  const source = sourceFrom('Delivery Spikes', sortedRows);
  const visibleRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const sortable = (label: React.ReactNode, columnKey: SortDeliverySpikeKey, align?: 'left' | 'center' | 'right', title?: string) => (
    <SortableTableCell label={label} columnKey={columnKey} activeKey={sortKey} direction={sortDirection} onSort={handleSort} align={align} title={title} />
  );

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {sortable('Symbol', 'symbol')}
              {sortable('Company', 'company')}
              <TableCell>Sector</TableCell>
              {sortable('Latest Delivery %', 'deliveryPct', 'right')}
              {sortable('Avg Delivery %', 'avgDeliveryPct', 'right')}
              {sortable('Spike Ratio', 'spikeRatio', 'right')}
              {sortable('Lookback (bars)', 'lookbackBars', 'right')}
              <TableCell>Signal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.instrumentId} hover>
                <TableCell>
                  <StockWorkspaceLink instrumentId={row.instrumentId} symbol={row.symbol} source={source} />
                </TableCell>
                <TableCell>
                  <Tooltip title={row.companyName}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                      {row.companyName}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell><SectorChip sector={row.sector} /></TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600} color="success.main">
                    {row.deliveryPct.toFixed(1)}%
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {row.avgDeliveryPct.toFixed(1)}%
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="warning.main">
                    {row.spikeRatio.toFixed(2)}x
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">{row.lookbackBars}</Typography>
                </TableCell>
                <TableCell>
                  <SignalChip direction={row.signalDirection} score={row.signalScore} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        onPageChange={(_e, newPage) => onPageChange(newPage)}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
      />
    </>
  );
}

// ─── TablePotentialMovers ─────────────────────────────────────────────────────

type SortPotentialMoversKey = 'symbol' | 'company' | 'latestClose' | 'dailyChangePct' | 'move3dPct' | 'avgVolume20';

function sortPotentialMoversValue(row: MarketScanRowPotentialMovers, key: SortPotentialMoversKey): unknown {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'company': return row.companyName;
    case 'latestClose': return row.latestClose;
    case 'dailyChangePct': return row.dailyChangePct;
    case 'move3dPct': return row.move3dPct;
    case 'avgVolume20': return row.avgVolume20;
  }
}

export function TablePotentialMovers({ rows, currency, page, rowsPerPage, onPageChange, onRowsPerPageChange }: { rows: MarketScanRowPotentialMovers[]; currency?: string } & PaginationProps) {
  const { sortKey, sortDirection, handleSort } = useTableSort<SortPotentialMoversKey>(null, 'desc', () => onPageChange(0));
  if (!rows.length) {
    return <EmptyState message="No potential-mover candidates found. Check that recent price data has been ingested." />;
  }
  const sortedRows = sortRows(rows, sortKey, sortDirection, sortPotentialMoversValue);
  const source = sourceFrom('Potential Movers', sortedRows);
  const visibleRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const sortable = (label: React.ReactNode, columnKey: SortPotentialMoversKey, align?: 'left' | 'center' | 'right', title?: string) => (
    <SortableTableCell label={label} columnKey={columnKey} activeKey={sortKey} direction={sortDirection} onSort={handleSort} align={align} title={title} />
  );

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {sortable('Symbol', 'symbol')}
              {sortable('Company', 'company')}
              <TableCell>Sector</TableCell>
              {sortable('Price', 'latestClose', 'right')}
              {sortable('Day Chg %', 'dailyChangePct', 'right')}
              {sortable('3-Day Move %', 'move3dPct', 'right')}
              {sortable('Avg Vol 20', 'avgVolume20', 'right')}
              <TableCell>Signal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.instrumentId} hover>
                <TableCell>
                  <StockWorkspaceLink instrumentId={row.instrumentId} symbol={row.symbol} source={source} />
                </TableCell>
                <TableCell>
                  <Tooltip title={row.companyName}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{row.companyName}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell><SectorChip sector={row.sector} /></TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600}>{money(row.latestClose, currency)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={pctColor(row.dailyChangePct)} fontWeight={700}>
                    {formatPct(row.dailyChangePct)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color={pctColor(row.move3dPct)}>
                    {formatPct(row.move3dPct)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">{formatVolume(row.avgVolume20)}</Typography>
                </TableCell>
                <TableCell>
                  <SignalChip direction={row.signalDirection} score={row.signalScore} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        onPageChange={(_e, newPage) => onPageChange(newPage)}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
      />
    </>
  );
}

// ─── TableVolumeSpike ─────────────────────────────────────────────────────────

type SortVolumeSpikeKey = 'symbol' | 'company' | 'latestVolume' | 'avgVolume' | 'spikeRatio' | 'lookbackBars';

function sortVolumeSpikeValue(row: MarketScanRowVolumeSpike, key: SortVolumeSpikeKey): unknown {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'company': return row.companyName;
    case 'latestVolume': return row.latestVolume;
    case 'avgVolume': return row.avgVolume;
    case 'spikeRatio': return row.spikeRatio;
    case 'lookbackBars': return row.lookbackBars;
  }
}

export function TableVolumeSpike({ rows, page, rowsPerPage, onPageChange, onRowsPerPageChange }: { rows: MarketScanRowVolumeSpike[] } & PaginationProps) {
  const { sortKey, sortDirection, handleSort } = useTableSort<SortVolumeSpikeKey>(null, 'desc', () => onPageChange(0));
  if (!rows.length) {
    return <EmptyState message="No volume-spike candidates found. Check that recent price data has been ingested." />;
  }
  const sortedRows = sortRows(rows, sortKey, sortDirection, sortVolumeSpikeValue);
  const source = sourceFrom('Volume Spikes', sortedRows);
  // Derive lookback window from first row (all rows share the same lookback param)
  const lookbackWindow = rows[0]?.lookbackBars ?? null;
  const visibleRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const sortable = (label: React.ReactNode, columnKey: SortVolumeSpikeKey, align?: 'left' | 'center' | 'right', title?: string) => (
    <SortableTableCell label={label} columnKey={columnKey} activeKey={sortKey} direction={sortDirection} onSort={handleSort} align={align} title={title} />
  );

  return (
    <>
      {lookbackWindow != null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          vs {lookbackWindow}-day average volume
        </Typography>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {sortable('Symbol', 'symbol')}
              {sortable('Company', 'company')}
              <TableCell>Sector</TableCell>
              {sortable('Latest Volume', 'latestVolume', 'right')}
              {sortable('Avg Volume', 'avgVolume', 'right')}
              {sortable('Spike Ratio', 'spikeRatio', 'right')}
              {sortable('Lookback (bars)', 'lookbackBars', 'right')}
              <TableCell>Signal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.instrumentId} hover>
                <TableCell>
                  <StockWorkspaceLink instrumentId={row.instrumentId} symbol={row.symbol} source={source} />
                </TableCell>
                <TableCell>
                  <Tooltip title={row.companyName}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                      {row.companyName}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell><SectorChip sector={row.sector} /></TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600}>
                    {formatVolume(row.latestVolume)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {formatVolume(row.avgVolume)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="warning.main">
                    {row.spikeRatio.toFixed(2)}x
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">{row.lookbackBars}</Typography>
                </TableCell>
                <TableCell>
                  <SignalChip direction={row.signalDirection} score={row.signalScore} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
        onPageChange={(_e, newPage) => onPageChange(newPage)}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
      />
    </>
  );
}
