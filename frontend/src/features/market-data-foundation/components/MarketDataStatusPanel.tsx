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
import RegionBadge from './RegionBadge';

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
  // Review readiness loads lazily (endpoint takes ~24s) — has its own loading state
  const [reviewReadiness, setReviewReadiness] = useState<ReviewReadinessSummary | null>(null);
  const [reviewReadinessLoading, setReviewReadinessLoading] = useState(true);
  const [reviewReadinessError, setReviewReadinessError] = useState<string | null>(null);
  const [trustedUniverse, setTrustedUniverse] = useState<TrustedReviewUniverseHealth | null>(null);
  const [scheduler, setScheduler] = useState<MarketDataSchedulerStatus | null>(null);
  const [schedulerRegion, setSchedulerRegion] = useState<MarketDataSchedulerRegionStatus | null>(null);
  const [sourceImports, setSourceImports] = useState<MarketDataSourceFileImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // The /market-data/health query can be slow under shared-DB contention (tens of seconds);
  // it gets its own flag so the Stored-Market-Data card shows a spinner instead of a
  // misleading "0 instruments", and — critically — does NOT block the rest of the panel.
  const [healthLoading, setHealthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviewReadiness = async () => {
    setReviewReadinessLoading(true);
    setReviewReadinessError(null);
    try {
      const result = await fetchReviewReadinessSummary({ region, assetType });
      setReviewReadiness(result);
    } catch (err: any) {
      setReviewReadinessError(err.response?.data?.error || err.message || 'Review readiness failed');
    } finally {
      setReviewReadinessLoading(false);
    }
  };

  const load = () => {
    setLoading(true);
    setHealthLoading(true);
    setError(null);
    const normalizedRegion = normalizeMarketForApi(region);
    // Fire each panel's fetch INDEPENDENTLY so a single slow endpoint (health can take tens
    // of seconds under DB contention) never blocks the whole tab — every card fills in as
    // soon as its own data arrives, instead of all waiting on the slowest call.
    const tasks: Promise<unknown>[] = [
      fetchMarketDataHealth({ region, assetType })
        .then(setHealth)
        .catch((err: any) => setError((prev) => prev || err?.response?.data?.error || err?.message || 'Market data health failed'))
        .finally(() => setHealthLoading(false)),
      fetchMarketDataUniverseHealth({ region, assetType }).then(setUniverseHealth).catch(() => undefined),
      fetchTrustedReviewUniverseHealth({ region, assetType }).then(setTrustedUniverse).catch(() => setTrustedUniverse(null)),
      fetchMarketDataSchedulerStatus({ region, assetType })
        .then((result) => { setScheduler(result); setSchedulerRegion(result?.regionStatuses.find((item) => item.region === normalizedRegion) ?? null); })
        .catch(() => { setScheduler(null); setSchedulerRegion(null); }),
      fetchSourceFileImports({ region, assetType, limit: 10 }).then((result) => setSourceImports(result.imports)).catch(() => setSourceImports([])),
    ];
    void Promise.allSettled(tasks).finally(() => setLoading(false));
    // Review readiness is independently lazy — it can be slow (~24s)
    void loadReviewReadiness();
  };

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, assetType]);

  const latestEvidence = latestSourceEvidence(sourceImports);
  // Exchange-file panels (Latest Exchange Evidence, Recent Source Files) only apply to
  // India (NSE/BSE). US/EU ingest via provider; crypto via the 24/7 lane — neither
  // produces exchange source files.
  const isIndia = normalizeMarketForApi(region) === 'IN';
  // Build a scope dimension label for the stored-data count card. Crypto (region GLOBAL,
  // assetType CRYPTO) reads as "Global / CRYPTO" rather than dropping the region.
  const scopeDimensionLabel = [
    region ? (region === 'GLOBAL' ? 'Global' : region) : null,
    assetType ? (assetType === 'EQUITY' ? 'STOCK' : assetType) : null,
  ].filter(Boolean).join(' / ') || null;

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">Data Health</Typography>
              <RegionBadge region={region} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Ingestion + storage status for the selected market. Every panel below is scoped to this region.
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
          <Typography variant="h6" component="div">
            {healthLoading && !health ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">Loading…</Typography>
              </Stack>
            ) : (
              <>
                {health?.instrumentCount ? formatCount(health.instrumentCount) : '0'} instruments
                {scopeDimensionLabel && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    — {scopeDimensionLabel}
                  </Typography>
                )}
              </>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">Latest timestamp: {formatTimestamp(health?.latestDataTimestamp)}</Typography>
          {health?.trackedCoverage && (
            <Typography variant="body2" color="text.secondary">
              Tracked coverage: {formatCount(health.trackedCoverage.currentToLatest)}/{formatCount(health.trackedCoverage.trackedTotal)} current ({health.trackedCoverage.coveragePct}%)
              {health.trackedCoverage.latestDate ? ` · through ${health.trackedCoverage.latestDate}` : ''}
            </Typography>
          )}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={health?.data_status || 'UNKNOWN'} color={statusColor(health?.data_status)} />
            <Chip size="small" label={health?.source || 'database'} />
          </Stack>
        </Paper>

        {isIndia && (
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
        )}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Scheduler</Typography>
          <Typography variant="h6">{scheduler?.enabled ? 'Enabled' : 'Disabled'}</Typography>
          {/* "Last checked" is when the scheduler last evaluated the feed (every
              poll, even when there was nothing new to load) — it tells you the
              scheduler is alive. "Data through" is the trading date of the data
              actually on hand, which is naturally older on weekends/holidays.
              Keeping them as separate lines avoids reading a valid data date as
              a stale run. */}
          <Typography variant="body2" color="text.secondary">Last checked: {formatTimestamp(scheduler?.lastRunAt)}</Typography>
          {schedulerRegion ? (
            <>
              <Typography variant="body2" color="text.secondary">Data through: {schedulerRegion.latestStoredTradingDate || 'none'}</Typography>
              {scheduler?.nextSuggestedRunAt && (
                <Typography variant="body2" color="text.secondary">Next run: {formatTimestamp(scheduler.nextSuggestedRunAt)}</Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" color="warning.main">
              {region && region !== 'GLOBAL'
                ? `${region} is not in the scheduler's configured region set (MARKET_DATA_SCHEDULER_REGIONS).`
                : 'Select a specific market to see its scheduler status.'}
            </Typography>
          )}
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
            <Chip size="small" label={scheduler?.activeRun ? 'RUNNING' : 'IDLE'} color={scheduler?.activeRun ? 'warning' : 'default'} />
            {schedulerRegion && <Chip size="small" label={schedulerRegion.candleSyncStatus || 'UNKNOWN'} color={statusColor(schedulerRegion.candleSyncStatus)} />}
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
          {reviewReadinessLoading ? (
            <Chip size="small" icon={<CircularProgress size={12} />} label="Loading review readiness…" />
          ) : reviewReadinessError ? (
            <Chip size="small" label="Review readiness unavailable" color="warning" />
          ) : (
            <Chip size="small" label={`Review blockers ${formatCount(reviewReadiness?.blockers?.length)}`} color={reviewReadiness?.blockers?.length ? 'warning' : 'success'} />
          )}
        </Stack>
      </Paper>

      {/* Review-Readiness card — lazy, has its own loading state */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Review Readiness</Typography>
          {reviewReadinessLoading && <CircularProgress size={14} />}
          {!reviewReadinessLoading && (
            <Button size="small" variant="text" onClick={() => void loadReviewReadiness()} sx={{ minWidth: 0, p: 0.5 }}>
              Refresh
            </Button>
          )}
        </Stack>
        {reviewReadinessLoading && <LinearProgress sx={{ mb: 1 }} />}
        {reviewReadinessError && <Alert severity="warning" sx={{ mb: 1 }}>{reviewReadinessError}</Alert>}
        {!reviewReadinessLoading && !reviewReadinessError && !reviewReadiness && (
          <Typography variant="body2" color="text.secondary">No review readiness data available.</Typography>
        )}
        {reviewReadiness && (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip size="small" label={`Mode: ${reviewReadiness.reviewMode}`} color={reviewReadiness.reviewMode === 'FULL_REVIEW' ? 'success' : reviewReadiness.reviewMode === 'LIMITED_REVIEW' ? 'warning' : 'error'} />
              <Chip size="small" label={`Decision: ${reviewReadiness.userDecision}`} variant="outlined" />
              <Chip size="small" label={`Trust: ${reviewReadiness.trustStatus}`} variant="outlined" />
              <Chip size="small" label={`Blockers: ${reviewReadiness.blockers?.length ?? 0}`} color={reviewReadiness.blockers?.length ? 'warning' : 'success'} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Trusted / catalog: {reviewReadiness.reviewUniverse.trustedCount} / {reviewReadiness.reviewUniverse.catalogCount} | Stored data-through: {reviewReadiness.reviewUniverse.storedDataThroughDate || 'none'}
            </Typography>
          </Stack>
        )}
      </Paper>

      {isIndia && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2">Recent Source Files</Typography>
            <RegionBadge region={region} />
          </Stack>
          <Stack spacing={1}>
            {sourceImports.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No source-file imports recorded yet.
              </Typography>
            )}
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
      )}
    </Stack>
  );
};

export default MarketDataStatusPanel;
