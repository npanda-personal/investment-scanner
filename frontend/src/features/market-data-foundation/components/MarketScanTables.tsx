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

export function Table52w({ rows, scanType, currency, page, rowsPerPage, onPageChange, onRowsPerPageChange }: { rows: MarketScanRow52w[]; scanType: '52w-high' | '52w-low'; currency?: string } & PaginationProps) {
  if (!rows.length) {
    return <EmptyState message="No instruments found matching the scan criteria." />;
  }
  const source = sourceFrom(scanType === '52w-high' ? '52-Week Highs' : '52-Week Lows', rows);
  const visibleRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell align="right">Current Price</TableCell>
              <TableCell align="right">52W High</TableCell>
              <TableCell align="right">52W Low</TableCell>
              <TableCell align="right">% from High</TableCell>
              <TableCell align="right">% from Low</TableCell>
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

export function TableDeliverySpike({ rows, page, rowsPerPage, onPageChange, onRowsPerPageChange }: { rows: MarketScanRowDeliverySpike[] } & PaginationProps) {
  if (!rows.length) {
    return <EmptyState message="No delivery-spike candidates found. Delivery data covers NSE-listed stocks only." />;
  }
  const source = sourceFrom('Delivery Spikes', rows);
  const visibleRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell align="right">Latest Delivery %</TableCell>
              <TableCell align="right">Avg Delivery %</TableCell>
              <TableCell align="right">Spike Ratio</TableCell>
              <TableCell align="right">Lookback (bars)</TableCell>
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

export function TablePotentialMovers({ rows, currency, page, rowsPerPage, onPageChange, onRowsPerPageChange }: { rows: MarketScanRowPotentialMovers[]; currency?: string } & PaginationProps) {
  if (!rows.length) {
    return <EmptyState message="No potential-mover candidates found. Check that recent price data has been ingested." />;
  }
  const source = sourceFrom('Potential Movers', rows);
  const visibleRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Day Chg %</TableCell>
              <TableCell align="right">3-Day Move %</TableCell>
              <TableCell align="right">Avg Vol 20</TableCell>
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

export function TableVolumeSpike({ rows, page, rowsPerPage, onPageChange, onRowsPerPageChange }: { rows: MarketScanRowVolumeSpike[] } & PaginationProps) {
  if (!rows.length) {
    return <EmptyState message="No volume-spike candidates found. Check that recent price data has been ingested." />;
  }
  const source = sourceFrom('Volume Spikes', rows);
  // Derive lookback window from first row (all rows share the same lookback param)
  const lookbackWindow = rows[0]?.lookbackBars ?? null;
  const visibleRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
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
              <TableCell>Symbol</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell align="right">Latest Volume</TableCell>
              <TableCell align="right">Avg Volume</TableCell>
              <TableCell align="right">Spike Ratio</TableCell>
              <TableCell align="right">Lookback (bars)</TableCell>
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
