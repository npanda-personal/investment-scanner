import {
  Alert,
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '@/shared/components';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchConviction, type ConvictionRow } from '../api/convictionService';

// ---------------------------------------------------------------------------
// Small display helpers (self-contained — the screener cells are an in-flight refactor)
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

function SignalChip({ direction, score }: { direction: ConvictionRow['signalDirection']; score: number | null }) {
  if (!direction) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const color = direction === 'BULLISH' ? 'success' : direction === 'BEARISH' ? 'error' : 'default';
  const label = score != null ? `${direction} ${Math.round(score)}` : direction;
  return <Chip label={label} size="small" color={color} sx={{ fontSize: '0.7rem', fontWeight: 600 }} />;
}

/** Smart-money score cell — every shown value clears the >70 bar, so tint it as conviction. */
function ScoreCell({ value }: { value: number | null }) {
  if (value == null) return <Typography variant="body2" color="text.disabled">—</Typography>;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        minWidth: 34,
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        fontSize: '0.78rem',
        fontWeight: 600,
        bgcolor: 'success.main',
        color: 'common.white',
      }}
    >
      {Math.round(value)}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sortable columns (signal + the four smart-money horizons)
// ---------------------------------------------------------------------------

type SortKey = 'signalScore' | 'sm1m' | 'sm3m' | 'sm6m';
type SortDir = 'asc' | 'desc';

const SM_COLUMNS: { key: Extract<SortKey, `sm${string}`>; label: string }[] = [
  { key: 'sm1m', label: 'SM 1M' },
  { key: 'sm3m', label: 'SM 3M' },
  { key: 'sm6m', label: 'SM 6M' },
];

function sortRows(rows: ConvictionRow[], key: SortKey, dir: SortDir): ConvictionRow[] {
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // nulls always last
    if (bv == null) return -1;
    return dir === 'asc' ? av - bv : bv - av;
  });
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ConvictionPage() {
  const { profile } = useMarketScope();
  const [rows, setRows] = useState<ConvictionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [onlyFnoEligible, setOnlyFnoEligible] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('signalScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const runQuery = useCallback(async (fnoOnly: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchConviction({ onlyFnoEligible: fnoOnly });
      setRows(result.results);
      setWarnings(result.warnings);
      setGeneratedAt(result.generatedAt);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Conviction screen failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Persisted-read: this only reads stored signal + smart-money snapshots (no live fetch).
    runQuery(onlyFnoEligible);
  }, [onlyFnoEligible, runQuery]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  if (profile.isCrypto) {
    return (
      <Box sx={{ p: 3 }}>
        <PageHeader
          title="Conviction"
          subtitle="The conviction screen crosses equity signal scores with smart-money accumulation, which do not apply to crypto."
        />
        <NotApplicableForAssetClass
          feature="Conviction screen"
          detail="Smart-money accumulation and F&O eligibility are equity concepts. For crypto, use the Signal Board tab."
        />
      </Box>
    );
  }

  const sortedRows = sortRows(rows, sortKey, sortDir);

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Conviction"
        subtitle="High-conviction candidates where the signal engine and smart-money accumulation agree across every horizon — signal score ≥ 70 and smart-money score > 70 in 1M, 3M and 6M. Top 20 by signal score."
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          {/* F&O eligibility is an NSE-only construct; hide the filter where derivatives don't apply (US/EU). */}
          {profile.capabilities.hasInstitutionalFlow ? (
            <Tooltip title="Restrict to stocks that are eligible for F&O (derivatives) trading. This typically narrows the list considerably.">
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={onlyFnoEligible}
                    onChange={(e) => setOnlyFnoEligible(e.target.checked)}
                  />
                }
                label={<Typography variant="body2">F&amp;O eligible only</Typography>}
              />
            </Tooltip>
          ) : <span />}
          {!loading && (
            <Typography variant="caption" color="text.secondary">
              {rows.length} {rows.length === 1 ? 'candidate' : 'candidates'}
              {generatedAt ? ` · as of ${new Date(generatedAt).toLocaleString()}` : ''}
            </Typography>
          )}
        </Stack>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {warnings.map((w, i) => (
        <Alert key={i} severity="info" sx={{ mb: 1 }}>{w}</Alert>
      ))}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && rows.length === 0 && !error ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
            No candidates currently meet the conviction bar (signal score ≥ 70 and smart-money score &gt; 70
            across the 1M, 3M and 6M horizons). These thresholds are fixed by design — when signals and
            smart-money next align strongly, candidates will appear here.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Company</TableCell>
                <TableCell sortDirection={sortKey === 'signalScore' ? sortDir : false}>
                  <TableSortLabel
                    active={sortKey === 'signalScore'}
                    direction={sortKey === 'signalScore' ? sortDir : 'desc'}
                    onClick={() => handleSort('signalScore')}
                  >
                    Signal
                  </TableSortLabel>
                </TableCell>
                {SM_COLUMNS.map((col) => (
                  <TableCell key={col.key} align="right" sortDirection={sortKey === col.key ? sortDir : false}>
                    <TableSortLabel
                      active={sortKey === col.key}
                      direction={sortKey === col.key ? sortDir : 'desc'}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.instrumentId} hover>
                  <TableCell>
                    <SymbolLink instrumentId={row.instrumentId} symbol={row.symbol} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={row.companyName}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                        {row.companyName}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <SignalChip direction={row.signalDirection} score={row.signalScore} />
                  </TableCell>
                  <TableCell align="right"><ScoreCell value={row.sm1m} /></TableCell>
                  <TableCell align="right"><ScoreCell value={row.sm3m} /></TableCell>
                  <TableCell align="right"><ScoreCell value={row.sm6m} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
