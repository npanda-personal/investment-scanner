import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  fetchMarketDataHealth,
  fetchMarketDataSchedulerStatus,
  fetchReviewReadinessSummary,
  fetchSourceFileImports,
  fetchTrustedReviewUniverseHealth,
  fetchMarketDataUniverseHealth,
  type MarketDataHealth,
  type MarketDataSchedulerRegionStatus,
  type MarketDataSchedulerStatus,
  type MarketDataSourceFileImportRecord,
  type MarketDataUniverseHealth,
  type ReviewReadinessSummary,
  type TrustedReviewUniverseHealth,
} from '../api/marketDataFoundationService';
import { normalizeMarketForApi } from '../api/marketScopeApi';

interface MarketDataStatusPanelProps {
  region?: string;
  assetType?: string;
}

const formatCount = (value?: number | null) => new Intl.NumberFormat().format(value ?? 0);
const formatTimestamp = (value?: string | null) => value ? new Date(value).toLocaleString() : 'N/A';

const statusColor = (status?: string | null): 'success' | 'warning' | 'error' | 'default' => {
  if (status === 'COMPLETED' || status === 'COMPLETE' || status === 'CURRENT' || status === 'OK') return 'success';
  if (status === 'FAILED' || status === 'ERROR' || status === 'NOT_TRUSTWORTHY') return 'error';
  if (status) return 'warning';
  return 'default';
};

const latestSourceEvidence = (imports: MarketDataSourceFileImportRecord[]) =>
  imports
    .filter((item) => item.status === 'COMPLETED')
    .sort((a, b) => String(b.tradingDate || '').localeCompare(String(a.tradingDate || '')))[0] || null;

const MarketDataStatusPanel: React.FC<MarketDataStatusPanelProps> = ({ region, assetType }) => {
  const [health, setHealth] = useState<MarketDataHealth | null>(null);
  const [universeHealth, setUniverseHealth] = useState<MarketDataUniverseHealth | null>(null);
  const [reviewReadiness, setReviewReadiness] = useState<ReviewReadinessSummary | null>(null);
  const [trustedUniverse, setTrustedUniverse] = useState<TrustedReviewUniverseHealth | null>(null);
  const [scheduler, setScheduler] = useState<MarketDataSchedulerStatus | null>(null);
  const [schedulerRegion, setSchedulerRegion] = useState<MarketDataSchedulerRegionStatus | null>(null);
  const [sourceImports, setSourceImports] = useState<MarketDataSourceFileImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthResult, universeResult, reviewResult, trustedResult, schedulerResult, sourceResult] = await Promise.all([
        fetchMarketDataHealth({ region, assetType }),
        fetchMarketDataUniverseHealth({ region, assetType }),
        fetchReviewReadinessSummary({ region, assetType }).catch(() => null),
        fetchTrustedReviewUniverseHealth({ region, assetType }).catch(() => null),
        fetchMarketDataSchedulerStatus().catch(() => null),
        fetchSourceFileImports({ limit: 10 }).catch(() => ({ count: 0, imports: [] })),
      ]);
      const normalizedRegion = normalizeMarketForApi(region);
      setHealth(healthResult);
      setUniverseHealth(universeResult);
      setReviewReadiness(reviewResult);
      setTrustedUniverse(trustedResult);
      setScheduler(schedulerResult);
      setSchedulerRegion(schedulerResult?.regionStatuses.find((item) => item.region === normalizedRegion) ?? null);
      setSourceImports(sourceResult.imports);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Market data health failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [region, assetType]);

  const latestEvidence = latestSourceEvidence(sourceImports);

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="h6">Exchange Data Health</Typography>
            <Typography variant="body2" color="text.secondary">
              NSE/BSE-only market-data status. Provider validation and provider backfill are disabled.
            </Typography>
          </Box>
          <Button startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}
      {loading && <LinearProgress />}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Stored Market Data</Typography>
          <Typography variant="h6">{health?.instrumentCount ? formatCount(health.instrumentCount) : '0'} instruments</Typography>
          <Typography variant="body2" color="text.secondary">Latest timestamp: {formatTimestamp(health?.latestDataTimestamp)}</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={health?.data_status || 'UNKNOWN'} color={statusColor(health?.data_status)} />
            <Chip size="small" label={health?.source || 'database'} />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Latest Exchange Evidence</Typography>
          <Typography variant="h6">{latestEvidence?.tradingDate || 'No completed import'}</Typography>
          <Typography variant="body2" color="text.secondary">{latestEvidence?.fileName || 'Run an NSE/BSE exchange import to create evidence.'}</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={latestEvidence ? `${latestEvidence.source} ${latestEvidence.segment}` : 'N/A'} />
            <Chip size="small" label={`Accepted ${formatCount(latestEvidence?.rowsAccepted)}`} />
            <Chip size="small" label={`Rejected ${formatCount(latestEvidence?.rowsRejected)}`} />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Scheduler</Typography>
          <Typography variant="h6">{scheduler?.enabled ? 'Enabled' : 'Disabled'}</Typography>
          <Typography variant="body2" color="text.secondary">Last run: {formatTimestamp(scheduler?.lastRunAt)}</Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={scheduler?.activeRun ? 'RUNNING' : 'IDLE'} color={scheduler?.activeRun ? 'warning' : 'default'} />
            <Chip size="small" label={schedulerRegion?.candleSyncStatus || 'UNKNOWN'} color={statusColor(schedulerRegion?.candleSyncStatus)} />
          </Stack>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Readiness Snapshot</Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" label={`Review ready ${formatCount(universeHealth?.counts.reviewReady)}`} />
          <Chip size="small" label={`Price ready ${formatCount(universeHealth?.counts.priceReady)}`} />
          <Chip size="small" label={`Catalog only ${formatCount(universeHealth?.counts.catalogOnly)}`} />
          <Chip size="small" label={`Trusted mode ${trustedUniverse?.mode || 'UNKNOWN'}`} color={statusColor(trustedUniverse?.status)} />
          <Chip size="small" label={`Review blockers ${formatCount(reviewReadiness?.blockers?.length)}`} color={reviewReadiness?.blockers?.length ? 'warning' : 'success'} />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Recent Source Files</Typography>
        <Stack spacing={1}>
          {sourceImports.length === 0 && <Typography variant="body2" color="text.secondary">No source-file imports recorded yet.</Typography>}
          {sourceImports.map((item) => (
            <Stack key={item.id} direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
              <Box>
                <Typography variant="body2" fontWeight={700}>{item.source} {item.segment} - {item.tradingDate || 'unknown date'}</Typography>
                <Typography variant="caption" color="text.secondary">{item.fileName}</Typography>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" label={item.status} color={statusColor(item.status)} />
                <Chip size="small" label={`Raw ${formatCount(item.rowsRaw)}`} />
                <Chip size="small" label={`Accepted ${formatCount(item.rowsAccepted)}`} />
                <Chip size="small" label={`Rejected ${formatCount(item.rowsRejected)}`} />
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
};

export default MarketDataStatusPanel;
