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
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '@/shared/components';
import { inr } from '@/shared/format/money';
import type { ScreenerFilters, ScreenerRow, ScreenerCapBand, ScreenerSignalDirection } from '../types';
import { fetchScreener } from '../api/screenerService';

// ---------------------------------------------------------------------------
// Small display helpers
// ---------------------------------------------------------------------------

function SymbolLink({ instrumentId, symbol }: { instrumentId: string; symbol: string }) {
  return (
    <Typography
      component={RouterLink}
      to={`/stocks/${instrumentId}`}
      variant="body2"
      sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
      color="primary"
    >
      {symbol}
    </Typography>
  );
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

function CapBandChip({ capBand }: { capBand: ScreenerCapBand | null }) {
  if (!capBand) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const color: Record<ScreenerCapBand, 'primary' | 'secondary' | 'default'> = {
    LARGE: 'primary',
    MID: 'secondary',
    SMALL: 'default',
  };
  return <Chip label={capBand} size="small" color={color[capBand]} variant="outlined" sx={{ fontSize: '0.7rem' }} />;
}

function NullableNum({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  if (value == null) return <Typography variant="body2" color="text.disabled">—</Typography>;
  return <Typography variant="body2">{value.toFixed(1)}{suffix}</Typography>;
}

// ---------------------------------------------------------------------------
// Known NSE sectors for the sector dropdown
// ---------------------------------------------------------------------------

const KNOWN_SECTORS = [
  'AUTOMOBILE AND AUTO COMPONENTS',
  'CAPITAL GOODS',
  'CHEMICALS',
  'CONSTRUCTION',
  'CONSTRUCTION MATERIALS',
  'CONSUMER DURABLES',
  'CONSUMER SERVICES',
  'DIVERSIFIED',
  'FAST MOVING CONSUMER GOODS',
  'FINANCIAL SERVICES',
  'FOREST MATERIALS',
  'HEALTHCARE',
  'INFORMATION TECHNOLOGY',
  'MEDIA ENTERTAINMENT AND PUBLICATION',
  'METALS AND MINING',
  'OIL GAS AND CONSUMABLE FUELS',
  'POWER',
  'REALTY',
  'SERVICES',
  'TELECOMMUNICATION',
  'TEXTILES',
  'UTILITIES',
];

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
  const [filters, setFilters] = useState<ScreenerFilters>(DEFAULT_FILTERS);
  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

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
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilter = <K extends keyof ScreenerFilters>(key: K) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Stock Screener"
        subtitle="Filter the NSE/BSE universe by signal, sector, cap-band, delivery, and 52-week position."
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
                <MenuItem value="LARGE">Large Cap (&gt; ₹20,000 Cr)</MenuItem>
                <MenuItem value="MID">Mid Cap (₹5,000–20,000 Cr)</MenuItem>
                <MenuItem value="SMALL">Small Cap (&lt; ₹5,000 Cr)</MenuItem>
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

          {/* Min Delivery % */}
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
                <TableCell>Symbol</TableCell>
                <TableCell>Company</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Signal</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell align="right">RS %ile</TableCell>
                <TableCell>Sector</TableCell>
                <TableCell>Cap Band</TableCell>
                <TableCell align="right">Delivery %</TableCell>
                <TableCell align="right">52W Pos %</TableCell>
                <TableCell>F&O Ban</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.instrumentId} hover>
                  <TableCell>
                    <SymbolLink instrumentId={row.instrumentId} symbol={row.symbol} />
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
                      {row.price != null ? inr(row.price) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <SignalChip direction={row.signalDirection} score={row.signalScore} />
                  </TableCell>
                  <TableCell align="right">
                    <NullableNum value={row.signalScore} />
                  </TableCell>
                  <TableCell align="right">
                    <NullableNum value={row.rsPercentile} />
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
                  <TableCell align="right">
                    <NullableNum value={row.deliveryPct} suffix="%" />
                  </TableCell>
                  <TableCell align="right">
                    <NullableNum value={row.range52wPositionPct} suffix="%" />
                  </TableCell>
                  <TableCell>
                    {row.inFnoBan
                      ? <Chip label="Banned" size="small" color="warning" sx={{ fontSize: '0.65rem' }} />
                      : <Typography variant="body2" color="text.disabled">—</Typography>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
