/**
 * Top F&O Readiness Widget
 *
 * Ranks F&O-eligible stocks by a research-support "readiness" composite that
 * blends the persisted signal score with already-stored F&O / technical factors
 * (OI build-up, PCR, delivery %, relative strength, 52-week trend). Surfaces the
 * top 20 candidates. Persisted-read only — calls the screener with
 * `onlyDerivativesEligible=true`; no live fetch.
 *
 * Descriptive signal quality, never trade advice.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Box, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Tooltip, Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { fetchScreener, type ScreenerRow, type FnoReadinessComponents } from '@/features/market-data-foundation';

const TOP_N = 20;

// The five sub-scores behind the readiness composite, in weight order.
const BAR_DEFS: Array<{ key: keyof FnoReadinessComponents; full: string }> = [
  { key: 'signal', full: 'Signal' },
  { key: 'relativeStrength', full: 'Relative strength' },
  { key: 'derivativesPositioning', full: 'Derivatives positioning' },
  { key: 'delivery', full: 'Delivery' },
  { key: 'trend', full: '52-week trend' },
];

/** Inline 5-bar breakdown of the readiness composite (each sub-score 0–100). */
function ComponentBars({ components }: { components: FnoReadinessComponents | null }) {
  if (!components) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const tip = (
    <Box sx={{ fontSize: '0.7rem', lineHeight: 1.6 }}>
      {BAR_DEFS.map((b) => <div key={b.key}>{b.full}: {Math.round(components[b.key])}</div>)}
      <Box sx={{ mt: 0.5, opacity: 0.8 }}>Each 0–100; weighted into the readiness score.</Box>
    </Box>
  );
  return (
    <Tooltip title={tip}>
      <Box sx={{ display: 'inline-flex', alignItems: 'flex-end', gap: 0.4, height: 22 }}>
        {BAR_DEFS.map((b) => {
          const v = Math.max(0, Math.min(100, components[b.key]));
          const color = v >= 67 ? 'success.main' : v >= 34 ? 'warning.main' : 'error.light';
          return (
            <Box key={b.key} sx={{ width: 6, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <Box sx={{ width: '100%', height: `${Math.max(8, v)}%`, bgcolor: color, borderRadius: 0.5 }} />
            </Box>
          );
        })}
      </Box>
    </Tooltip>
  );
}

function gradeColor(grade: string | null): 'success' | 'info' | 'default' {
  if (grade === 'A') return 'success';
  if (grade === 'B') return 'info';
  return 'default';
}

const BUILDUP_LABELS: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
  LONG_BUILDUP: { label: 'Long buildup', color: 'success' },
  SHORT_COVERING: { label: 'Short covering', color: 'success' },
  SHORT_BUILDUP: { label: 'Short buildup', color: 'error' },
  LONG_UNWINDING: { label: 'Long unwinding', color: 'warning' },
  NEUTRAL: { label: 'Neutral', color: 'default' },
};

function BuildupChip({ label }: { label: string | null }) {
  if (!label) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const meta = BUILDUP_LABELS[label.toUpperCase()] ?? { label, color: 'default' as const };
  return <Chip label={meta.label} size="small" color={meta.color} variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />;
}

function ReadinessCell({ row }: { row: ScreenerRow }) {
  const score = row.fnoReadinessScore;
  if (score == null) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const c = row.fnoComponents;
  const tip = c ? (
    <Box sx={{ fontSize: '0.7rem' }}>
      <div>Signal: {Math.round(c.signal)}</div>
      <div>Relative strength: {Math.round(c.relativeStrength)}</div>
      <div>Derivatives positioning: {Math.round(c.derivativesPositioning)}</div>
      <div>Delivery: {Math.round(c.delivery)}</div>
      <div>52-week trend: {Math.round(c.trend)}</div>
    </Box>
  ) : 'Composite readiness';
  return (
    <Tooltip title={tip}>
      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
        <Typography variant="body2" fontWeight={700}>{Math.round(score)}</Typography>
        <Chip label={row.fnoGrade ?? '—'} size="small" color={gradeColor(row.fnoGrade)} sx={{ fontSize: '0.62rem', height: 18, fontWeight: 700 }} />
      </Stack>
    </Tooltip>
  );
}

type SortKey = 'fnoReadinessScore' | 'signalScore' | 'rsPercentile' | 'deliveryPct' | 'pcrOi';
const ROWS_PER_PAGE = 10;

export default function TopFnoReadinessWidget() {
  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<SortKey>('fnoReadinessScore');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const handleSort = (key: SortKey) => {
    if (orderBy === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setOrderBy(key); setOrder('desc'); }
    setPage(0);
  };

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[orderBy] as number | null;
      const bv = b[orderBy] as number | null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;   // nulls always last
      if (bv == null) return -1;
      return order === 'asc' ? av - bv : bv - av;
    });
    return arr;
  }, [rows, orderBy, order]);

  const paged = sorted.slice(page * ROWS_PER_PAGE, page * ROWS_PER_PAGE + ROWS_PER_PAGE);

  const sortHead = (k: SortKey, label: string, align?: 'right') => (
    <TableCell align={align} sortDirection={orderBy === k ? order : false}>
      <TableSortLabel active={orderBy === k} direction={orderBy === k ? order : 'desc'} onClick={() => handleSort(k)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchScreener({ onlyDerivativesEligible: true, limit: TOP_N });
        if (!active) return;
        setRows(result.results);
        setGeneratedAt(result.generatedAt);
      } catch (err: any) {
        if (!active) return;
        setError(err?.response?.data?.error || err?.message || 'Could not load F&O readiness ranking.');
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.25} sx={{ mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700}>Top F&amp;O Candidates by Readiness</Typography>
        <Typography variant="caption" color="text.secondary">
          F&amp;O-eligible stocks ranked by a composite signal-quality score blending the signal score with
          OI build-up, PCR, delivery, relative strength and 52-week trend. Grade A/B/C reflects overall
          confluence; the Breakdown bars show each contributing factor (hover for values). Research support only — not advice.
          {generatedAt ? ` · as of ${new Date(generatedAt).toLocaleTimeString()}` : ''}
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
      ) : error ? (
        <Typography variant="body2" color="error" sx={{ py: 2 }}>{error}</Typography>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No F&amp;O readiness data available yet. Run the F&amp;O bhavcopy ingest to populate positioning metrics.
        </Typography>
      ) : (
        <>
        <TableContainer sx={{ maxHeight: 232 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Symbol</TableCell>
                {sortHead('fnoReadinessScore', 'Readiness', 'right')}
                <TableCell>Breakdown</TableCell>
                {sortHead('signalScore', 'Signal')}
                {sortHead('rsPercentile', 'RS %ile', 'right')}
                {sortHead('deliveryPct', 'Delivery %', 'right')}
                <TableCell>OI build-up</TableCell>
                {sortHead('pcrOi', 'PCR', 'right')}
                <TableCell>F&O Ban</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paged.map((row, i) => (
                <TableRow key={row.instrumentId} hover>
                  <TableCell>{page * ROWS_PER_PAGE + i + 1}</TableCell>
                  <TableCell>
                    <Typography
                      component={RouterLink}
                      to={`/stocks/${row.instrumentId}`}
                      variant="body2"
                      color="primary"
                      sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {row.symbol}
                    </Typography>
                  </TableCell>
                  <TableCell align="right"><ReadinessCell row={row} /></TableCell>
                  <TableCell><ComponentBars components={row.fnoComponents} /></TableCell>
                  <TableCell>
                    {row.signalDirection
                      ? <Chip
                          label={`${row.signalDirection}${row.signalScore != null ? ` ${Math.round(row.signalScore)}` : ''}`}
                          size="small"
                          color={row.signalDirection === 'BULLISH' ? 'success' : row.signalDirection === 'BEARISH' ? 'error' : 'default'}
                          sx={{ fontSize: '0.62rem', height: 18, fontWeight: 600 }}
                        />
                      : <Typography variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell align="right">
                    {row.rsPercentile != null ? Math.round(row.rsPercentile) : <Typography component="span" variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell align="right">
                    {row.deliveryPct != null ? `${row.deliveryPct.toFixed(1)}%` : <Typography component="span" variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell><BuildupChip label={row.buildupLabel} /></TableCell>
                  <TableCell align="right">
                    {row.pcrOi != null ? row.pcrOi.toFixed(2) : <Typography component="span" variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell>
                    {row.inFnoBan
                      ? <Chip label="Banned" size="small" color="warning" sx={{ fontSize: '0.6rem', height: 18 }} />
                      : <Typography variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={sorted.length}
          page={page}
          onPageChange={(_e, p) => setPage(p)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
          sx={{ '& .MuiTablePagination-toolbar': { minHeight: 40 } }}
        />
        </>
      )}
    </Paper>
  );
}
