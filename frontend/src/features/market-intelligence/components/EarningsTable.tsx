/**
 * Earnings Intelligence table component and its cell helpers.
 */
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState, type ReactNode } from 'react';
import { SortableTableCell } from '@/shared/components';
import { useTableSort, sortRows } from '@/shared/hooks';
import { humanizeCode } from '@/shared/format/enumLabels';
import { money } from '@/shared/format/money';
import type { EarningsIntelligenceSnapshot } from '../types';
import {
  formatDate,
  formatEnum,
  formatOptional,
  formatPercentPoints,
  RiskTags,
} from './marketIntelligencePrimitives';
import { isLowBaseGrowth } from './earningsTabModel';

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

export function ResultDateCell({ resultDate, resultDateLabel }: { resultDate: string | null; resultDateLabel?: 'Official' | 'TBA' | 'Estimated' | null }) {
  // Show a date only for an Official calendar date or a Phase 3 honest cadence
  // Estimate (clearly badged so it is never mistaken for an announced date).  TBA,
  // legacy estimates, or a missing basis show "Date TBA" — never a fabricated date.
  if (resultDate && (resultDateLabel === 'Official' || resultDateLabel === 'Estimated')) {
    const isEstimated = resultDateLabel === 'Estimated';
    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <span>{formatDate(resultDate)}</span>
        <Chip
          label={isEstimated ? 'Estimated' : 'Official'}
          size="small"
          variant="outlined"
          color={isEstimated ? 'warning' : 'success'}
        />
      </Stack>
    );
  }
  return (
    <Typography variant="body2" color="text.secondary" component="span">
      Date TBA
    </Typography>
  );
}

// Compact read-time signal posture for an earnings row.  Research-support framing:
// a candidate posture for review, never a buy/sell call.  null = no trusted signal
// for this instrument; undefined = the signal join was skipped for this snapshot.
export function SignalCell({ signal }: { signal?: EarningsIntelligenceSnapshot['signal'] }) {
  if (signal === undefined) return <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>;
  if (signal === null) return <Box component="span" sx={{ color: 'text.disabled' }}>No signal</Box>;
  const dir = (signal.direction || '').toUpperCase();
  const color: 'success' | 'error' | 'default' = dir === 'BULLISH' ? 'success' : dir === 'BEARISH' ? 'error' : 'default';
  const dirLabel = dir ? dir.charAt(0) + dir.slice(1).toLowerCase() : 'Neutral';
  const lifecycle = signal.lifecycleState ? humanizeCode(signal.lifecycleState) : null;
  const tooltip = [
    `Direction: ${dirLabel}`,
    `Signal quality: ${formatOptional(signal.score)}`,
    `Confidence: ${signal.confidence ? humanizeCode(signal.confidence) : '—'}`,
    lifecycle ? `Lifecycle: ${lifecycle}` : null,
    signal.triggerPrice != null ? `Trigger reference: ${money(signal.triggerPrice)}` : null,
  ].filter(Boolean).join('\n');
  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} arrow>
      <Chip
        size="small"
        color={color}
        variant="outlined"
        label={`${dirLabel} · ${formatOptional(signal.score)}${lifecycle ? ` · ${lifecycle}` : ''}`}
        sx={{ fontWeight: 600 }}
      />
    </Tooltip>
  );
}

// Compact numeric-technicals posture for an earnings row (Phase 3).  Descriptive
// readings derived from persisted price/delivery history — research-support framing,
// never a buy/sell call.  All-null (warm-up not met / short history) renders a dash.
export function TechnicalsCell({ row }: { row: EarningsIntelligenceSnapshot }) {
  const { rsi14, smaPosture, pricePosition52w, adx14, deliveryPercent } = row;
  const hasAny = [rsi14, smaPosture, pricePosition52w, adx14, deliveryPercent].some((value) => value !== null && value !== undefined);
  if (!hasAny) return <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>;
  const postureColor: 'success' | 'error' | 'default' = smaPosture === 'ABOVE_50_200'
    ? 'success'
    : smaPosture === 'BELOW_50_200'
      ? 'error'
      : 'default';
  const tooltip = [
    rsi14 != null ? `RSI(14): ${formatOptional(rsi14)}` : null,
    smaPosture ? `SMA posture: ${humanizeCode(smaPosture)}` : null,
    pricePosition52w != null ? `52-week position: ${formatOptional(pricePosition52w)}%` : null,
    adx14 != null ? `ADX(14): ${formatOptional(adx14)}` : null,
    deliveryPercent != null ? `Delivery: ${formatOptional(deliveryPercent)}%` : null,
  ].filter(Boolean).join('\n');
  const label = `RSI ${rsi14 != null ? formatOptional(rsi14) : '—'}${pricePosition52w != null ? ` · ${formatOptional(pricePosition52w)}% 52w` : ''}`;
  return (
    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} arrow>
      <Chip size="small" color={postureColor} variant="outlined" label={label} sx={{ fontWeight: 600 }} />
    </Tooltip>
  );
}

// QoQ/YoY growth %, shown verbatim. When the prior-period base was near-zero or a
// loss the ratio balloons into the hundreds/thousands of percent and overstates an
// ordinary swing — we keep the raw figure but append a quiet "*" so the reader can
// spot the low-base distortion (full explanation on hover).
export function GrowthCell({ value }: { value: number | null | undefined }) {
  const text = formatPercentPoints(value ?? null);
  if (!isLowBaseGrowth(value)) return <>{text}</>;
  return (
    <Tooltip
      arrow
      title="Low-base distortion: the prior-period figure was near zero or a loss, so this percentage overstates an ordinary swing (e.g. a recovery from ~breakeven or a loss→profit turnaround). For seasonal businesses, compare year-over-year instead. Value shown as reported."
    >
      <Box component="span" sx={{ borderBottom: '1px dotted', cursor: 'help' }}>
        {text}
        <Box component="sup" sx={{ color: 'warning.main', fontWeight: 700, ml: 0.25 }}>*</Box>
      </Box>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// EarningsTable
// ---------------------------------------------------------------------------

type EarningsSortKey =
  | 'symbol' | 'name' | 'resultDate' | 'daysToResult' | 'revQoQ' | 'profitQoQ' | 'epsQoQ' | 'consistency'
  | 'revYoY' | 'profitYoY' | 'epsYoY' | 'marginTrend' | 'acceleration'
  | 'periodEnd' | 'validatedAt';

function earningsSortValue(row: EarningsIntelligenceSnapshot, key: EarningsSortKey): unknown {
  switch (key) {
    case 'symbol': return row.symbol;
    case 'name': return row.name ?? '';
    case 'resultDate': return row.resultDate;
    case 'daysToResult': return row.daysToResult;
    case 'revQoQ': return row.revenueGrowthQoQ ?? row.revenueGrowth;
    case 'profitQoQ': return row.profitGrowthQoQ ?? row.profitGrowth;
    case 'epsQoQ': return row.epsGrowthQoQ ?? row.epsGrowth;
    case 'consistency': return row.consistencyScore;
    case 'revYoY': return row.revenueGrowthYoY ?? null;
    case 'profitYoY': return row.profitGrowthYoY ?? null;
    case 'epsYoY': return row.epsGrowthYoY ?? null;
    case 'marginTrend': return row.marginTrend;
    case 'acceleration': return row.accelerationScore;
    case 'periodEnd': return row.periodEndDate;
    case 'validatedAt': return row.validatedAt;
  }
}

export function EarningsTable({ rows }: { rows: EarningsIntelligenceSnapshot[] }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const { sortKey, sortDirection, handleSort } = useTableSort<EarningsSortKey>(null, 'desc', () => setPage(0));

  // Reset to page 0 whenever the filtered row set changes (tab/scope change).
  useEffect(() => { setPage(0); }, [rows]);

  // Default (no active sort) preserves the per-tab upstream ordering; a column click sorts client-side.
  const sortedRows = sortRows(rows, sortKey, sortDirection, earningsSortValue);
  const pagedRows = sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const numericCellSx = { whiteSpace: 'nowrap' as const };
  const sortable = (label: ReactNode, columnKey: EarningsSortKey, align?: 'left' | 'center' | 'right', title?: string) => (
    <SortableTableCell
      label={label}
      columnKey={columnKey}
      activeKey={sortKey}
      direction={sortDirection}
      onSort={handleSort}
      align={align}
      title={title}
    />
  );

  return (
    <TableContainer component={Paper} variant="outlined">
      <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pt: 1 }}>
        <Button size="small" onClick={() => setShowAllColumns((v) => !v)}>
          {showAllColumns ? 'Show fewer columns' : 'Show all columns'}
        </Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            {sortable('Symbol', 'symbol')}
            {sortable('Full Name', 'name')}
            {sortable('Result Date', 'resultDate')}
            {sortable('Days To Result', 'daysToResult', 'right')}
            {sortable('Rev QoQ', 'revQoQ', 'right', 'Quarter-over-quarter: latest vs the most recent prior quarter')}
            {sortable('Profit QoQ', 'profitQoQ', 'right', 'Quarter-over-quarter: latest vs the most recent prior quarter')}
            {sortable('EPS QoQ', 'epsQoQ', 'right', 'Quarter-over-quarter: latest vs the most recent prior quarter')}
            {sortable('Consistency', 'consistency', 'right')}
            <TableCell>Technicals</TableCell>
            <TableCell>Signal</TableCell>
            <TableCell>Reasons</TableCell>
            {showAllColumns && (
              <>
                <TableCell>Date Source</TableCell>
                {sortable('Period End', 'periodEnd')}
                {sortable('Validated At', 'validatedAt')}
                {sortable('Rev YoY', 'revYoY', 'right', 'Year-over-year vs the same quarter last year; blank when no year-ago comparable is present yet')}
                {sortable('Profit YoY', 'profitYoY', 'right', 'Year-over-year vs the same quarter last year; blank when no year-ago comparable is present yet')}
                {sortable('EPS YoY', 'epsYoY', 'right', 'Year-over-year vs the same quarter last year; blank when no year-ago comparable is present yet')}
                {sortable('Margin Trend', 'marginTrend', 'right')}
                {sortable('Acceleration', 'acceleration', 'right')}
                <TableCell>Freshness</TableCell>
                <TableCell>Risks</TableCell>
                <TableCell>Warnings</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedRows.map((row, rowIndex) => {
            const sourceFull = row.resultDateSource === 'DATE_TBA' || row.resultDateSource === 'ESTIMATED_FROM_PERIOD_CADENCE'
              ? 'Awaiting official calendar'
              : formatEnum(row.resultDateSource);
            return (
              <TableRow key={rowIndex}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.symbol}</TableCell>
                <TableCell
                  sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={row.name ?? ''}
                >
                  {row.name ?? '—'}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <ResultDateCell resultDate={row.resultDate} resultDateLabel={row.resultDateLabel} />
                </TableCell>
                <TableCell align="right" sx={numericCellSx}>{formatOptional(row.daysToResult)}</TableCell>
                <TableCell align="right" sx={numericCellSx}><GrowthCell value={row.revenueGrowthQoQ} /></TableCell>
                <TableCell align="right" sx={numericCellSx}><GrowthCell value={row.profitGrowthQoQ} /></TableCell>
                <TableCell align="right" sx={numericCellSx}><GrowthCell value={row.epsGrowthQoQ} /></TableCell>
                <TableCell align="right" sx={numericCellSx}>{formatOptional(row.consistencyScore)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><TechnicalsCell row={row} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}><SignalCell signal={row.signal} /></TableCell>
                {(() => {
                  // Reasons collapsed to a single ellipsised line; full list on hover.
                  const reasons = row.reasonTags.map(humanizeCode);
                  const joined = reasons.join(', ');
                  return (
                    <TableCell
                      sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={joined}
                    >
                      {reasons.length > 0
                        ? joined
                        : <Typography variant="body2" color="text.secondary" component="span">No reasons.</Typography>}
                    </TableCell>
                  );
                })()}
                {showAllColumns && (
                  <>
                    <TableCell
                      sx={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={sourceFull}
                    >
                      {sourceFull}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.periodEndDate)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.validatedAt)}</TableCell>
                    <TableCell align="right" sx={numericCellSx}><GrowthCell value={row.revenueGrowthYoY} /></TableCell>
                    <TableCell align="right" sx={numericCellSx}><GrowthCell value={row.profitGrowthYoY} /></TableCell>
                    <TableCell align="right" sx={numericCellSx}><GrowthCell value={row.epsGrowthYoY} /></TableCell>
                    <TableCell align="right" sx={numericCellSx}>{formatPercentPoints(row.marginTrend)}</TableCell>
                    <TableCell align="right" sx={numericCellSx}>{formatOptional(row.accelerationScore)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.freshness || '—'}</TableCell>
                    <TableCell><RiskTags tags={row.riskTags.map(humanizeCode)} /></TableCell>
                    <TableCell><RiskTags tags={(row.warnings || []).map(humanizeCode)} /></TableCell>
                  </>
                )}
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
