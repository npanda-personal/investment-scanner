import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Divider, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import {
  backfillMarketDataPrices,
  fetchLatestMarketDataRepairRun,
  fetchMarketDataHealth,
  fetchMarketDataRepairPlan,
  fetchTrustedReviewUniverseHealth,
  fetchReviewReadinessSummary,
  fetchMarketDataUniverseHealth,
  fetchMarketDataSchedulerStatus,
  fetchManualMetadataTemplate,
  importMarketDataManualMetadata,
  repairMarketDataCatalogIdentity,
  repairMarketDataProviderBusinessMetadata,
  runMarketDataUniverseRepair,
  fetchTrustedUniverseRepairWorkbench,
  validateMarketDataProviders,
  type MarketDataHealth,
  type MarketDataRepairPlan,
  type MarketDataRepairRequest,
  type MarketDataRepairRunRecord,
  type MarketDataRepairRunResponse,
  type MarketDataRepairSummary,
  type MarketDataUniverseHealth,
  type TrustedReviewUniverseHealth,
  type MarketDataSchedulerRegionStatus,
  type ReviewReadinessSummary,
  type MarketDataRepairLane,
  type TrustedUniverseRepairWorkbench,
} from '../api/marketDataFoundationService';
import { normalizeMarketForApi } from '../api/marketScopeApi';

const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) return 'No market data loaded';
  return new Date(timestamp).toLocaleString();
};

const formatCandleStatus = (status: MarketDataSchedulerRegionStatus | null) => {
  if (!status) return 'Unavailable';
  if (status.candleSyncStatus === 'CURRENT') return `Current through ${status.latestCompletedTradingDate}`;
  if (status.candleSyncStatus === 'MISSING_LATEST_COMPLETED') return `Missing ${status.latestCompletedTradingDate}`;
  if (status.candleSyncStatus === 'NO_STORED_CANDLES') return 'No candles stored';
  if (status.candleSyncStatus === 'TODAY_STORED_PENDING_FINAL_CONFIRMATION') return `Today stored, pending final`;
  return 'Unknown';
};

const formatCount = (value?: number) => new Intl.NumberFormat().format(value ?? 0);
const formatPercent = (value?: number) => `${Number(value ?? 0).toFixed(1)}%`;
const REPAIR_BATCH_SIZE = 50;
const hasNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const hasPositive = (value: unknown): value is number => hasNumber(value) && value > 0;

type RepairAction =
  | 'VALIDATE_PROVIDERS'
  | 'RETRY_FAILED_PROVIDERS'
  | 'CATALOG_IDENTITY_REPAIR'
  | 'PROVIDER_BUSINESS_METADATA_REPAIR'
  | 'MANUAL_METADATA_IMPORT'
  | 'BACKFILL_PRICES';

const trustColor = (trustStatus?: MarketDataUniverseHealth['trustStatus']): 'success' | 'warning' | 'error' | 'default' => {
  if (trustStatus === 'OK') return 'success';
  if (trustStatus === 'PARTIAL') return 'warning';
  if (trustStatus === 'NOT_TRUSTWORTHY') return 'error';
  return 'default';
};

const repairRunIsGreen = (run?: Pick<MarketDataRepairRunResponse, 'status' | 'anotherRunNeeded' | 'afterTrustStatus' | 'universeSignoff'> | MarketDataRepairRunRecord | null) =>
  Boolean(run && run.status === 'COMPLETED' && !run.anotherRunNeeded && run.afterTrustStatus === 'OK' && run.universeSignoff?.status === 'PASS');

const repairRunColor = (run?: Pick<MarketDataRepairRunResponse, 'status' | 'anotherRunNeeded' | 'afterTrustStatus' | 'universeSignoff'> | MarketDataRepairRunRecord | null): 'success' | 'warning' | 'error' | 'default' => {
  if (!run) return 'default';
  if (run.status === 'FAILED') return 'error';
  if (repairRunIsGreen(run)) return 'success';
  if (run.status !== 'COMPLETED' || run.anotherRunNeeded || run.afterTrustStatus !== 'OK' || run.universeSignoff?.status !== 'PASS') return 'warning';
  return 'default';
};

interface MarketDataStatusPanelProps {
  region?: string;
  assetType?: string;
}

const MarketDataStatusPanel: React.FC<MarketDataStatusPanelProps> = ({ region, assetType }) => {
  const [status, setStatus] = useState<MarketDataHealth | null>(null);
  const [universeHealth, setUniverseHealth] = useState<MarketDataUniverseHealth | null>(null);
  const [reviewReadiness, setReviewReadiness] = useState<ReviewReadinessSummary | null>(null);
  const [trustedReviewUniverse, setTrustedReviewUniverse] = useState<TrustedReviewUniverseHealth | null>(null);
  const [repairPlan, setRepairPlan] = useState<MarketDataRepairPlan | null>(null);
  const [repairWorkbench, setRepairWorkbench] = useState<TrustedUniverseRepairWorkbench | null>(null);
  const [repairSummary, setRepairSummary] = useState<MarketDataRepairSummary | null>(null);
  const [repairRunResult, setRepairRunResult] = useState<MarketDataRepairRunResponse | null>(null);
  const [latestRepairRun, setLatestRepairRun] = useState<MarketDataRepairRunRecord | null>(null);
  const [repairRunning, setRepairRunning] = useState<RepairAction | null>(null);
  const [repairRunRunning, setRepairRunRunning] = useState<'DRY_RUN' | 'RUN' | 'DRAIN' | null>(null);
  const [lastRepairAction, setLastRepairAction] = useState<RepairAction | null>(null);
  const [catalogIdentityOffset, setCatalogIdentityOffset] = useState(0);
  const [manualMetadataOffset, setManualMetadataOffset] = useState(0);
  const [manualMetadataCsv, setManualMetadataCsv] = useState('');
  const [manualTemplateMessage, setManualTemplateMessage] = useState<string | null>(null);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [candleStatus, setCandleStatus] = useState<MarketDataSchedulerRegionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);
    Promise.all([
      fetchMarketDataHealth({ region, assetType }),
      fetchMarketDataUniverseHealth({ region, assetType }),
      fetchReviewReadinessSummary({ region, assetType }).catch(() => null),
      fetchTrustedReviewUniverseHealth({ region, assetType }),
      fetchMarketDataRepairPlan({ region, assetType }),
      fetchTrustedUniverseRepairWorkbench({ region, assetType }).catch(() => null),
      fetchLatestMarketDataRepairRun({ region, assetType }).catch(() => null),
      fetchMarketDataSchedulerStatus().catch(() => null),
    ])
      .then(([result, universeResult, reviewReadinessResult, trustedReviewResult, repairPlanResult, repairWorkbenchResult, latestRepairRunResult, schedulerStatus]) => {
        if (!mounted) return;
        setStatus(result);
        setUniverseHealth(universeResult);
        setReviewReadiness(reviewReadinessResult);
        setTrustedReviewUniverse(trustedReviewResult);
        setRepairPlan(repairPlanResult);
        setRepairWorkbench(repairWorkbenchResult);
        setLatestRepairRun(latestRepairRunResult);
        const normalizedRegion = normalizeMarketForApi(region);
        setCandleStatus(schedulerStatus?.regionStatuses.find((item) => item.region === normalizedRegion) ?? null);
      })
      .catch((err: any) => {
        if (mounted) setError(err.response?.data?.error || err.message || 'Unable to load market data status');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [region, assetType, refreshNonce]);

  const manualMetadataErrors = (() => {
    const text = manualMetadataCsv.trim();
    if (!text) return [] as string[];
    const [headerLine, ...rows] = text.split(/\r?\n/).filter((line) => line.trim());
    const headers = headerLine.split(',').map((header) => header.trim().toLowerCase());
    const errors: string[] = [];
    if (!headers.includes('symbol') && !headers.includes('providersymbol') && !headers.includes('provider symbol')) {
      errors.push('CSV must include symbol or providerSymbol.');
    }
    if (!headers.includes('sector')) errors.push('CSV must include sector.');
    if (!headers.includes('industry')) errors.push('CSV must include industry.');
    if (!headers.includes('marketcap') && !headers.includes('market cap')) errors.push('CSV must include marketCap.');
    const sectorIndex = headers.indexOf('sector');
    const industryIndex = headers.indexOf('industry');
    const marketCapIndex = headers.includes('marketcap') ? headers.indexOf('marketcap') : headers.indexOf('market cap');
    const nullEquivalent = (value: string) => {
      const normalized = value.trim().toLowerCase();
      return normalized.length === 0 || ['unknown', 'n/a', 'na', 'none', 'null'].includes(normalized);
    };
    for (const row of rows.slice(0, 5)) {
      const cells = row.split(',');
      if (sectorIndex >= 0 && nullEquivalent(cells[sectorIndex] || '')) errors.push('Sector cannot be Unknown, N/A, NA, None, Null, or blank.');
      if (industryIndex >= 0 && nullEquivalent(cells[industryIndex] || '')) errors.push('Industry cannot be Unknown, N/A, NA, None, Null, or blank.');
      if (marketCapIndex >= 0 && (!Number.isFinite(Number(cells[marketCapIndex])) || Number(cells[marketCapIndex]) <= 0)) errors.push('marketCap must be a positive number.');
    }
    return [...new Set(errors)];
  })();

  const repairSummarySeverity = (() => {
    if (!repairSummary) return 'info' as const;
    if (repairSummary.failed > 0) return 'error' as const;
    if (
      hasPositive(repairSummary.freeFallbackRequired) ||
      hasPositive(repairSummary.manualSymbolRepairRequired) ||
      hasPositive(repairSummary.remainingManualRequired) ||
      hasPositive(repairSummary.remainingRetryEligible) ||
      hasPositive(repairSummary.remainingRetryBlocked) ||
      hasPositive(repairSummary.validationFailed) ||
      repairSummary.hasMore
    ) return 'warning' as const;
    const priceRowsChanged = (repairSummary.priceRowsInserted ?? 0) + (repairSummary.priceRowsUpdated ?? 0) + (repairSummary.priceRowsNoOp ?? 0);
    const hasPriceDiagnostics =
      hasNumber(repairSummary.priceRowsReceived) ||
      hasNumber(repairSummary.priceRowsInserted) ||
      hasNumber(repairSummary.priceRowsUpdated) ||
      hasNumber(repairSummary.priceRowsNoOp) ||
      hasNumber(repairSummary.zeroRowProviderReturns);
    if (hasPriceDiagnostics && ((repairSummary.zeroRowProviderReturns ?? 0) > 0 || priceRowsChanged === 0)) return 'warning' as const;
    if ((repairSummary.partialSuccess || 0) > 0 || (repairSummary.manualRequired || 0) > 0 || (repairSummary.providerNotFound || 0) > 0 || (repairSummary.noOp || 0) > 0) return 'warning' as const;
    if ((repairSummary.skippedRecentAttempt || 0) > 0 && repairSummary.updated === 0) return 'info' as const;
    if (repairSummary.updated > 0) {
      return universeHealth?.universeSignoff?.status === 'PASS' ? 'success' as const : 'warning' as const;
    }
    return 'info' as const;
  })();

  const runRepair = async (action: RepairAction, boundedRequest?: MarketDataRepairLane['nextAction']['request']) => {
    setRepairRunning(action);
    setRepairError(null);
    const request: MarketDataRepairRequest = {
      region: boundedRequest?.region || region,
      assetType: boundedRequest?.assetType || assetType,
      batchSize: boundedRequest?.batchSize || REPAIR_BATCH_SIZE,
      offset: boundedRequest?.offset ?? (action === 'CATALOG_IDENTITY_REPAIR' ? catalogIdentityOffset : action === 'MANUAL_METADATA_IMPORT' ? manualMetadataOffset : 0),
      providerValidationQueue: boundedRequest?.queueMode === 'RETRY_FAILED' || action === 'RETRY_FAILED_PROVIDERS' ? 'RETRY_FAILED' as const : 'UNKNOWN_FIRST' as const,
      force: action === 'VALIDATE_PROVIDERS' || action === 'RETRY_FAILED_PROVIDERS' || action === 'PROVIDER_BUSINESS_METADATA_REPAIR' ? false : true,
    };
    const catalogIdentityRequest = {
      ...request,
      catalogSource: 'NSE_EQUITY_SECURITIES',
      importMode: 'CONFIGURED_URL' as const,
    };
    const manualMetadataRequest = {
      ...request,
      csvText: manualMetadataCsv,
      importMode: 'MANUAL_CSV' as const,
    };

    try {
      const result = action === 'VALIDATE_PROVIDERS' || action === 'RETRY_FAILED_PROVIDERS'
        ? await validateMarketDataProviders(request)
        : action === 'CATALOG_IDENTITY_REPAIR'
          ? await repairMarketDataCatalogIdentity(catalogIdentityRequest)
        : action === 'PROVIDER_BUSINESS_METADATA_REPAIR'
          ? await repairMarketDataProviderBusinessMetadata(request)
        : action === 'MANUAL_METADATA_IMPORT'
          ? await importMarketDataManualMetadata(manualMetadataRequest)
          : await backfillMarketDataPrices(request);
      setRepairSummary(result);
      setLastRepairAction(action);
      if (action === 'CATALOG_IDENTITY_REPAIR') setCatalogIdentityOffset(result.nextOffset ?? 0);
      if (action === 'MANUAL_METADATA_IMPORT') setManualMetadataOffset(result.nextOffset ?? 0);
      setRefreshNonce((value) => value + 1);
    } catch (err: any) {
      setRepairError(err.response?.data?.error || err.message || 'Repair action failed.');
    } finally {
      setRepairRunning(null);
    }
  };

  const runOperationalRepair = async (dryRun: boolean, drain = false) => {
    setRepairRunRunning(dryRun ? 'DRY_RUN' : drain ? 'DRAIN' : 'RUN');
    setRepairError(null);
    try {
      const result = await runMarketDataUniverseRepair({
        region,
        assetType,
        batchSize: REPAIR_BATCH_SIZE,
        maxBatchesPerAction: drain ? 50 : 20,
        dryRun,
        mode: drain ? 'DRAIN_UNTIL_BLOCKED' : undefined,
        actions: drain ? undefined : [
          'VALIDATE_PROVIDERS',
          'CATALOG_IDENTITY_REPAIR',
          'PROVIDER_BUSINESS_METADATA_REPAIR',
          'BACKFILL_PRICES',
        ],
        includeRetryFailed: true,
        catalogSource: 'NSE_EQUITY_SECURITIES',
        importMode: 'CONFIGURED_URL',
      });
      setRepairRunResult(result);
      if (!dryRun) setLatestRepairRun(result.id ? {
        id: result.id,
        scope: result.scope,
        status: result.status,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        beforeHealth: result.beforeHealth,
        afterHealth: result.afterHealth,
        beforeRepairPlan: result.beforeRepairPlan,
        afterRepairPlan: result.afterRepairPlan,
        actions: result.actions,
        summary: result.summary,
        warnings: result.warnings,
        anotherRunNeeded: result.anotherRunNeeded,
        hardBlockersRemaining: result.hardBlockersRemaining,
        expectedNextAction: result.expectedNextAction,
        afterTrustStatus: result.afterTrustStatus,
        universeSignoff: result.universeSignoff,
        error: result.error,
      } : null);
      setRefreshNonce((value) => value + 1);
    } catch (err: any) {
      setRepairError(err.response?.data?.error || err.message || 'Operational repair run failed.');
    } finally {
      setRepairRunRunning(null);
    }
  };

  const exportManualTemplate = async () => {
    setRepairError(null);
    try {
      const template = await fetchManualMetadataTemplate({ region, assetType });
      setManualMetadataCsv(template.csvText);
      setManualMetadataOffset(0);
      setManualTemplateMessage(`Manual metadata template loaded with ${formatCount(template.count)} unresolved rows.`);
    } catch (err: any) {
      setRepairError(err.response?.data?.error || err.message || 'Manual metadata template export failed.');
    }
  };

  const laneRepairAction = (lane: MarketDataRepairLane): RepairAction | null => {
    if (lane.nextAction.actionCode === 'VALIDATE_PROVIDERS') return 'VALIDATE_PROVIDERS';
    if (lane.nextAction.actionCode === 'RETRY_FAILED_PROVIDERS') return 'RETRY_FAILED_PROVIDERS';
    if (lane.nextAction.actionCode === 'CATALOG_IDENTITY_REPAIR') return 'CATALOG_IDENTITY_REPAIR';
    if (lane.nextAction.actionCode === 'PROVIDER_BUSINESS_METADATA_REPAIR') return 'PROVIDER_BUSINESS_METADATA_REPAIR';
    if (lane.nextAction.actionCode === 'MANUAL_METADATA_IMPORT') return 'MANUAL_METADATA_IMPORT';
    if (lane.nextAction.actionCode === 'BACKFILL_PRICES') return 'BACKFILL_PRICES';
    return null;
  };

  const providerUnknownRemaining = repairPlan?.providerUnknownValidationNeeded ?? repairPlan?.providerValidationNeeded ?? universeHealth?.counts.providerUnknownValidationNeeded ?? universeHealth?.counts.providerUnknown ?? 0;
  const providerRetryEligible = repairPlan?.providerRetryValidationNeeded ?? repairPlan?.retryFailedValidations ?? universeHealth?.counts.providerRetryValidationNeeded ?? 0;
  const providerRetryBlocked = repairPlan?.providerRetryBlocked ?? 0;
  const providerManualRequired = repairPlan?.providerManualRepairRequired ?? 0;
  const retryDisabledReason = providerUnknownRemaining > 0
    ? `Retry blocked until ${formatCount(providerUnknownRemaining)} unknown provider rows drain.`
    : providerRetryEligible === 0 && (providerRetryBlocked > 0 || providerManualRequired > 0)
      ? `Retry blocked: ${formatCount(providerRetryBlocked)} cooldown and ${formatCount(providerManualRequired)} manual rows remain.`
      : null;
  const coverageStatus = (summary: MarketDataRepairSummary) => {
    if (summary.requiredHistoryCoverageStatus) return summary.requiredHistoryCoverageStatus;
    if (hasPositive(summary.freeFallbackRequired)) return 'FALLBACK_REQUIRED';
    if (hasPositive(summary.remainingCandidates) || hasPositive(summary.stillUnder252)) return 'NEEDS_BACKFILL';
    return 'COMPLETE_OR_NOT_REPORTED';
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={22} />
          <Typography variant="body2">Loading market data status...</Typography>
        </Box>
      </Paper>
    );
  }

  if (error) {
    return <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>;
  }

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography variant="h6">Universe Health</Typography>
          <Typography variant="body2" color="text.secondary">
            {universeHealth?.scope.region || region || 'IN'} / {universeHealth?.scope.assetType || assetType || 'STOCK'} catalog coverage and review-ready gate.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip
            label={`Trust: ${universeHealth?.trustStatus || 'UNKNOWN'}`}
            color={trustColor(universeHealth?.trustStatus)}
            variant="filled"
          />
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => setRefreshNonce((value) => value + 1)}>
            Refresh Universe Health
          </Button>
        </Stack>
      </Stack>

      {universeHealth?.trustStatus !== 'OK' && (
        <Alert severity={universeHealth?.trustStatus === 'NOT_TRUSTWORTHY' ? 'error' : 'warning'}>
          <Stack spacing={0.5}>
            <Typography variant="body2">
              Catalog size is not the reviewable universe. Today&apos;s Plan remains blocked until provider, price, and metadata coverage are trustworthy.
            </Typography>
            {(universeHealth?.trustReasons || []).slice(0, 3).map((reason) => (
              <Typography key={reason} variant="caption">{reason}</Typography>
            ))}
          </Stack>
        </Alert>
      )}

      <Box sx={{ border: '1px solid', borderColor: universeHealth?.universeSignoff?.status === 'PASS' ? 'success.main' : 'error.main', borderRadius: 1, p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Universe Signoff</Typography>
              <Typography variant="body2" color="text.secondary">
                Downstream workflows use this gate, not catalog count.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                label={`Signoff: ${universeHealth?.universeSignoff?.status || 'FAIL'}`}
                color={universeHealth?.universeSignoff?.status === 'PASS' ? 'success' : 'error'}
              />
              <Chip
                label={`Downstream allowed: ${universeHealth?.universeSignoff?.downstreamAllowed ? 'yes' : 'no'}`}
                color={universeHealth?.universeSignoff?.downstreamAllowed ? 'success' : 'warning'}
                variant="outlined"
              />
            </Stack>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1 }}>
            <Typography variant="caption">Review-ready: {formatCount(universeHealth?.universeSignoff?.reviewReadyActual)} / {formatCount(universeHealth?.universeSignoff?.minReviewReadyRequired)}</Typography>
            <Typography variant="caption">Provider unknown: {formatCount(providerUnknownRemaining)}</Typography>
            <Typography variant="caption">Retry eligible providers: {formatCount(providerRetryEligible)}</Typography>
            <Typography variant="caption">Retry cooldown providers: {formatCount(providerRetryBlocked)}</Typography>
            <Typography variant="caption">Manual provider repair: {formatCount(providerManualRequired)}</Typography>
            <Typography variant="caption">Supported identity gaps: {formatCount(repairPlan?.supportedCatalogIdentityRepairNeeded ?? universeHealth?.counts.supportedCatalogIdentityRepairNeeded)}</Typography>
            <Typography variant="caption">Business auto-repairable: {formatCount(repairPlan?.businessMetadataAutoRepairable)}</Typography>
            <Typography variant="caption">Manual business metadata: {formatCount(repairPlan?.manualBusinessMetadataRequired)}</Typography>
            <Typography variant="caption">Supported price backfill: {formatCount(repairPlan?.supportedPriceBackfillNeeded ?? repairPlan?.priceBackfillNeeded)}</Typography>
            <Typography variant="caption">Latest EOD: {universeHealth?.latestStoredEodDate || 'none'} / {universeHealth?.expectedLatestTradingDate || 'unknown'}</Typography>
            <Typography variant="caption">Next provider retry: {repairPlan?.nextProviderRetryAtMin || 'none'}</Typography>
            <Typography variant="caption">Next action: {universeHealth?.universeSignoff?.nextAction || repairPlan?.universeSignoff?.nextAction || 'none'}</Typography>
          </Box>
          {(repairPlan?.universeSignoff?.blockers || universeHealth?.universeSignoff?.blockers || []).slice(0, 5).map((blocker) => (
            <Typography key={blocker.code} variant="caption" color="text.secondary">
              {blocker.code}: {formatCount(typeof blocker.count === 'number' ? blocker.count : 0)}; required {blocker.required}; next {blocker.nextAction || 'none'}.
            </Typography>
          ))}
        </Stack>
      </Box>

      <Box sx={{ border: '1px solid', borderColor: reviewReadiness?.reviewMode === 'FULL_REVIEW' ? 'success.main' : reviewReadiness?.reviewMode === 'LIMITED_REVIEW' ? 'warning.main' : 'error.main', borderRadius: 1, p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Review Readiness Summary</Typography>
              <Typography variant="body2" color="text.secondary">
                Canonical scoped readiness used by Today Review for mode, counts, blockers, and the next bounded repair action.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                label={`Mode: ${reviewReadiness?.reviewMode || 'NO_REVIEW'}`}
                color={reviewReadiness?.reviewMode === 'FULL_REVIEW' ? 'success' : reviewReadiness?.reviewMode === 'LIMITED_REVIEW' ? 'warning' : 'error'}
              />
              <Chip label={`Decision: ${reviewReadiness?.userDecision || 'WAIT'}`} variant="outlined" />
            </Stack>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1 }}>
            <Typography variant="caption">Trusted / catalog: {formatCount(reviewReadiness?.reviewUniverse.trustedCount)} / {formatCount(reviewReadiness?.reviewUniverse.catalogCount)}</Typography>
            <Typography variant="caption">Provider-supported: {formatCount(reviewReadiness?.reviewUniverse.providerSupportedCount)}</Typography>
            <Typography variant="caption">Price-ready: {formatCount(reviewReadiness?.readinessCounts.priceReady)}</Typography>
            <Typography variant="caption">Review-ready: {formatCount(reviewReadiness?.readinessCounts.reviewReady)}</Typography>
            <Typography variant="caption">Missing latest price: {formatCount(reviewReadiness?.readinessCounts.missingLatestPrice)}</Typography>
            <Typography variant="caption">Stale latest price: {formatCount(reviewReadiness?.readinessCounts.staleLatestPrice)}</Typography>
            <Typography variant="caption">Inadequate history: {formatCount(reviewReadiness?.readinessCounts.inadequateHistory)}</Typography>
            <Typography variant="caption">Missing recent volume: {formatCount(reviewReadiness?.readinessCounts.missingRecentVolume)}</Typography>
            <Typography variant="caption">Required data-through: {reviewReadiness?.reviewUniverse.requiredDataThroughDate || 'unknown'}</Typography>
            <Typography variant="caption">Stored data-through: {reviewReadiness?.reviewUniverse.storedDataThroughDate || 'none'}</Typography>
            <Typography variant="caption">Next action: {reviewReadiness?.nextAction?.label || 'none'}</Typography>
            <Typography variant="caption">Bounded request: {reviewReadiness?.nextAction?.boundedRequest ? `batch ${reviewReadiness.nextAction.boundedRequest.batchSize}` : 'not required'}</Typography>
          </Box>
          {reviewReadiness?.blockers.slice(0, 4).map((blocker) => (
            <Typography key={`${blocker.category}-${blocker.nextActionCode}`} variant="caption" color="text.secondary">
              {blocker.category}: {formatCount(blocker.affectedCount)} {blocker.severity}; next {blocker.nextActionLabel}.
            </Typography>
          ))}
        </Stack>
      </Box>

      <Box sx={{ border: '1px solid', borderColor: trustedReviewUniverse?.status === 'READY' ? 'success.main' : trustedReviewUniverse?.status === 'LIMITED' ? 'warning.main' : 'divider', borderRadius: 1, p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Trusted Review Universe</Typography>
              <Typography variant="body2" color="text.secondary">
                User-facing price-action subset for Today&apos;s Review. Full catalog health can remain strict while this subset is used for limited research support.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                label={`Status: ${trustedReviewUniverse?.status || 'UNKNOWN'}`}
                color={trustedReviewUniverse?.status === 'READY' ? 'success' : trustedReviewUniverse?.status === 'LIMITED' ? 'warning' : 'default'}
              />
              <Chip label={`Mode: ${trustedReviewUniverse?.mode || 'NO_REVIEW'}`} variant="outlined" />
            </Stack>
          </Stack>
          <Alert severity="info">
            Missing metadata is shown as context gap, not a hard blocker for price-action review.
          </Alert>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1 }}>
            <Typography variant="caption">Catalog count: {formatCount(trustedReviewUniverse?.catalogCount)}</Typography>
            <Typography variant="caption">Provider-supported: {formatCount(trustedReviewUniverse?.providerSupportedCount)}</Typography>
            <Typography variant="caption">Trusted review universe: {formatCount(trustedReviewUniverse?.trustedCount)}</Typography>
            <Typography variant="caption">Target session: {trustedReviewUniverse?.targetTradingDate || 'unknown'}</Typography>
            <Typography variant="caption">Required data-through: {trustedReviewUniverse?.requiredDataThroughDate || 'unknown'}</Typography>
            <Typography variant="caption">Stored data-through: {trustedReviewUniverse?.storedDataThroughDate || trustedReviewUniverse?.dataThroughDate || 'none'}</Typography>
            <Typography variant="caption">Provider unknown excluded: {formatCount(trustedReviewUniverse?.excludedCounts.providerUnknown)}</Typography>
            <Typography variant="caption">Stale latest price excluded: {formatCount(trustedReviewUniverse?.excludedCounts.staleLatestPrice)}</Typography>
            <Typography variant="caption">Under 120 bars excluded: {formatCount(trustedReviewUniverse?.excludedCounts.insufficientBarsUnder120)}</Typography>
            {hasNumber(trustedReviewUniverse?.excludedCounts.insufficientBarsUnder200) && (
              <Typography variant="caption">Under 200 bars excluded: {formatCount(trustedReviewUniverse?.excludedCounts.insufficientBarsUnder200)}</Typography>
            )}
            <Typography variant="caption">Under 252 bars excluded: {formatCount(trustedReviewUniverse?.excludedCounts.insufficientBarsUnder252)}</Typography>
            <Typography variant="caption">Missing volume excluded: {formatCount(trustedReviewUniverse?.excludedCounts.missingRecentVolume)}</Typography>
            <Typography variant="caption">Missing sector context gaps: {formatCount(trustedReviewUniverse?.contextGapCounts.missingSector)}</Typography>
            <Typography variant="caption">Missing industry context gaps: {formatCount(trustedReviewUniverse?.contextGapCounts.missingIndustry)}</Typography>
            <Typography variant="caption">Missing market cap context gaps: {formatCount(trustedReviewUniverse?.contextGapCounts.missingMarketCap)}</Typography>
            <Typography variant="caption">Lite/full thresholds: {formatCount(trustedReviewUniverse?.minLiteCount)} / {formatCount(trustedReviewUniverse?.minFullCount)}</Typography>
            <Typography variant="caption">Scan ordering: {trustedReviewUniverse?.scanPolicy?.scanOrdering || 'not published'}</Typography>
          </Box>
          {(trustedReviewUniverse?.warnings || []).slice(0, 3).map((warning) => (
            <Typography key={warning} variant="caption" color="text.secondary">{warning}</Typography>
          ))}
        </Stack>
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Trusted Universe Repair Workbench</Typography>
              <Typography variant="body2" color="text.secondary">
                Normalized IN / STOCK repair lanes with bounded actions and latest run evidence.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                label={`Recommended: ${repairWorkbench?.recommendedNextLane || 'none'}`}
                color={repairWorkbench?.recommendedNextLane ? 'warning' : 'success'}
                variant="outlined"
              />
              <Chip label={`Scope: ${repairWorkbench?.scope.region || 'IN'} / ${repairWorkbench?.scope.assetType || 'STOCK'}`} variant="outlined" />
            </Stack>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
            {(repairWorkbench?.lanes || []).map((lane) => {
              const action = laneRepairAction(lane);
              const disabled = Boolean(repairRunning || repairRunRunning) || !lane.nextAction.enabled || !action;
              return (
                <Box key={lane.code} sx={{ p: 1.5, border: '1px solid', borderColor: lane.code === repairWorkbench?.recommendedNextLane ? 'warning.main' : 'divider', borderRadius: 1 }}>
                  <Stack spacing={1}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>{lane.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{lane.code}</Typography>
                      </Box>
                      <Chip size="small" label={`Batch ${lane.boundedBatchSize}`} variant="outlined" />
                    </Stack>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1 }}>
                      <Typography variant="caption">Affected {formatCount(lane.affectedCount)}</Typography>
                      <Typography variant="caption">Eligible {formatCount(lane.eligibleNowCount)}</Typography>
                      <Typography variant="caption">Retryable {formatCount(lane.retryableFailureCount)}</Typography>
                      <Typography variant="caption">Manual {formatCount(lane.manualRequiredCount)}</Typography>
                      <Typography variant="caption">Skipped {formatCount(lane.skippedRecentAttemptCount)}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">{lane.expectedEffect}</Typography>
                    {lane.lastRun ? (
                      <Typography variant="caption">
                        Latest run {lane.lastRun.status}: success {formatCount(lane.lastRun.successCount)}, failed {formatCount(lane.lastRun.failureCount)}, skipped {formatCount(lane.lastRun.skippedCount)}, warnings {formatCount(lane.lastRun.warningCount)}.
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No latest run evidence for this lane.</Typography>
                    )}
                    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                      <Button
                        variant={lane.code === repairWorkbench?.recommendedNextLane ? 'contained' : 'outlined'}
                        size="small"
                        disabled={disabled}
                        onClick={() => action && void runRepair(action, lane.nextAction.request)}
                      >
                        {lane.nextAction.actionCode}
                      </Button>
                      <Typography variant="caption" color={lane.nextAction.enabled ? 'text.secondary' : 'warning.main'}>
                        {lane.nextAction.enabled
                          ? `${lane.nextAction.method} ${lane.nextAction.endpoint}; ${lane.nextAction.request.region}/${lane.nextAction.request.assetType}; batch ${lane.nextAction.request.batchSize}`
                          : lane.nextAction.disabledReason}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Box>
          {(repairWorkbench?.warnings || []).slice(0, 3).map((warning) => (
            <Typography key={warning} variant="caption" color="text.secondary">{warning}</Typography>
          ))}
        </Stack>
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Operational Repair Run</Typography>
              <Typography variant="body2" color="text.secondary">
                Runs bounded provider, catalog, business metadata, and price repair batches in dependency order, then records before/after health.
              </Typography>
            </Box>
            {latestRepairRun && (
              <Chip
                label={`Last run: ${latestRepairRun.status}`}
                color={repairRunColor(latestRepairRun)}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="outlined"
              size="small"
              disabled={Boolean(repairRunRunning || repairRunning)}
              startIcon={repairRunRunning === 'DRY_RUN' ? <CircularProgress size={16} /> : <ManageSearchIcon />}
              onClick={() => void runOperationalRepair(true)}
            >
              Run dry-run
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={Boolean(repairRunRunning || repairRunning)}
              startIcon={repairRunRunning === 'RUN' ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
              onClick={() => void runOperationalRepair(false)}
            >
              Start repair run
            </Button>
            <Button
              variant="contained"
              size="small"
              color="warning"
              disabled={Boolean(repairRunRunning || repairRunning)}
              startIcon={repairRunRunning === 'DRAIN' ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
              onClick={() => void runOperationalRepair(false, true)}
            >
              Run Drain
            </Button>
          </Stack>

          {latestRepairRun && !repairRunIsGreen(latestRepairRun) && (
            <Typography variant="caption" color="warning.main">
              Latest repair run is not signoff-ready{latestRepairRun.afterTrustStatus ? `; trust ${latestRepairRun.afterTrustStatus}` : ''}{latestRepairRun.expectedNextAction ? `; next action ${latestRepairRun.expectedNextAction}` : ''}.
            </Typography>
          )}

          {repairRunRunning && <LinearProgress aria-label="Market data operational repair run progress" />}

          {repairRunResult && (
            <Alert severity={repairRunResult.status === 'FAILED' ? 'error' : repairRunIsGreen(repairRunResult) ? 'success' : 'warning'}>
              <Stack spacing={1}>
                <Typography variant="body2">
                  {repairRunResult.dryRun ? 'Dry-run expected actions' : `Repair run ${repairRunResult.status}`}:
                  {' '}updated {formatCount(repairRunResult.summary.updated)}, skipped {formatCount(repairRunResult.summary.skipped)}, failed {formatCount(repairRunResult.summary.failed)}, manual-required {formatCount(repairRunResult.summary.manualRequired)}.
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1 }}>
                  <Typography variant="caption">Review-ready: {formatCount(repairRunResult.beforeHealth.counts.reviewReady)}{' -> '}{formatCount(repairRunResult.afterHealth.counts.reviewReady)}</Typography>
                  <Typography variant="caption">Provider-supported: {formatCount(repairRunResult.beforeHealth.counts.providerSupported)}{' -> '}{formatCount(repairRunResult.afterHealth.counts.providerSupported)}</Typography>
                  <Typography variant="caption">Metadata coverage: {formatPercent(repairRunResult.beforeHealth.coverage.metadataCoveragePercentage)}{' -> '}{formatPercent(repairRunResult.afterHealth.coverage.metadataCoveragePercentage)}</Typography>
                  <Typography variant="caption">Price-ready: {formatCount(repairRunResult.beforeHealth.counts.priceReady)}{' -> '}{formatCount(repairRunResult.afterHealth.counts.priceReady)}</Typography>
                </Box>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {repairRunResult.actions.map((action) => (
                    <Chip
                      key={action.action}
                      size="small"
                      label={`${action.label}: ${repairRunResult.dryRun ? `${formatCount(action.estimatedTotal)} planned` : `${formatCount(action.batchesExecuted)} batches`}`}
                      color={action.error ? 'error' : action.anotherRunNeeded ? 'warning' : 'default'}
                      variant="outlined"
                    />
                  ))}
                </Stack>
                {repairRunResult.afterHealth.trustStatus !== 'OK' && (
                  <Typography variant="caption" color="warning.main">
                    Today&apos;s Plan remains blocked because {repairRunResult.afterHealth.counts.reviewReady === 0 ? 'review-ready universe is 0 and ' : ''}universe trust is {repairRunResult.afterHealth.trustStatus}.
                  </Typography>
                )}
                {(repairRunResult.anotherRunNeeded || repairRunResult.expectedNextAction) && (
                  <Typography variant="caption" color="warning.main">
                    Another bounded repair run is needed{repairRunResult.expectedNextAction ? `; next action ${repairRunResult.expectedNextAction}.` : '.'}
                  </Typography>
                )}
                {repairRunResult.universeSignoff?.status === 'FAIL' && (
                  <Typography variant="caption" color="warning.main">
                    Universe signoff FAIL; downstream allowed: no; next action {repairRunResult.universeSignoff.nextAction || 'manual review'}.
                  </Typography>
                )}
                {repairRunResult.hardBlockersRemaining.slice(0, 3).map((blocker) => (
                  <Typography key={blocker.code} variant="caption">{blocker.label}: {formatCount(blocker.count)}</Typography>
                ))}
                {repairRunResult.warnings.slice(0, 3).map((warning) => (
                  <Typography key={warning} variant="caption">{warning}</Typography>
                ))}
              </Stack>
            </Alert>
          )}
        </Stack>
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Universe Repair Workflow</Typography>
              <Typography variant="body2" color="text.secondary">
                Each action runs one bounded batch. Price backfill repairs shallow supported rows and catches up completed EOD candles.
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Batch size {REPAIR_BATCH_SIZE}; mutating queues re-read from offset 0 until empty
            </Typography>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1 }}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Provider unknown</Typography>
              <Typography variant="h6">{formatCount(providerUnknownRemaining)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Retry eligible providers</Typography>
              <Typography variant="h6">{formatCount(providerRetryEligible)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: providerRetryBlocked > 0 ? 'warning.main' : 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Retry cooldown providers</Typography>
              <Typography variant="h6">{formatCount(providerRetryBlocked)}</Typography>
              {repairPlan?.nextProviderRetryAtMin && <Typography variant="caption" color="text.secondary">Next {repairPlan.nextProviderRetryAtMin}</Typography>}
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: providerManualRequired > 0 ? 'warning.main' : 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Manual provider repair</Typography>
              <Typography variant="h6">{formatCount(providerManualRequired)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Unsupported excluded</Typography>
              <Typography variant="h6">{formatCount(repairPlan?.providerUnsupportedExcluded ?? repairPlan?.unsupportedExcluded ?? universeHealth?.counts.unsupportedExcluded)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Supported identity gaps</Typography>
              <Typography variant="h6">{formatCount(repairPlan?.supportedCatalogIdentityRepairNeeded ?? repairPlan?.catalogIdentityRepairNeeded)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Supported price backfill needed</Typography>
              <Typography variant="h6">{formatCount(repairPlan?.supportedPriceBackfillNeeded ?? repairPlan?.priceBackfillNeeded)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Supported business metadata gaps</Typography>
              <Typography variant="h6">{formatCount(repairPlan?.supportedBusinessMetadataRepairNeeded ?? repairPlan?.businessMetadataRepairNeeded)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Business metadata auto-repairable</Typography>
              <Typography variant="h6">{formatCount(repairPlan?.businessMetadataAutoRepairable ?? repairPlan?.businessMetadataRepairNeeded ?? repairPlan?.metadataEnrichmentNeeded)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Business metadata manual-required</Typography>
              <Typography variant="h6">{formatCount(repairPlan?.businessMetadataManualRequired ?? 0)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Business metadata retry-blocked</Typography>
              <Typography variant="h6">{formatCount(repairPlan?.businessMetadataRetryBlocked ?? 0)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Business metadata retry-eligible</Typography>
              <Typography variant="h6">{formatCount(repairPlan?.businessMetadataRetryEligible ?? 0)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Recently attempted/skipped</Typography>
              <Typography variant="h6">{formatCount(repairPlan?.businessMetadataRecentlyAttempted ?? 0)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Manual business metadata required</Typography>
              <Typography variant="h6">{formatCount(repairPlan?.manualBusinessMetadataRequired ?? repairPlan?.manualMetadataRequired)}</Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="contained"
              size="small"
              startIcon={repairRunning === 'VALIDATE_PROVIDERS' ? <CircularProgress size={16} color="inherit" /> : <FactCheckIcon />}
              disabled={Boolean(repairRunning) || providerUnknownRemaining === 0}
              onClick={() => void runRepair('VALIDATE_PROVIDERS')}
            >
              Validate unknown providers
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={repairRunning === 'RETRY_FAILED_PROVIDERS' ? <CircularProgress size={16} /> : <FactCheckIcon />}
              disabled={Boolean(repairRunning) || providerUnknownRemaining > 0 || providerRetryEligible === 0}
              onClick={() => void runRepair('RETRY_FAILED_PROVIDERS')}
            >
              Retry failed providers
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={repairRunning === 'CATALOG_IDENTITY_REPAIR' ? <CircularProgress size={16} /> : <ManageSearchIcon />}
              disabled={Boolean(repairRunning) || ((repairPlan?.supportedCatalogIdentityRepairNeeded ?? repairPlan?.catalogIdentityRepairNeeded ?? 0) === 0)}
              onClick={() => void runRepair('CATALOG_IDENTITY_REPAIR')}
            >
              Repair catalog identity
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={repairRunning === 'PROVIDER_BUSINESS_METADATA_REPAIR' ? <CircularProgress size={16} /> : <ManageSearchIcon />}
              disabled={Boolean(repairRunning) || (((repairPlan?.businessMetadataAutoRepairable ?? repairPlan?.businessMetadataRepairNeeded ?? repairPlan?.metadataEnrichmentNeeded) || 0) + (repairPlan?.businessMetadataRetryEligible || 0)) === 0}
              onClick={() => void runRepair('PROVIDER_BUSINESS_METADATA_REPAIR')}
            >
              Enrich provider business metadata
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={repairRunning === 'MANUAL_METADATA_IMPORT' ? <CircularProgress size={16} /> : <ManageSearchIcon />}
              disabled={Boolean(repairRunning) || !manualMetadataCsv.trim() || manualMetadataErrors.length > 0}
              onClick={() => void runRepair('MANUAL_METADATA_IMPORT')}
            >
              Import manual metadata
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ManageSearchIcon />}
              disabled={Boolean(repairRunning)}
              onClick={() => void exportManualTemplate()}
            >
              Export Manual Metadata Template
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={repairRunning === 'BACKFILL_PRICES' ? <CircularProgress size={16} /> : <SyncIcon />}
              disabled={Boolean(repairRunning) || ((repairPlan?.supportedPriceBackfillNeeded ?? repairPlan?.priceBackfillNeeded ?? 0) === 0)}
              onClick={() => void runRepair('BACKFILL_PRICES')}
            >
              Backfill prices
            </Button>
            <Button variant="text" size="small" startIcon={<RefreshIcon />} onClick={() => setRefreshNonce((value) => value + 1)} disabled={Boolean(repairRunning)}>
              Refresh health
            </Button>
          </Stack>
          {retryDisabledReason && <Typography variant="caption" color="warning.main">{retryDisabledReason}</Typography>}

          <TextField
            label="Manual metadata CSV"
            value={manualMetadataCsv}
            onChange={(event) => {
              setManualMetadataCsv(event.target.value);
              setManualMetadataOffset(0);
            }}
            multiline
            minRows={3}
            placeholder="symbol,sector,industry,marketCap,isin,listingDate"
            helperText="Required columns: symbol or providerSymbol, sector, industry, and marketCap. marketCap must be a positive number."
            error={manualMetadataErrors.length > 0}
          />
          {manualTemplateMessage && (
            <Typography variant="caption" color="text.secondary">{manualTemplateMessage}</Typography>
          )}
          {manualMetadataErrors.map((validationError) => (
            <Typography key={validationError} variant="caption" color="error">{validationError}</Typography>
          ))}

          {repairRunning && <LinearProgress aria-label="Market data repair progress" />}
          {repairError && <Alert severity="error">{repairError}</Alert>}
          {repairSummary && (
            <Alert severity={repairSummarySeverity}>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  Last repair batch processed {formatCount(repairSummary.processedCount)} of {formatCount(repairSummary.totalCount)}; updated {formatCount(repairSummary.updated)}, skipped {formatCount(repairSummary.skipped)}, failed {formatCount(repairSummary.failed)}, no-op {formatCount(repairSummary.noOp)}, manual required {formatCount(repairSummary.manualRequired)}.
                </Typography>
                <Typography variant="caption">
                  {repairSummary.hasMore
                    ? lastRepairAction === 'CATALOG_IDENTITY_REPAIR' || lastRepairAction === 'MANUAL_METADATA_IMPORT'
                      ? `More source rows remain; next offset ${formatCount(repairSummary.nextOffset ?? 0)}.`
                      : 'Another bounded run is needed; rerun this batch action from offset 0.'
                    : 'No more rows in this repair queue.'}
                </Typography>
                {(hasNumber(repairSummary.priceRowsReceived) ||
                  hasNumber(repairSummary.priceRowsInserted) ||
                  hasNumber(repairSummary.priceRowsUpdated) ||
                  hasNumber(repairSummary.priceRowsNoOp)) && (
                  <Typography variant="caption">
                    Price rows received {formatCount(repairSummary.priceRowsReceived)}, inserted {formatCount(repairSummary.priceRowsInserted)}, updated {formatCount(repairSummary.priceRowsUpdated)}, no-op {formatCount(repairSummary.priceRowsNoOp)}.
                  </Typography>
                )}
                {(hasNumber(repairSummary.zeroRowProviderReturns) ||
                  hasNumber(repairSummary.deepReloaded) ||
                  hasNumber(repairSummary.incrementalCaughtUp) ||
                  hasNumber(repairSummary.remainingCandidates)) && (
                  <Typography variant="caption">
                    Zero-row provider returns {formatCount(repairSummary.zeroRowProviderReturns)}; deep reloaded {formatCount(repairSummary.deepReloaded)}; incremental caught up {formatCount(repairSummary.incrementalCaughtUp)}; remaining candidates {formatCount(repairSummary.remainingCandidates)}.
                  </Typography>
                )}
                {(repairSummary.latestCompletedEodDate || repairSummary.targetEndDate) && (
                  <Typography variant="caption">
                    Latest completed EOD {repairSummary.latestCompletedEodDate || 'unknown'}; target end {repairSummary.targetEndDate || 'unknown'}.
                  </Typography>
                )}
                {(hasNumber(repairSummary.stillUnder120) ||
                  hasNumber(repairSummary.stillUnder200) ||
                  hasNumber(repairSummary.stillUnder252)) && (
                  <Typography variant="caption">
                    Still under 120 {formatCount(repairSummary.stillUnder120)}, under 200 {formatCount(repairSummary.stillUnder200)}, under 252 {formatCount(repairSummary.stillUnder252)}.
                  </Typography>
                )}
                {repairSummary.providerValidationQueue && <Typography variant="caption">Provider queue: {repairSummary.providerValidationQueue}.</Typography>}
                {(hasNumber(repairSummary.providerValidated) ||
                  hasNumber(repairSummary.providerSupported) ||
                  hasNumber(repairSummary.providerUnsupported) ||
                  hasNumber(repairSummary.validationFailed)) && (
                  <Typography variant="caption">
                    Provider validation: validated {formatCount(repairSummary.providerValidated)}, supported {formatCount(repairSummary.providerSupported)}, unsupported {formatCount(repairSummary.providerUnsupported)}, failed {formatCount(repairSummary.validationFailed)}.
                  </Typography>
                )}
                {(hasNumber(repairSummary.supportedFromStoredPrices) ||
                  hasNumber(repairSummary.unsupportedNoProviderSymbol) ||
                  hasNumber(repairSummary.unsupportedNoCandlesWideWindow) ||
                  hasNumber(repairSummary.manualSymbolRepairRequired)) && (
                  <Typography variant="caption">
                    Provider classifications: stored-price supported {formatCount(repairSummary.supportedFromStoredPrices)}, no provider symbol {formatCount(repairSummary.unsupportedNoProviderSymbol)}, no candles in wide window {formatCount(repairSummary.unsupportedNoCandlesWideWindow)}, manual symbol repair {formatCount(repairSummary.manualSymbolRepairRequired)}.
                  </Typography>
                )}
                {(hasNumber(repairSummary.retryableTimeout) ||
                  hasNumber(repairSummary.retryableProviderError) ||
                  hasNumber(repairSummary.retryableRateLimited) ||
                  hasNumber(repairSummary.retryCooldownSkipped) ||
                  hasNumber(repairSummary.manualRequiredSkipped)) && (
                  <Typography variant="caption">
                    Retry diagnostics: timeout {formatCount(repairSummary.retryableTimeout)}, provider error {formatCount(repairSummary.retryableProviderError)}, rate limit {formatCount(repairSummary.retryableRateLimited)}, cooldown skipped {formatCount(repairSummary.retryCooldownSkipped)}, manual skipped {formatCount(repairSummary.manualRequiredSkipped)}.
                  </Typography>
                )}
                {(hasNumber(repairSummary.remainingUnknown) ||
                  hasNumber(repairSummary.remainingRetryEligible) ||
                  hasNumber(repairSummary.remainingRetryBlocked) ||
                  hasNumber(repairSummary.remainingManualRequired) ||
                  repairSummary.nextRetryAtMin) && (
                  <Typography variant="caption">
                    Remaining provider queues: unknown {formatCount(repairSummary.remainingUnknown)}, retry eligible {formatCount(repairSummary.remainingRetryEligible)}, retry blocked {formatCount(repairSummary.remainingRetryBlocked)}, manual {formatCount(repairSummary.remainingManualRequired)}, next retry {repairSummary.nextRetryAtMin || 'none'}.
                  </Typography>
                )}
                {(hasNumber(repairSummary.providerCalls) ||
                  hasNumber(repairSummary.providerTimeouts) ||
                  hasNumber(repairSummary.providerRetryableFailures) ||
                  hasNumber(repairSummary.slowProviderCalls) ||
                  hasNumber(repairSummary.maxProviderCallMs) ||
                  hasNumber(repairSummary.p95ProviderCallMs)) && (
                  <Typography variant="caption">
                    Provider timing: calls {formatCount(repairSummary.providerCalls)}, timeouts {formatCount(repairSummary.providerTimeouts)}, retryable failures {formatCount(repairSummary.providerRetryableFailures)}, slow calls {formatCount(repairSummary.slowProviderCalls)}, max {formatCount(repairSummary.maxProviderCallMs)} ms, p95 {formatCount(repairSummary.p95ProviderCallMs)} ms.
                  </Typography>
                )}
                {(repairSummary.validationWindowStartDate ||
                  repairSummary.validationWindowEndDate ||
                  repairSummary.fallbackSourceAttempted ||
                  hasNumber(repairSummary.freeFallbackRequired)) && (
                  <Typography variant="caption">
                    Validation window {repairSummary.validationWindowStartDate || 'unknown'} to {repairSummary.validationWindowEndDate || 'unknown'}; free fallback required {formatCount(repairSummary.freeFallbackRequired)}; source attempted {repairSummary.fallbackSourceAttempted || 'none'}; paid providers forbidden.
                  </Typography>
                )}
                {(repairSummary.requiredHistoryStartDate ||
                  repairSummary.listingDate ||
                  repairSummary.latestCompletedEodDate ||
                  repairSummary.targetEndDate ||
                  repairSummary.requiredHistoryCoverageStatus ||
                  hasNumber(repairSummary.stillUnder252) ||
                  hasNumber(repairSummary.freeFallbackRequired) ||
                  hasNumber(repairSummary.remainingCandidates)) && (
                  <Typography variant="caption">
                    Coverage target: 15-year/listing-date daily OHLCV from {repairSummary.requiredHistoryStartDate || repairSummary.listingDate || 'target start unknown'} through latest completed EOD {repairSummary.latestCompletedEodDate || repairSummary.targetEndDate || 'unknown'}; listing date {repairSummary.listingDate || 'unknown'}; status {coverageStatus(repairSummary)}.
                  </Typography>
                )}
                {repairSummary.partialSuccess ? <Typography variant="caption">Partial metadata repairs: {formatCount(repairSummary.partialSuccess)}.</Typography> : null}
                {repairSummary.providerNotFound ? <Typography variant="caption">Provider not found/useful for {formatCount(repairSummary.providerNotFound)} rows.</Typography> : null}
                {repairSummary.skippedRecentAttempt ? <Typography variant="caption">Recently attempted/skipped: {formatCount(repairSummary.skippedRecentAttempt)}.</Typography> : null}
                {repairSummary.remainingAutoRepairable !== undefined ? <Typography variant="caption">Remaining auto-repairable: {formatCount(repairSummary.remainingAutoRepairable)}.</Typography> : null}
                {repairSummary.remainingManualRequired !== undefined ? <Typography variant="caption">Remaining manual-required: {formatCount(repairSummary.remainingManualRequired)}.</Typography> : null}
                {repairSummary.catalogIdentityRepaired ? <Typography variant="caption">Catalog identity repaired for {formatCount(repairSummary.catalogIdentityRepaired)} rows.</Typography> : null}
                {repairSummary.matchedExistingRows ? <Typography variant="caption">Matched existing rows: {formatCount(repairSummary.matchedExistingRows)}.</Typography> : null}
                {repairSummary.unmatchedCatalogRows ? <Typography variant="caption">Unmatched catalog rows: {formatCount(repairSummary.unmatchedCatalogRows)}.</Typography> : null}
                {repairSummary.fieldsFilled ? <Typography variant="caption">Fields repaired: {Object.entries(repairSummary.fieldsFilled).map(([field, count]) => `${field} ${formatCount(count)}`).join(', ')}.</Typography> : null}
                {(repairSummary.warnings || []).slice(0, 2).map((warning) => (
                  <Typography key={warning} variant="caption">{warning}</Typography>
                ))}
                {(repairSummary.sampleResults || []).slice(0, 3).map((sample) => (
                  <Typography key={`${sample.symbol}-${sample.classification || sample.status || 'result'}`} variant="caption">
                    Sample {sample.symbol}: {sample.classification || sample.status || 'unclassified'}{sample.providerSymbol ? ` via ${sample.providerSymbol}` : ''}{hasNumber(sample.candlesFound) ? `; candles ${formatCount(sample.candlesFound)}` : ''}{hasNumber(sample.providerCallMs) ? `; ${formatCount(sample.providerCallMs)} ms` : ''}{sample.nextRetryAt ? `; next retry ${sample.nextRetryAt}` : ''}{sample.message ? `; ${sample.message}` : ''}.
                  </Typography>
                ))}
              </Stack>
            </Alert>
          )}
          {catalogIdentityOffset > 0 && (
            <Button variant="text" size="small" onClick={() => setCatalogIdentityOffset(0)} disabled={Boolean(repairRunning)}>
              Restart catalog identity from zero
            </Button>
          )}
          {manualMetadataOffset > 0 && (
            <Button variant="text" size="small" onClick={() => setManualMetadataOffset(0)} disabled={Boolean(repairRunning)}>
              Restart manual metadata import from zero
            </Button>
          )}
          {(repairPlan?.warnings || []).slice(0, 3).map((warning) => (
            <Typography key={warning} variant="caption" color="text.secondary">{warning}</Typography>
          ))}
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">System Status</Typography>
        <Typography variant="h6">{status?.status === 'ok' ? 'Healthy' : 'Unknown'}</Typography>
        <Typography variant="caption" color="text.secondary">Trust: {status?.data_status || 'MISSING'}</Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Catalog vs Review Ready</Typography>
        <Typography variant="h6">{formatCount(universeHealth?.counts.totalCatalogInstruments)} / {formatCount(universeHealth?.counts.reviewReady)}</Typography>
        <Typography variant="caption" color="text.secondary">
          total catalog / strict review-ready
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Provider Validation</Typography>
        <Typography variant="h6">{formatCount(universeHealth?.counts.providerSupported)} supported</Typography>
        <Typography variant="caption" color="text.secondary">
          {formatCount(universeHealth?.counts.providerUnknownValidationNeeded ?? universeHealth?.counts.providerUnknown)} unknown, {formatCount(universeHealth?.counts.providerRetryValidationNeeded)} retry failed, {formatCount(universeHealth?.counts.unsupportedExcluded ?? universeHealth?.counts.unsupported)} unsupported excluded
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Daily Candle</Typography>
        <Typography variant="body1">{formatCandleStatus(candleStatus)}</Typography>
        <Typography variant="caption" color="text.secondary">
          Stored: {candleStatus?.latestStoredTradingDate || 'none'}
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Price Coverage</Typography>
        <Typography variant="h6">{formatPercent(universeHealth?.coverage.priceCoveragePercentage)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {formatCount(universeHealth?.counts.priceReady)} price-ready; {formatCount(universeHealth?.counts.missingLatestPrice)} missing latest
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Metadata Coverage</Typography>
        <Typography variant="h6">{formatPercent(universeHealth?.coverage.metadataCoveragePercentage)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {formatCount(universeHealth?.counts.missingSector)} missing sector, {formatCount(universeHealth?.counts.missingIndustry)} missing industry
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Latest EOD</Typography>
        <Typography variant="body1">Stored: {universeHealth?.latestStoredEodDate || 'none'}</Typography>
        <Typography variant="caption" color="text.secondary">
          Expected: {universeHealth?.expectedLatestTradingDate || 'unknown'}
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Stale / Incomplete</Typography>
        <Typography variant="h6">{formatCount(universeHealth?.counts.staleOrIncomplete)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {formatCount(universeHealth?.counts.missingOrInadequatePriceHistory)} history gaps, {formatCount(universeHealth?.counts.missingRecentVolume)} volume gaps
        </Typography>
      </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Top Readiness Blockers</Typography>
              <Typography variant="body2" color="text.secondary">
                Bad data is shown as review blockers; active catalog rows are not treated as reviewable rows.
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Last health check: {universeHealth?.generatedAt ? formatTimestamp(universeHealth.generatedAt) : 'not available'}
            </Typography>
          </Stack>
          <Divider />
          {universeHealth?.topBlockers.length ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
              {universeHealth.topBlockers.map((blocker) => (
                <Stack key={blocker.code} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="body2">{blocker.label}</Typography>
                  <Chip size="small" color={blocker.severity === 'critical' ? 'error' : 'warning'} label={formatCount(blocker.count)} />
                </Stack>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No active universe blockers reported.</Typography>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
};

export default MarketDataStatusPanel;
