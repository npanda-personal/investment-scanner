import {
  Alert,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { money } from '@/shared/format/money';
import type {
  MarketScanSummary52w,
  MarketScanSummaryDeliverySpike,
  MarketScanSummaryVolumeSpike,
  MarketScanRow52w,
  MarketScanRowDeliverySpike,
  MarketScanRowVolumeSpike,
} from '../types';
import {
  fetchMarketScan52wHigh,
  fetchMarketScan52wLow,
  fetchMarketScanDeliverySpike,
  fetchMarketScanVolumeSpike,
} from '../api/marketScansService';

type TabId = '52w-high' | '52w-low' | 'delivery-spike' | 'volume-spike';

const TABS: { id: TabId; label: string }[] = [
  { id: '52w-high', label: '52W Highs' },
  { id: '52w-low', label: '52W Lows' },
  { id: 'delivery-spike', label: 'Delivery Spikes' },
  { id: 'volume-spike', label: 'Volume Spikes' },
];

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

function SectorChip({ sector }: { sector: string | null }) {
  if (!sector) return <Typography variant="body2" color="text.disabled">—</Typography>;
  return <Chip label={sector} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />;
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

function EmptyState({ message }: { message: string }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
}

function pctColor(pct: number): string {
  if (pct > 0) return 'success.main';
  if (pct < 0) return 'error.main';
  return 'text.secondary';
}

function formatPct(val: number): string {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

function formatVolume(vol: number): string {
  if (vol >= 1e7) return `${(vol / 1e7).toFixed(1)}Cr`;
  if (vol >= 1e5) return `${(vol / 1e5).toFixed(1)}L`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return String(Math.round(vol));
}

// ---- 52W High/Low Table ----

function Table52w({ rows, scanType, currency }: { rows: MarketScanRow52w[]; scanType: '52w-high' | '52w-low'; currency?: string }) {
  if (!rows.length) {
    return <EmptyState message="No instruments found matching the scan criteria." />;
  }
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Symbol</TableCell>
            <TableCell>Company</TableCell>
            <TableCell>Sector</TableCell>
            <TableCell align="right">Current Price</TableCell>
            <TableCell align="right">52W High</TableCell>
            <TableCell align="right">52W Low</TableCell>
            <TableCell align="right">% from High</TableCell>
            <TableCell align="right">% from Low</TableCell>
            <TableCell>Basis</TableCell>
            <TableCell>Signal</TableCell>
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
                  <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                    {row.companyName}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell><SectorChip sector={row.sector} /></TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={600}>{money(row.currentPrice, currency)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color={scanType === '52w-high' ? 'success.main' : 'text.secondary'}>
                  {money(row.high52w, currency)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color={scanType === '52w-low' ? 'error.main' : 'text.secondary'}>
                  {money(row.low52w, currency)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color={pctColor(row.pctFromHigh)} fontWeight={scanType === '52w-high' ? 700 : 400}>
                  {formatPct(row.pctFromHigh)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color={pctColor(row.pctFromLow)} fontWeight={scanType === '52w-low' ? 700 : 400}>
                  {formatPct(row.pctFromLow)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">
                  {row.priceBasis === 'ADJUSTED_CLOSE' ? 'Adj' : 'Raw'}
                </Typography>
              </TableCell>
              <TableCell>
                <SignalChip direction={row.signalDirection} score={row.signalScore} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ---- Delivery Spike Table ----

function TableDeliverySpike({ rows }: { rows: MarketScanRowDeliverySpike[] }) {
  if (!rows.length) {
    return <EmptyState message="No delivery-spike candidates found. Delivery data covers NSE-listed stocks only." />;
  }
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Symbol</TableCell>
            <TableCell>Company</TableCell>
            <TableCell>Sector</TableCell>
            <TableCell align="right">Latest Delivery %</TableCell>
            <TableCell align="right">Avg Delivery %</TableCell>
            <TableCell align="right">Spike Ratio</TableCell>
            <TableCell align="right">Lookback (bars)</TableCell>
            <TableCell>Signal</TableCell>
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
                  <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                    {row.companyName}
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell><SectorChip sector={row.sector} /></TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={600} color="success.main">
                  {row.deliveryPct.toFixed(1)}%
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">
                  {row.avgDeliveryPct.toFixed(1)}%
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={700} color="warning.main">
                  {row.spikeRatio.toFixed(2)}x
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">{row.lookbackBars}</Typography>
              </TableCell>
              <TableCell>
                <SignalChip direction={row.signalDirection} score={row.signalScore} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ---- Volume Spike Table ----

function TableVolumeSpike({ rows }: { rows: MarketScanRowVolumeSpike[] }) {
  if (!rows.length) {
    return <EmptyState message="No volume-spike candidates found. Check that recent price data has been ingested." />;
  }
  // Derive lookback window from first row (all rows share the same lookback param)
  const lookbackWindow = rows[0]?.lookbackBars ?? null;
  return (
    <>
      {lookbackWindow != null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          vs {lookbackWindow}-day average volume
        </Typography>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell align="right">Latest Volume</TableCell>
              <TableCell align="right">Avg Volume</TableCell>
              <TableCell align="right">Spike Ratio</TableCell>
              <TableCell align="right">Lookback (bars)</TableCell>
              <TableCell>Signal</TableCell>
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
                    <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                      {row.companyName}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell><SectorChip sector={row.sector} /></TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600}>
                    {formatVolume(row.latestVolume)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {formatVolume(row.avgVolume)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="warning.main">
                    {row.spikeRatio.toFixed(2)}x
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">{row.lookbackBars}</Typography>
                </TableCell>
                <TableCell>
                  <SignalChip direction={row.signalDirection} score={row.signalScore} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

// ---- Main Page ----

export default function MarketScansPage() {
  const { scope, profile } = useMarketScope();
  // Delivery-spike is NSE-delivery-based — not applicable to crypto.
  const visibleTabs = TABS.filter((t) => t.id !== 'delivery-spike' || profile.capabilities.hasDelivery);
  const [activeTab, setActiveTab] = useState<TabId>('52w-high');

  const [data52wHigh, setData52wHigh] = useState<MarketScanSummary52w | null>(null);
  const [data52wLow, setData52wLow] = useState<MarketScanSummary52w | null>(null);
  const [dataDelivery, setDataDelivery] = useState<MarketScanSummaryDeliverySpike | null>(null);
  const [dataVolume, setDataVolume] = useState<MarketScanSummaryVolumeSpike | null>(null);

  const [loading, setLoading] = useState<Record<TabId, boolean>>({
    '52w-high': false,
    '52w-low': false,
    'delivery-spike': false,
    'volume-spike': false,
  });
  const [errors, setErrors] = useState<Record<TabId, string | null>>({
    '52w-high': null,
    '52w-low': null,
    'delivery-spike': null,
    'volume-spike': null,
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
    setActiveTab((prev) => (visibleTabs.some((t) => t.id === prev) ? prev : '52w-high'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.region, scope.assetType]);

  // Load active tab on first render and on tab switch if not yet loaded
  useEffect(() => {
    const alreadyLoaded = {
      '52w-high': data52wHigh !== null,
      '52w-low': data52wLow !== null,
      'delivery-spike': dataDelivery !== null,
      'volume-spike': dataVolume !== null,
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
    const tabDataReady = {
      '52w-high': data52wHigh !== null,
      '52w-low': data52wLow !== null,
      'delivery-spike': dataDelivery !== null,
      'volume-spike': dataVolume !== null,
    }[activeTab];
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
            <Table52w rows={data52wHigh.results} scanType="52w-high" currency={profile.currency} />
          </>
        );
      case '52w-low':
        if (!data52wLow) return null;
        return (
          <>
            <ScanWarning warnings={data52wLow.warnings} />
            <Table52w rows={data52wLow.results} scanType="52w-low" currency={profile.currency} />
          </>
        );
      case 'delivery-spike':
        if (!dataDelivery) return null;
        return (
          <>
            <ScanWarning warnings={dataDelivery.warnings} />
            <TableDeliverySpike rows={dataDelivery.results} />
          </>
        );
      case 'volume-spike':
        if (!dataVolume) return null;
        return (
          <>
            <ScanWarning warnings={dataVolume.warnings} />
            <TableVolumeSpike rows={dataVolume.results} />
          </>
        );
      default:
        return null;
    }
  }

  const currentResultCount = {
    '52w-high': data52wHigh?.results.length ?? null,
    '52w-low': data52wLow?.results.length ?? null,
    'delivery-spike': dataDelivery?.results.length ?? null,
    'volume-spike': dataVolume?.results.length ?? null,
  }[activeTab];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="Market Scans"
        subtitle={profile.isCrypto
          ? 'Daily screening scans for crypto assets (top market-cap universe). Persisted-read — data reflects the latest ingested OHLCV.'
          : `Daily screening scans for ${scope.region === 'IN' ? 'Indian NSE/BSE' : scope.region} equities. Persisted-read — data reflects the latest ingested price data.`}
      />

      <Paper sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_e, val: TabId) => setActiveTab(val)}
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
          </Typography>
          {currentResultCount !== null && !isLoading && (
            <Chip label={`${currentResultCount} results`} size="small" color="default" />
          )}
        </Stack>

        <Box sx={{ px: 2, pb: 2, pt: 1 }}>
          {renderTabContent()}
        </Box>
      </Paper>
    </Box>
  );
}
