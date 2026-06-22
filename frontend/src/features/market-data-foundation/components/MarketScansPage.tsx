import {
  Alert,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import type {
  MarketScanSummary52w,
  MarketScanSummaryDeliverySpike,
  MarketScanSummaryVolumeSpike,
} from '../types';
import type { MarketScanSummaryPotentialMovers } from '../types.potential-movers';
import {
  fetchMarketScan52wHigh,
  fetchMarketScan52wLow,
  fetchMarketScanDeliverySpike,
  fetchMarketScanVolumeSpike,
  fetchMarketScanPotentialMovers,
} from '../api/marketScansService';
import { Table52w, TableDeliverySpike, TableVolumeSpike, TablePotentialMovers } from './MarketScanTables';

type TabId = '52w-high' | '52w-low' | 'delivery-spike' | 'volume-spike' | 'potential-movers';

const TABS: { id: TabId; label: string }[] = [
  { id: '52w-high', label: '52W Highs' },
  { id: '52w-low', label: '52W Lows' },
  { id: 'delivery-spike', label: 'Delivery Spikes' },
  { id: 'volume-spike', label: 'Volume Spikes' },
  { id: 'potential-movers', label: 'Potential Movers' },
];

function ScanWarning({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  // Detect the "no snapshot yet" sentinel from the backend (contains MARKET_SCAN_REFRESH).
  const isPipelineNotRun = warnings[0].includes('MARKET_SCAN_REFRESH');
  return (
    <Alert severity={isPipelineNotRun ? 'info' : 'info'} sx={{ mb: 2 }}>
      {isPipelineNotRun ? (
        <>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25 }}>
            Data is being prepared by the daily pipeline
          </Typography>
          <Typography variant="body2">
            This scan snapshot hasn't been computed yet. Check back after the next pipeline run, or
            ask an admin to trigger MARKET_SCAN_REFRESH from the Pipeline Ops page.
          </Typography>
        </>
      ) : (
        warnings[0]
      )}
    </Alert>
  );
}

// ---- Main Page ----

export default function MarketScansPage() {
  const { scope, profile } = useMarketScope();
  // Delivery-spike and potential-movers are equity-only — not applicable to crypto.
  const visibleTabs = TABS.filter((t) =>
    (t.id !== 'delivery-spike' || profile.capabilities.hasDelivery) &&
    (t.id !== 'potential-movers' || !profile.isCrypto)
  );
  const [activeTab, setActiveTab] = useState<TabId>('52w-high');

  // Shared pagination state — reset to page 0 whenever the active tab changes.
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }
  function handleRowsPerPageChange(newRowsPerPage: number) {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  }

  const [data52wHigh, setData52wHigh] = useState<MarketScanSummary52w | null>(null);
  const [data52wLow, setData52wLow] = useState<MarketScanSummary52w | null>(null);
  const [dataDelivery, setDataDelivery] = useState<MarketScanSummaryDeliverySpike | null>(null);
  const [dataVolume, setDataVolume] = useState<MarketScanSummaryVolumeSpike | null>(null);
  const [dataPotentialMovers, setDataPotentialMovers] = useState<MarketScanSummaryPotentialMovers | null>(null);

  const [loading, setLoading] = useState<Record<TabId, boolean>>({
    '52w-high': false,
    '52w-low': false,
    'delivery-spike': false,
    'volume-spike': false,
    'potential-movers': false,
  });
  const [errors, setErrors] = useState<Record<TabId, string | null>>({
    '52w-high': null,
    '52w-low': null,
    'delivery-spike': null,
    'volume-spike': null,
    'potential-movers': null,
  });

  const loadTab = useCallback(async (tab: TabId) => {
    setLoading((prev) => ({ ...prev, [tab]: true }));
    setErrors((prev) => ({ ...prev, [tab]: null }));
    try {
      switch (tab) {
        case '52w-high': {
          const result = await fetchMarketScan52wHigh({ region: scope.region, assetType: scope.assetType, limit: 30 });
          setData52wHigh(result);
          break;
        }
        case '52w-low': {
          const result = await fetchMarketScan52wLow({ region: scope.region, assetType: scope.assetType, limit: 30 });
          setData52wLow(result);
          break;
        }
        case 'delivery-spike': {
          const result = await fetchMarketScanDeliverySpike({ region: scope.region, assetType: scope.assetType, limit: 30 });
          setDataDelivery(result);
          break;
        }
        case 'volume-spike': {
          const result = await fetchMarketScanVolumeSpike({ region: scope.region, assetType: scope.assetType, limit: 30 });
          setDataVolume(result);
          break;
        }
        case 'potential-movers': {
          const result = await fetchMarketScanPotentialMovers({ region: scope.region, assetType: scope.assetType, limit: 50 });
          setDataPotentialMovers(result);
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load scan data';
      setErrors((prev) => ({ ...prev, [tab]: msg }));
    } finally {
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, [scope.region, scope.assetType]);

  // Reset cached scan data and active tab when the market scope changes so a
  // crypto switch never shows stale equity rows (and vice-versa).
  useEffect(() => {
    setData52wHigh(null);
    setData52wLow(null);
    setDataDelivery(null);
    setDataVolume(null);
    setDataPotentialMovers(null);
    setActiveTab((prev) => (visibleTabs.some((t) => t.id === prev) ? prev : '52w-high'));
    setPage(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.region, scope.assetType]);

  // Load active tab on first render and on tab switch if not yet loaded
  useEffect(() => {
    const alreadyLoaded: Record<TabId, boolean> = {
      '52w-high': data52wHigh !== null,
      '52w-low': data52wLow !== null,
      'delivery-spike': dataDelivery !== null,
      'volume-spike': dataVolume !== null,
      'potential-movers': dataPotentialMovers !== null,
    };
    if (!alreadyLoaded[activeTab] && !loading[activeTab]) {
      void loadTab(activeTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const isLoading = loading[activeTab];
  const error = errors[activeTab];

  function renderTabContent() {
    // Show loading indicator while fetching OR while data has not yet been
    // requested (useEffect fires after first render, so there is a single
    // frame where loading=false but data=null — treat that as "loading" too).
    const tabDataReadyMap: Record<TabId, boolean> = {
      '52w-high': data52wHigh !== null,
      '52w-low': data52wLow !== null,
      'delivery-spike': dataDelivery !== null,
      'volume-spike': dataVolume !== null,
      'potential-movers': dataPotentialMovers !== null,
    };
    const tabDataReady = tabDataReadyMap[activeTab];
    if (isLoading || (!tabDataReady && !error)) return <LinearProgress sx={{ mt: 1 }} />;
    if (error) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      );
    }
    switch (activeTab) {
      case '52w-high':
        if (!data52wHigh) return null;
        return (
          <>
            <ScanWarning warnings={data52wHigh.warnings} />
            <Table52w rows={data52wHigh.results} scanType="52w-high" currency={profile.currency} page={page} rowsPerPage={rowsPerPage} onPageChange={handlePageChange} onRowsPerPageChange={handleRowsPerPageChange} />
          </>
        );
      case '52w-low':
        if (!data52wLow) return null;
        return (
          <>
            <ScanWarning warnings={data52wLow.warnings} />
            <Table52w rows={data52wLow.results} scanType="52w-low" currency={profile.currency} page={page} rowsPerPage={rowsPerPage} onPageChange={handlePageChange} onRowsPerPageChange={handleRowsPerPageChange} />
          </>
        );
      case 'delivery-spike':
        if (!dataDelivery) return null;
        return (
          <>
            <ScanWarning warnings={dataDelivery.warnings} />
            <TableDeliverySpike rows={dataDelivery.results} page={page} rowsPerPage={rowsPerPage} onPageChange={handlePageChange} onRowsPerPageChange={handleRowsPerPageChange} />
          </>
        );
      case 'volume-spike':
        if (!dataVolume) return null;
        return (
          <>
            <ScanWarning warnings={dataVolume.warnings} />
            <TableVolumeSpike rows={dataVolume.results} page={page} rowsPerPage={rowsPerPage} onPageChange={handlePageChange} onRowsPerPageChange={handleRowsPerPageChange} />
          </>
        );
      case 'potential-movers':
        if (!dataPotentialMovers) return null;
        return (
          <>
            <ScanWarning warnings={dataPotentialMovers.warnings} />
            <TablePotentialMovers rows={dataPotentialMovers.results} currency={profile.currency} page={page} rowsPerPage={rowsPerPage} onPageChange={handlePageChange} onRowsPerPageChange={handleRowsPerPageChange} />
          </>
        );
      default:
        return null;
    }
  }

  const currentResultCount: Record<TabId, number | null> = {
    '52w-high': data52wHigh?.results.length ?? null,
    '52w-low': data52wLow?.results.length ?? null,
    'delivery-spike': dataDelivery?.results.length ?? null,
    'volume-spike': dataVolume?.results.length ?? null,
    'potential-movers': dataPotentialMovers?.results.length ?? null,
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Market Scans"
        subtitle={profile.isCrypto
          ? 'Daily screening scans for crypto assets (top market-cap universe). Data reflects the latest stored prices.'
          : `Daily screening scans for ${scope.region === 'IN' ? 'Indian NSE/BSE' : scope.region} equities. Data reflects the latest stored prices.`}
      />

      <Paper sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_e, val: TabId) => { setActiveTab(val); setPage(0); }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {visibleTabs.map((tab) => (
              <Tab key={tab.id} value={tab.id} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        <Stack direction="row" alignItems="center" spacing={2} sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {activeTab === '52w-high' && `${profile.isCrypto ? 'Coins' : 'Stocks'} within 5% of their 52-week high (breakout watch)`}
            {activeTab === '52w-low' && `${profile.isCrypto ? 'Coins' : 'Stocks'} within 5% of their 52-week low (breakdown watch)`}
            {activeTab === 'delivery-spike' && 'Stocks with latest delivery% materially above recent rolling average (institutional-interest proxy)'}
            {activeTab === 'volume-spike' && `${profile.isCrypto ? 'Coins' : 'Stocks'} with latest volume materially above recent rolling average`}
            {activeTab === 'potential-movers' && 'Stocks showing 3 consecutive rising closes above SMA20 — pre-momentum accumulation pattern'}
          </Typography>
          {currentResultCount[activeTab] !== null && !isLoading && (
            <Chip label={`${currentResultCount[activeTab]} results`} size="small" color="default" />
          )}
        </Stack>

        <Box sx={{ px: 2, pb: 2, pt: 1 }}>
          {renderTabContent()}
        </Box>
      </Paper>
    </Box>
  );
}
