import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import TableSortLabel from '@mui/material/TableSortLabel';
import { PageHeader } from '@/shared/components/PageHeader';
import { inr, inrCompact, changeColor } from '@/shared/format/money';
import { humanizeCode } from '@/shared/format/enumLabels';
import { fetchIndexConstituents } from '../api/marketIntelligenceService';
import type { IndexConstituentRow, IndexConstituentsEnvelope, SupportedIndex } from '../types';

// ─── Index options ───────────────────────────────────────────────────────────

const INDEX_OPTIONS: Array<{ value: SupportedIndex; label: string; size: number }> = [
  { value: 'NIFTY_50', label: 'Nifty 50', size: 50 },
  { value: 'NIFTY_BANK', label: 'Nifty Bank', size: 12 },
];

// ─── Signal chip ────────────────────────────────────────────────────────────

function SignalChip({ direction }: { direction: string | null }) {
  if (!direction) return <Chip size="small" label="No signal" variant="outlined" color="default" />;
  const color =
    direction === 'BULLISH' ? 'success' :
    direction === 'BEARISH' ? 'error' :
    'warning';
  return <Chip size="small" color={color} variant="outlined" label={humanizeCode(direction)} />;
}

// ─── Breadth bar ────────────────────────────────────────────────────────────

function BreadthBar({ breadth, total }: { breadth: IndexConstituentsEnvelope['breadth']; total: number }) {
  if (total === 0) return null;
  const bullPct = (breadth.bullishCount / total) * 100;
  const bearPct = (breadth.bearishCount / total) * 100;
  const neutralPct = (breadth.neutralCount / total) * 100;

  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary">
        {breadth.headline} &mdash; {breadth.bearishCount} bearish &mdash; {breadth.neutralCount} neutral
      </Typography>
      <Box sx={{ display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
        <Tooltip title={`${breadth.bullishCount} Bullish`}>
          <Box sx={{ width: `${bullPct}%`, bgcolor: 'success.main' }} />
        </Tooltip>
        <Tooltip title={`${breadth.neutralCount} Neutral`}>
          <Box sx={{ width: `${neutralPct}%`, bgcolor: 'warning.main' }} />
        </Tooltip>
        <Tooltip title={`${breadth.bearishCount} Bearish`}>
          <Box sx={{ width: `${bearPct}%`, bgcolor: 'error.main' }} />
        </Tooltip>
      </Box>
    </Stack>
  );
}

// ─── Sort helpers ────────────────────────────────────────────────────────────

type SortKey = 'symbol' | 'latestPrice' | 'change1D' | 'signalScore' | 'marketCap' | 'sector';
type SortOrder = 'asc' | 'desc';

function sortedRows(
  rows: IndexConstituentRow[],
  key: SortKey,
  order: SortOrder,
): IndexConstituentRow[] {
  return [...rows].sort((a, b) => {
    let av: string | number | null;
    let bv: string | number | null;

    switch (key) {
      case 'symbol': av = a.symbol; bv = b.symbol; break;
      case 'latestPrice': av = a.latestPrice; bv = b.latestPrice; break;
      case 'change1D': av = a.change1D; bv = b.change1D; break;
      case 'signalScore': av = a.signalScore; bv = b.signalScore; break;
      case 'marketCap': av = a.marketCap; bv = b.marketCap; break;
      case 'sector': av = a.sector; bv = b.sector; break;
      default: av = null; bv = null;
    }

    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;

    if (typeof av === 'string' && typeof bv === 'string') {
      const cmp = av.localeCompare(bv);
      return order === 'asc' ? cmp : -cmp;
    }

    const diff = (av as number) - (bv as number);
    return order === 'asc' ? diff : -diff;
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function IndexConstituentsPage() {
  const [selectedIndex, setSelectedIndex] = useState<SupportedIndex>('NIFTY_50');
  const [envelope, setEnvelope] = useState<IndexConstituentsEnvelope | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('symbol');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    setLoading(true);
    setEnvelope(null);
    fetchIndexConstituents(selectedIndex)
      .then(setEnvelope)
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to load index constituents';
        setEnvelope({
          availability: 'ERROR',
          index: selectedIndex,
          indexLabel: selectedIndex,
          membershipSource: 'CURATED_STATIC',
          membershipAsOf: '',
          constituents: [],
          count: 0,
          breadth: { total: 0, bullishCount: 0, bearishCount: 0, neutralCount: 0, noSignalCount: 0, headline: '' },
          message: msg,
          warnings: [msg],
        });
      })
      .finally(() => setLoading(false));
  }, [selectedIndex]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const indexOption = INDEX_OPTIONS.find((o) => o.value === selectedIndex);
  const rows = envelope ? sortedRows(envelope.constituents, sortKey, sortOrder) : [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Index Constituents"
        subtitle="Scan an index's internal members — latest signal, price, and 1D move in one view."
        primaryAction={
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="index-select-label">Index</InputLabel>
            <Select
              labelId="index-select-label"
              value={selectedIndex}
              label="Index"
              onChange={(e) => setSelectedIndex(e.target.value as SupportedIndex)}
            >
              {INDEX_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Breadth summary */}
      {envelope && envelope.availability !== 'ERROR' && envelope.availability !== 'INVALID_PARAMS' && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <BreadthBar breadth={envelope.breadth} total={indexOption?.size ?? envelope.count} />
          {envelope.membershipSource === 'CURATED_STATIC' && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Membership: curated static list as of {envelope.membershipAsOf}.
              Update when NSE reconstitutes the index.
            </Typography>
          )}
        </Paper>
      )}

      {/* Warnings */}
      {envelope?.warnings?.length ? (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {envelope.warnings.map((w, i) => (
            <Alert key={i} severity="warning" variant="outlined" sx={{ py: 0.5 }}>{w}</Alert>
          ))}
        </Stack>
      ) : null}

      {/* Empty / error state */}
      {!loading && envelope && (envelope.availability === 'EMPTY' || envelope.count === 0) && (
        <Alert severity="info">
          No data found for {envelope.indexLabel}. Ensure NSE stock data has been ingested and signals have been generated.
        </Alert>
      )}
      {!loading && envelope?.availability === 'ERROR' && (
        <Alert severity="error">{envelope.message}</Alert>
      )}

      {/* Members table */}
      {rows.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>#</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortKey === 'symbol'}
                    direction={sortKey === 'symbol' ? sortOrder : 'asc'}
                    onClick={() => handleSort('symbol')}
                  >
                    Symbol
                  </TableSortLabel>
                </TableCell>
                <TableCell>Company</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortKey === 'sector'}
                    direction={sortKey === 'sector' ? sortOrder : 'asc'}
                    onClick={() => handleSort('sector')}
                  >
                    Sector
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortKey === 'latestPrice'}
                    direction={sortKey === 'latestPrice' ? sortOrder : 'asc'}
                    onClick={() => handleSort('latestPrice')}
                  >
                    Price
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortKey === 'change1D'}
                    direction={sortKey === 'change1D' ? sortOrder : 'asc'}
                    onClick={() => handleSort('change1D')}
                  >
                    1D %
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortKey === 'signalScore'}
                    direction={sortKey === 'signalScore' ? sortOrder : 'asc'}
                    onClick={() => handleSort('signalScore')}
                  >
                    Signal
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortKey === 'marketCap'}
                    direction={sortKey === 'marketCap' ? sortOrder : 'asc'}
                    onClick={() => handleSort('marketCap')}
                  >
                    Mkt Cap
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={row.symbol}
                  hover
                  sx={{ opacity: row.instrumentId === null ? 0.5 : 1 }}
                >
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{idx + 1}</Typography>
                  </TableCell>
                  <TableCell>
                    {row.instrumentId ? (
                      <Typography
                        variant="body2"
                        component={Link}
                        to={`/instrument-workspace/${encodeURIComponent(row.symbol)}`}
                        sx={{ fontWeight: 600, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {row.symbol}
                      </Typography>
                    ) : (
                      <Typography variant="body2" fontWeight={600} color="text.secondary">
                        {row.symbol}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {row.companyName ?? <Typography component="span" variant="body2" color="text.secondary">—</Typography>}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {row.sector ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontFamily="monospace">
                      {row.latestPrice !== null ? inr(row.latestPrice, { fractionDigits: 1 }) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {row.change1D !== null ? (
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        sx={{ color: changeColor(row.change1D) }}
                      >
                        {row.change1D >= 0 ? '+' : ''}{row.change1D.toFixed(2)}%
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip
                      title={row.signalScore !== null ? `Score: ${row.signalScore.toFixed(1)}` : 'No signal generated'}
                      arrow
                    >
                      <span>
                        <SignalChip direction={row.signalDirection} />
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {row.marketCap !== null ? inrCompact(row.marketCap) : '—'}
                    </Typography>
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

export default IndexConstituentsPage;
