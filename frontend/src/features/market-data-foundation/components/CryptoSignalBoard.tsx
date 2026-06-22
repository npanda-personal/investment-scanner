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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '@/shared/components';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { compact, money } from '@/shared/format/money';
import {
  fetchCryptoBoard,
  type CryptoBoardConfidence,
  type CryptoBoardDirection,
  type CryptoBoardParams,
  type CryptoBoardRow,
  type CryptoBoardSortBy,
} from '../api/cryptoBoardApi';

// ---------------------------------------------------------------------------
// Display helpers (pure formatters — NO derivation of business values)
// ---------------------------------------------------------------------------

const pct = (value: number | null | undefined): string =>
  value == null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const num = (value: number | null | undefined, digits = 1): string =>
  value == null ? '—' : value.toFixed(digits);

const pctColor = (value: number | null | undefined): 'success.main' | 'error.main' | 'text.primary' =>
  value == null ? 'text.primary' : value >= 0 ? 'success.main' : 'error.main';

function DirectionChip({ direction, score, confidence }: {
  direction: CryptoBoardDirection | null;
  score: number | null;
  confidence: CryptoBoardConfidence | null;
}) {
  if (!direction) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const color = direction === 'BULLISH' ? 'success' : direction === 'BEARISH' ? 'error' : 'default';
  const label = score != null ? `${direction} ${Math.round(score)}` : direction;
  return (
    <Tooltip title={`Signal: ${direction}${score != null ? ` (score ${Math.round(score)})` : ''}${confidence ? ` · ${confidence} confidence` : ''}`}>
      <Chip label={label} size="small" color={color} sx={{ fontSize: '0.7rem', fontWeight: 600 }} />
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Sortable column definitions (each maps to the backend sortBy whitelist)
// ---------------------------------------------------------------------------

interface SortableCol {
  key: CryptoBoardSortBy;
  label: string;
  align: 'left' | 'right' | 'center';
}

const SORTABLE_COLS: SortableCol[] = [
  { key: 'rank', label: 'Rank', align: 'right' },
  { key: 'marketCap', label: 'Market Cap', align: 'right' },
  { key: 'quoteVolume24h', label: 'Vol 24h', align: 'right' },
  { key: 'pctChange1d', label: '24h', align: 'right' },
  { key: 'pctChange7d', label: '7d', align: 'right' },
  { key: 'signalScore', label: 'Signal', align: 'center' },
  { key: 'rsi14', label: 'RSI14', align: 'right' },
  { key: 'distanceFromAthPct', label: 'From ATH', align: 'right' },
];

const DEFAULT_PARAMS: CryptoBoardParams = {
  sortBy: 'marketCap',
  sortOrder: 'desc',
  limit: 100,
};

/**
 * Crypto Signal Board — sortable/filterable persisted-read table of the crypto
 * daily-metric board (bull/bear evidence set). Reads ONLY GET /crypto/board; the
 * backend computes and stores every value. No FE computation/derivation.
 *
 * Rendered as the crypto tab inside the Discover workspace (profile.isCrypto).
 */
export default function CryptoSignalBoard() {
  const { profile } = useMarketScope();
  // Volume-spike UI is gated on the hasVolumeInterest capability flag.
  const hasVolumeInterest = profile.capabilities.hasVolumeInterest;

  const [params, setParams] = useState<CryptoBoardParams>(DEFAULT_PARAMS);
  const [rows, setRows] = useState<CryptoBoardRow[]>([]);
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runQuery = useCallback((p: CryptoBoardParams) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCryptoBoard(p);
        setRows(result.rows);
        setSnapshotDate(result.snapshot_date);
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || 'Crypto board query failed');
        setRows([]);
        setSnapshotDate(null);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  useEffect(() => {
    runQuery(params);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setParam = <K extends keyof CryptoBoardParams>(key: K, value: CryptoBoardParams[K]) => {
    setPage(0);
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const clearParam = <K extends keyof CryptoBoardParams>(key: K) => {
    setPage(0);
    setParams((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSort = (key: CryptoBoardSortBy) => {
    setPage(0);
    setParams((prev) => {
      const isSame = prev.sortBy === key;
      const nextOrder: 'asc' | 'desc' = isSame && prev.sortOrder === 'desc' ? 'asc' : 'desc';
      return { ...prev, sortBy: key, sortOrder: nextOrder };
    });
  };

  if (!profile.isCrypto) {
    return (
      <Box sx={{ p: 3 }}>
        <PageHeader title="Crypto Signal Board" subtitle="Switch the market scope to Crypto to view this board." />
        <NotApplicableForAssetClass
          feature="Crypto Signal Board"
          detail="This board is only available under the Crypto asset class. Use the market-scope selector to switch to Crypto."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Crypto Signal Board"
        subtitle="Rank coins by persisted bull/bear signals, momentum, and technicals (24/7, USD)."
      />

      {/* Filter Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Signal Direction</InputLabel>
              <Select
                label="Signal Direction"
                value={params.direction ?? ''}
                onChange={(e) => {
                  const v = e.target.value as CryptoBoardDirection | '';
                  if (v) setParam('direction', v); else clearParam('direction');
                }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="BULLISH">Bullish</MenuItem>
                <MenuItem value="NEUTRAL">Neutral</MenuItem>
                <MenuItem value="BEARISH">Bearish</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Min Confidence</InputLabel>
              <Select
                label="Min Confidence"
                value={params.minConfidence ?? ''}
                onChange={(e) => {
                  const v = e.target.value as CryptoBoardConfidence | '';
                  if (v) setParam('minConfidence', v); else clearParam('minConfidence');
                }}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="LOW">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Min Signal Score"
              type="number"
              inputProps={{ min: 0, max: 100, step: 1 }}
              value={params.minScore ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? undefined : Number(e.target.value);
                if (v == null) clearParam('minScore'); else setParam('minScore', v);
              }}
              placeholder="e.g. 60"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Limit"
              type="number"
              inputProps={{ min: 1, max: 500, step: 10 }}
              value={params.limit ?? 100}
              onChange={(e) => setParam('limit', Math.max(1, Math.min(500, Number(e.target.value) || 100)))}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {hasVolumeInterest && (
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={params.volumeSpikeOnly ?? false}
                      onChange={(e) => {
                        if (e.target.checked) setParam('volumeSpikeOnly', true);
                        else clearParam('volumeSpikeOnly');
                      }}
                    />
                  }
                  label={<Typography variant="body2">Volume spike only</Typography>}
                />
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={params.near52wHigh ?? false}
                    onChange={(e) => {
                      if (e.target.checked) setParam('near52wHigh', true);
                      else clearParam('near52wHigh');
                    }}
                  />
                }
                label={<Typography variant="body2">Near 52-week high</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={params.goldenCrossOnly ?? false}
                    onChange={(e) => {
                      if (e.target.checked) setParam('goldenCrossOnly', true);
                      else clearParam('goldenCrossOnly');
                    }}
                  />
                }
                label={<Typography variant="body2">Golden cross only</Typography>}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {!loading && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {rows.length} {rows.length === 1 ? 'coin' : 'coins'} matched
          {snapshotDate ? ` · as of ${snapshotDate}` : ''}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && rows.length === 0 && !error ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No coins match these filters. Try relaxing one or more criteria.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Coin</TableCell>
                {SORTABLE_COLS.map((col) => (
                  <TableCell key={col.key} align={col.align} sortDirection={params.sortBy === col.key ? params.sortOrder : false}>
                    <TableSortLabel
                      active={params.sortBy === col.key}
                      direction={params.sortBy === col.key ? params.sortOrder : 'desc'}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell align="right">Price</TableCell>
                {hasVolumeInterest && <TableCell align="center">Vol Spike</TableCell>}
                <TableCell>Cross</TableCell>
                <TableCell align="right">Funding %</TableCell>
                <TableCell align="right">TVL</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                <TableRow key={row.instrument_id} hover>
                  <TableCell>
                    <Typography
                      component={RouterLink}
                      to={`/stocks/${row.instrument_id}`}
                      variant="body2"
                      sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      color="primary"
                    >
                      {row.symbol}
                    </Typography>
                    {row.name && (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 160 }}>
                        {row.name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{row.rank ?? '—'}</TableCell>
                  <TableCell align="right">{row.market_cap != null ? compact(row.market_cap, 'USD') : '—'}</TableCell>
                  <TableCell align="right">{row.quote_volume_24h != null ? compact(row.quote_volume_24h, 'USD') : '—'}</TableCell>
                  <TableCell align="right" sx={{ color: pctColor(row.pct_change_1d) }}>{pct(row.pct_change_1d)}</TableCell>
                  <TableCell align="right" sx={{ color: pctColor(row.pct_change_7d) }}>{pct(row.pct_change_7d)}</TableCell>
                  <TableCell align="center"><DirectionChip direction={row.signal_direction} score={row.signal_score} confidence={row.signal_confidence} /></TableCell>
                  <TableCell align="right">{num(row.rsi14)}</TableCell>
                  <TableCell align="right">{pct(row.distance_from_ath_pct)}</TableCell>
                  <TableCell align="right">{row.price != null ? money(row.price, 'USD') : '—'}</TableCell>
                  {hasVolumeInterest && (
                    <TableCell align="center">
                      {row.volume_spike
                        ? <Chip label="Spike" size="small" color="warning" sx={{ fontSize: '0.65rem' }} />
                        : <Typography variant="body2" color="text.disabled">—</Typography>}
                    </TableCell>
                  )}
                  <TableCell>
                    {row.cross_state
                      ? <Chip label={row.cross_state} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                      : <Typography variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell align="right">{num(row.funding_rate_pct, 4)}</TableCell>
                  <TableCell align="right">{row.tvl_usd != null ? compact(row.tvl_usd, 'USD') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={rows.length}
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

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        For research support only, not financial advice. All values are persisted from the daily crypto pipeline.
      </Typography>
    </Box>
  );
}
