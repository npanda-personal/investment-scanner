import {
  Alert,
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/shared/components';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { compactByProfile, money } from '@/shared/format/money';
import { screenerSubtitle as buildScreenerSubtitle } from '@/shared/format/exchangeLabels';
import type { ScreenerFilters, ScreenerRow, ScreenerCapBand, ScreenerSignalDirection } from '../types';
import type { WorkspaceSource } from '@/shared/workspace/types';
import { fetchScreener } from '../api/screenerService';
import {
  SymbolLink,
  SignalChip,
  CapBandChip,
  NullableNum,
  RsRatingCell,
  ScoreDeltaCell,
  FactorBreakdownCell,
  PriceSparklineCell,
  FnoScreenerHeaderCells,
  FnoScreenerBodyCells,
} from './screener/ScreenerCells';

import { KNOWN_SECTORS } from './screener-constants';
import { type SortKey, sortScreenerRows, SortHead } from './screener-sort';

// ---------------------------------------------------------------------------
// Default filter state
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: ScreenerFilters = {
  limit: 50,
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ScreenerPage() {
  const { profile, scope } = useMarketScope();
  // India-only NSE/BSE features (delivery %, F&O ban) — gate by capability.
  const hasDelivery = profile.capabilities.hasDelivery;
  const screenerSubtitle = buildScreenerSubtitle(scope);
  const [filters, setFilters] = useState<ScreenerFilters>(DEFAULT_FILTERS);
  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>('signalScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const handleSort = (k: SortKey) => { if (k === sortKey) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); } else { setSortKey(k); setSortDir('desc'); } setPage(0); };

  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runQuery = useCallback((f: ScreenerFilters) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchScreener(f);
        setRows(result.results);
        setWarnings(result.warnings);
        setGeneratedAt(result.generatedAt);
        setCount(result.count);
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || 'Screener query failed');
        setRows([]);
        setCount(null);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  useEffect(() => {
    runQuery(filters);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const setFilter = <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => {
    setPage(0);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilter = <K extends keyof ScreenerFilters>(key: K) => {
    setPage(0);
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (profile.isCrypto) {
    return (
      <Box sx={{ p: 3 }}>
        <PageHeader
          title="Screener"
          subtitle="The equity Screener filters stocks by fundamentals, delivery, and F&O criteria that do not apply to crypto."
        />
        <NotApplicableForAssetClass
          feature="Screener"
          detail="For crypto, use the Signal Board tab — it ranks coins by persisted bull/bear signals, momentum, and technicals."
        />
      </Box>
    );
  }

  const sortedRows = sortScreenerRows(rows, sortKey, sortDir);
  const screenerSource: WorkspaceSource = {
    label: 'Screener',
    items: sortedRows.map((r) => ({ instrumentId: r.instrumentId, symbol: r.symbol, companyName: r.companyName })),
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Screener"
        subtitle={screenerSubtitle}
      />

      {/* Filter Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          {/* Signal Direction */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Signal Direction</InputLabel>
              <Select
                label="Signal Direction"
                value={filters.signalDirection ?? ''}
                onChange={(e) => {
                  const v = e.target.value as ScreenerSignalDirection | '';
                  if (v) setFilter('signalDirection', v); else clearFilter('signalDirection');
                }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="BULLISH">Bullish</MenuItem>
                <MenuItem value="BEARISH">Bearish</MenuItem>
                <MenuItem value="NEUTRAL">Neutral</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Sector */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sector</InputLabel>
              <Select
                label="Sector"
                value={filters.sector ?? ''}
                onChange={(e) => {
                  const v = e.target.value as string;
                  if (v) setFilter('sector', v); else clearFilter('sector');
                }}
              >
                <MenuItem value="">Any</MenuItem>
                {KNOWN_SECTORS.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Cap Band */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Cap Band</InputLabel>
              <Select
                label="Cap Band"
                value={filters.capBand ?? ''}
                onChange={(e) => {
                  const v = e.target.value as ScreenerCapBand | '';
                  if (v) setFilter('capBand', v); else clearFilter('capBand');
                }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="LARGE">{`Large Cap (> ${compactByProfile(2e11, profile)})`}</MenuItem>
                <MenuItem value="MID">{`Mid Cap (${compactByProfile(5e10, profile)}–${compactByProfile(2e11, profile)})`}</MenuItem>
                <MenuItem value="SMALL">{`Small Cap (< ${compactByProfile(5e10, profile)})`}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Min Score */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Min Signal Score"
              type="number"
              inputProps={{ min: 0, max: 100, step: 1 }}
              value={filters.minScore ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                if (v == null) clearFilter('minScore'); else setFilter('minScore', v);
              }}
              placeholder="e.g. 60"
            />
          </Grid>

          {/* Min RS Percentile */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Min RS Percentile"
              type="number"
              inputProps={{ min: 0, max: 100, step: 1 }}
              value={filters.minRsPercentile ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                if (v == null) clearFilter('minRsPercentile'); else setFilter('minRsPercentile', v);
              }}
              placeholder="e.g. 70"
            />
          </Grid>

          {/* Min Delivery % (India-only NSE/BSE delivery data) */}
          {hasDelivery && (
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Min Delivery % {filters.minDeliveryPct != null ? `(≥ ${filters.minDeliveryPct}%)` : '(any)'}
              </Typography>
              <Slider
                size="small"
                min={0}
                max={100}
                step={5}
                value={filters.minDeliveryPct ?? 0}
                onChange={(_e, val) => {
                  const v = val as number;
                  if (v === 0) clearFilter('minDeliveryPct'); else setFilter('minDeliveryPct', v);
                }}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
              />
            </Box>
          </Grid>
          )}

          {/* Min 52w Position % */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Min 52W Position % {filters.min52wPositionPct != null ? `(≥ ${filters.min52wPositionPct}%)` : '(any)'}
              </Typography>
              <Slider
                size="small"
                min={0}
                max={100}
                step={5}
                value={filters.min52wPositionPct ?? 0}
                onChange={(_e, val) => {
                  const v = val as number;
                  if (v === 0) clearFilter('min52wPositionPct'); else setFilter('min52wPositionPct', v);
                }}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
              />
            </Box>
          </Grid>

          {/* Exclude F&O Ban + Limit */}
          <Grid item xs={12} sm={6} md={3}>
            <Stack spacing={1}>
              {hasDelivery && (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={filters.onlyDerivativesEligible ?? false}
                    onChange={(e) => {
                      if (e.target.checked) setFilter('onlyDerivativesEligible', true);
                      else clearFilter('onlyDerivativesEligible');
                    }}
                  />
                }
                label={<Typography variant="body2">F&amp;O eligible only (rank by readiness)</Typography>}
              />
              )}
              {hasDelivery && (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={filters.excludeFnoBan ?? false}
                    onChange={(e) => {
                      if (e.target.checked) setFilter('excludeFnoBan', true);
                      else clearFilter('excludeFnoBan');
                    }}
                  />
                }
                label={<Typography variant="body2">Exclude F&amp;O Ban</Typography>}
              />
              )}
              <TextField
                size="small"
                label="Limit"
                type="number"
                inputProps={{ min: 1, max: 500, step: 10 }}
                value={filters.limit ?? 50}
                onChange={(e) => setFilter('limit', Math.max(1, Math.min(500, Number(e.target.value) || 50)))}
                sx={{ width: 90 }}
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading Bar */}
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {/* Status Line */}
      {!loading && count != null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {count} {count === 1 ? 'stock' : 'stocks'} matched
          {generatedAt ? ` · as of ${new Date(generatedAt).toLocaleTimeString()}` : ''}
        </Typography>
      )}

      {/* Warnings */}
      {warnings.map((w, i) => (
        <Alert key={i} severity="info" sx={{ mb: 1 }}>{w}</Alert>
      ))}

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Results Table */}
      {!loading && rows.length === 0 && !error ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No stocks match these filters. Try relaxing one or more criteria.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <SortHead label="Symbol" colKey="symbol" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <TableCell>Company</TableCell>
                <SortHead label="Price" colKey="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                <TableCell>Signal</TableCell>
                <SortHead label="Score" colKey="signalScore" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                <SortHead label="Move" colKey="scoreDeltaPrev" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="center" />
                <SortHead label="RS Rating" colKey="rsPercentile" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                <TableCell>Factors</TableCell>
                <TableCell align="center">Trend</TableCell>
                <TableCell>Sector</TableCell>
                <TableCell>Cap Band</TableCell>
                {hasDelivery && <SortHead label="Delivery %" colKey="deliveryPct" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />}
                <SortHead label="52W Pos %" colKey="range52wPositionPct" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                {hasDelivery && <TableCell>F&O Ban</TableCell>}
                {hasDelivery && <FnoScreenerHeaderCells />}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                <TableRow key={row.instrumentId} hover>
                  <TableCell>
                    <SymbolLink instrumentId={row.instrumentId} symbol={row.symbol} source={screenerSource} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={row.companyName}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {row.companyName}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {row.price != null ? money(row.price, profile.currency) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <SignalChip direction={row.signalDirection} score={row.signalScore} />
                  </TableCell>
                  <TableCell align="right">
                    <NullableNum value={row.signalScore} />
                  </TableCell>
                  <TableCell align="center">
                    <ScoreDeltaCell delta={row.scoreDeltaPrev} isNew={row.isNewEntry} />
                  </TableCell>
                  <TableCell align="right">
                    <RsRatingCell percentile={row.rsPercentile} />
                  </TableCell>
                  <TableCell>
                    <FactorBreakdownCell families={row.factorFamilies} />
                  </TableCell>
                  <TableCell align="center">
                    <PriceSparklineCell closes={row.sparkline} />
                  </TableCell>
                  <TableCell>
                    {row.sector
                      ? <Chip label={row.sector} size="small" variant="outlined" sx={{ fontSize: '0.65rem', maxWidth: 160 }} />
                      : <Typography variant="body2" color="text.disabled">—</Typography>
                    }
                  </TableCell>
                  <TableCell>
                    <CapBandChip capBand={row.capBand} />
                  </TableCell>
                  {hasDelivery && (
                  <TableCell align="right">
                    <NullableNum value={row.deliveryPct} suffix="%" />
                  </TableCell>
                  )}
                  <TableCell align="right">
                    <NullableNum value={row.range52wPositionPct} suffix="%" />
                  </TableCell>
                  {hasDelivery && (
                  <TableCell>
                    {row.inFnoBan
                      ? <Chip label="Banned" size="small" color="warning" sx={{ fontSize: '0.65rem' }} />
                      : <Typography variant="body2" color="text.disabled">—</Typography>
                    }
                  </TableCell>
                  )}
                  {hasDelivery && <FnoScreenerBodyCells row={row} />}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={sortedRows.length}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </TableContainer>
      )}
    </Box>
  );
}
