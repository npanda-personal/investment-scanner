import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  SearchOutlined,
  LaunchOutlined
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useSmartMoneyIntelligence } from '../hooks';
import type { FnoBanListResponse, SectorSmartMoneySummary, SectorSmartMoneyStatus, SmartMoneyRange, SmartMoneyStatus, SmartMoneyStockSummary } from '../types';
import { fetchFnoBanList, ingestFnoBanList } from '../api/smartMoneyIntelligenceService';
import { DataTable, FilterBar, PageHeader, StalenessBadge, type DataTableColumn } from '@/shared/components';
import { humanizeCode } from '@/shared/format/enumLabels';

const statusColor = (status: SmartMoneyStatus | string) => {
  if (status === 'ACCUMULATION' || status === 'ACCUMULATING') return 'success';
  if (status === 'DISTRIBUTION' || status === 'DISTRIBUTING') return 'error';
  if (status === 'INSUFFICIENT_DATA') return 'default';
  return 'warning';
};

/**
 * Color encoding for the 5-band sector classification.
 * Returns MUI sx color properties so we get a full green-to-red gradient
 * rather than the 3-value success/warning/error MUI palette.
 */
const sectorStatusSx = (status: SectorSmartMoneyStatus | string): { bgcolor: string; color: string } => {
  switch (status) {
    case 'STRONG_ACCUMULATION': return { bgcolor: '#1b5e20', color: '#fff' };
    case 'ACCUMULATING':        return { bgcolor: '#388e3c', color: '#fff' };
    case 'NEUTRAL':             return { bgcolor: '#f9a825', color: '#fff' };
    case 'DISTRIBUTING':        return { bgcolor: '#e64a19', color: '#fff' };
    case 'STRONG_DISTRIBUTION': return { bgcolor: '#b71c1c', color: '#fff' };
    default:                    return { bgcolor: '#757575', color: '#fff' };
  }
};

/** Human-readable label for sector classification bands. */
const sectorStatusLabel = (status: SectorSmartMoneyStatus | string): string => {
  switch (status) {
    case 'STRONG_ACCUMULATION': return 'Strong Accumulation';
    case 'ACCUMULATING':        return 'Accumulation';
    case 'NEUTRAL':             return 'Neutral';
    case 'DISTRIBUTING':        return 'Distribution';
    case 'STRONG_DISTRIBUTION': return 'Strong Distribution';
    default:                    return humanizeCode(status);
  }
};

const fmtPercent = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : `${(value * 100).toFixed(1)}%`;
const fmtVolume = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);

export default function SmartMoneyIntelligencePage() {
  const {
    range, setRange,
    sector, setSector,
    topPage, setTopPage,
    topPageSize, setTopPageSize,
    topTotal,
    topLoading,
    distPage, setDistPage,
    distPageSize, setDistPageSize,
    distTotal,
    distLoading,
    health,
    top,
    distribution,
    sectors,
    selectedStock,
    loading,
    refreshingSnapshots,
    refreshProgress,
    detailLoading,
    error,
    setError,
    loadStock,
    refreshSnapshots,
  } = useSmartMoneyIntelligence();

  const handleRun = async () => {
    await refreshSnapshots();
  };

  const columns: DataTableColumn<SmartMoneyStockSummary>[] = [
    {
      id: 'symbol',
      label: 'Symbol',
      render: (row) => (
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography fontWeight={700}>{row.symbol}</Typography>
            <Chip size="small" label={row.status} color={statusColor(row.status)} />
          </Stack>
          <Typography variant="body2" color="text.secondary">{row.companyName || 'Unknown'} · {row.sector || 'N/A'}</Typography>
        </Box>
      ),
    },
    {
      id: 'score',
      label: 'Score',
      align: 'right',
      render: (row) => <Typography variant="h6">{row.smartMoneyScore}</Typography>,
    },
    {
      id: 'change',
      label: 'Daily',
      align: 'right',
      render: (row) => (
        <Typography variant="body2" color={row.dailyChangePercent && row.dailyChangePercent < 0 ? 'error.main' : 'success.main'}>
          {fmtPercent(row.dailyChangePercent)}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Tooltip title="View Smart Money Details" arrow>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); void loadStock(row.instrumentId); }}>
              <SearchOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open Stock Research" arrow>
            <IconButton size="small" component={Link} to={row.researchUrl} onClick={(e) => e.stopPropagation()}>
              <LaunchOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  // NR-56: derive the best available snapshot date for the staleness badge.
  // Prefer dataThroughDate from the first top/distribution item (most specific),
  // then fall back to the sectors list's latest updatedAt.
  const snapshotAsOf =
    top[0]?.dataThroughDate ||
    top[0]?.snapshotDate ||
    distribution[0]?.dataThroughDate ||
    distribution[0]?.snapshotDate ||
    sectors[0]?.updatedAt ||
    null;

  if (loading && !top.length && !distribution.length) {
    return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
      <PageHeader
        title="Smart Money Intelligence"
        subtitle="Price-volume accumulation, distribution warnings, and sector flow context."
        badges={<StalenessBadge asOf={snapshotAsOf} label="Smart money" />}
        primaryAction={<Button variant="contained" onClick={handleRun} disabled={refreshingSnapshots}>{refreshingSnapshots ? 'Refreshing...' : 'Refresh Snapshots'}</Button>}
      />

      <Alert severity="warning" sx={{ mb: 2 }}>
        Insider and institutional ownership data is unavailable. Scores reflect price-volume accumulation and distribution patterns only — they do not represent real smart-money flows or actual ownership changes.
      </Alert>

      <FilterBar onReset={() => { setSector(''); setRange('3M'); }}>
        <TextField
          select
          label="Range"
          value={range}
          onChange={(event) => setRange(event.target.value as SmartMoneyRange)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="1M">1M</MenuItem>
          <MenuItem value="3M">3M</MenuItem>
          <MenuItem value="6M">6M</MenuItem>
        </TextField>
        <TextField
          select
          label="Sector"
          value={sector}
          onChange={(event) => setSector(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All Sectors</MenuItem>
          {sectors.map(s => <MenuItem key={s.sector} value={s.sector}>{s.sector}</MenuItem>)}
        </TextField>
      </FilterBar>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {(refreshingSnapshots || refreshProgress) && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Stack spacing={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
              <Typography variant="subtitle2">
                Smart money snapshot refresh
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processed {(refreshProgress?.offset ?? 0) + (refreshProgress?.processedCount ?? 0)} / {refreshProgress?.totalCount ?? 0}
              </Typography>
            </Stack>
            <LinearProgress
              variant={refreshProgress?.totalCount ? 'determinate' : 'indeterminate'}
              value={refreshProgress?.totalCount ? Math.min(100, ((refreshProgress.offset ?? 0) + (refreshProgress.processedCount ?? 0)) / refreshProgress.totalCount * 100) : undefined}
            />
            {refreshProgress && (
              <Typography variant="body2" color="text.secondary">
                Generated {refreshProgress.generatedCount ?? refreshProgress.generated}, skipped {refreshProgress.skippedCount ?? refreshProgress.skipped}, failed {refreshProgress.failedCount ?? refreshProgress.errors?.length ?? 0}
              </Typography>
            )}
          </Stack>
        </Paper>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 0.8fr' }, gap: 3, mt: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>Top Accumulation Candidates</Typography>
            <DataTable
              columns={columns}
              rows={top}
              getRowId={(row) => row.instrumentId}
              loading={topLoading}
              page={topPage}
              pageSize={topPageSize}
              totalCount={topTotal}
              emptyMessage="No accumulation candidates for the current scope/range. Refresh snapshots if data is stale, or review Sector Smart Money View for neutral-only snapshots."
              onPageChange={setTopPage}
              onPageSizeChange={setTopPageSize}
              onRowClick={(row) => void loadStock(row.instrumentId)}
            />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>Top Distribution Warnings</Typography>
            <DataTable
              columns={columns}
              rows={distribution}
              getRowId={(row) => row.instrumentId}
              loading={distLoading}
              page={distPage}
              pageSize={distPageSize}
              totalCount={distTotal}
              emptyMessage="No distribution warnings for the current scope/range. Refresh snapshots if data is stale, or review Sector Smart Money View for neutral-only snapshots."
              onPageChange={setDistPage}
              onPageSizeChange={setDistPageSize}
              onRowClick={(row) => void loadStock(row.instrumentId)}
            />
          </Box>
          <SectorView sectors={sectors} />
        </Stack>
        <Stack spacing={3}>
          <StockDetail stock={selectedStock} loading={detailLoading} />
          <FnoBanWidget />
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6">Data Coverage</Typography>
              <Chip size="small" label={health?.dataStatus || 'PARTIAL'} color="warning" />
            </Stack>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              This MVP uses persisted price and volume from Market Data Foundation. Insider and institutional ownership are explicit placeholders unless a free provider is configured.
            </Typography>
            <Stack spacing={0.5}>
              {(health?.notes || []).map((note) => <Typography key={note} variant="body2" color="text.secondary">{note}</Typography>)}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Box>
  );
}

function SectorView({ sectors }: { sectors: SectorSmartMoneySummary[] }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Sector Smart Money View</Typography>
      {sectors.length === 0 ? <Typography color="text.secondary">No sector data available.</Typography> : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sector</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell align="right">Accum.</TableCell>
                <TableCell align="right">Distrib.</TableCell>
                <TableCell align="right">Unusual Vol.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sectors.slice(0, 12).map((sector) => (
                <TableRow key={sector.sector}>
                  <TableCell>{sector.sector}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={sectorStatusLabel(sector.sectorStatus)}
                      sx={sectorStatusSx(sector.sectorStatus)}
                    />
                  </TableCell>
                  <TableCell align="right">{sector.averageSmartMoneyScore}</TableCell>
                  <TableCell align="right">{sector.accumulationCount}</TableCell>
                  <TableCell align="right">{sector.distributionCount}</TableCell>
                  <TableCell align="right">{sector.unusualVolumeCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Paper>
  );
}

function StockDetail({ stock, loading }: { stock: SmartMoneyStockSummary | null; loading: boolean }) {
  if (loading) return <Paper sx={{ p: 2 }}><LinearProgress /></Paper>;
  if (!stock) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Stock Smart Money Detail</Typography>
        <Typography color="text.secondary">Select an accumulation or distribution candidate to inspect the signals.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" gap={2} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h6">{stock.symbol}</Typography>
          <Typography color="text.secondary">{stock.companyName || 'Unknown company'}</Typography>
        </Box>
        <Stack alignItems="flex-end">
          <Typography variant="h4" fontWeight={700}>{stock.smartMoneyScore}</Typography>
          <Chip size="small" label={stock.status} color={statusColor(stock.status)} />
        </Stack>
      </Stack>
      <Typography sx={{ mb: 2 }}>{stock.explanation}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, mb: 2 }}>
        <Metric label="Latest volume" value={fmtVolume(stock.latestVolume)} />
        <Metric label="20D avg volume" value={fmtVolume(stock.averageVolume20)} />
        <Metric label="Daily move" value={fmtPercent(stock.dailyChangePercent)} />
        <Metric label="Confidence" value={stock.confidence} />
      </Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Signals</Typography>
      {stock.signals.length === 0 ? <Typography color="text.secondary">No strong price-volume signal detected.</Typography> : (
        <Stack spacing={1}>
          {stock.signals.map((signal) => (
            <Paper key={`${signal.type}-${signal.details}`} variant="outlined" sx={{ p: 1 }}>
              <Stack direction="row" justifyContent="space-between" gap={1}>
                <Typography fontWeight={700}>{signal.label}</Typography>
                <Chip size="small" label={signal.direction} color={statusColor(signal.direction)} />
              </Stack>
              <Typography variant="body2" color="text.secondary">{signal.details}</Typography>
            </Paper>
          ))}
        </Stack>
      )}
      <Divider sx={{ my: 2 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">Insider / Ownership</Typography>
        <Button size="small" component={Link} to={stock.researchUrl}>Open Research</Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{stock.insiderOwnership.explanation}</Typography>
    </Paper>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography fontWeight={700}>{value}</Typography>
    </Paper>
  );
}

function FnoBanWidget() {
  const [data, setData] = useState<FnoBanListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchFnoBanList());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleIngest = async () => {
    setIngesting(true);
    setIngestMsg(null);
    try {
      const result = await ingestFnoBanList();
      setIngestMsg(
        result.status === 'success'
          ? `Ingested ${result.symbolsUpserted} symbol(s) for ${result.banDate ?? 'unknown date'}.`
          : result.message ?? 'Ingest completed.'
      );
      await load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ingest failed';
      setIngestMsg(msg);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h6">F&amp;O Ban List</Typography>
          <Typography variant="body2" color="text.secondary">
            Securities in F&amp;O ban period — derivatives trading restricted; elevated risk
          </Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={() => void handleIngest()} disabled={ingesting || loading}>
          {ingesting ? 'Ingesting...' : 'Refresh'}
        </Button>
      </Stack>

      {ingestMsg && (
        <Alert severity="info" sx={{ mb: 1 }} onClose={() => setIngestMsg(null)}>
          {ingestMsg}
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : !data || data.status === 'error' ? (
        <Typography color="text.secondary" variant="body2">
          {data?.message ?? 'List unavailable. Use Refresh to fetch from NSE.'}
        </Typography>
      ) : data.status === 'missing' ? (
        <Typography color="text.secondary" variant="body2">
          {data.message ?? 'No F&O ban data persisted yet. Use Refresh to ingest from NSE.'}
        </Typography>
      ) : data.symbols.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No securities in ban period for {data.banDate ?? 'latest date'}.
        </Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            As of {data.banDate} — {data.count} securit{data.count === 1 ? 'y' : 'ies'} in ban period
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {data.symbols.map((symbol) => (
              <Chip
                key={symbol}
                label={symbol}
                size="small"
                color="error"
                variant="outlined"
              />
            ))}
          </Stack>
        </>
      )}
    </Paper>
  );
}
