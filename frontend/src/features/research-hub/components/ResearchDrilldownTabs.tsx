/**
 * ResearchDrilldownTabs
 *
 * Inline tabbed panels for the Research Hub bottom section.
 * Each tab fetches from an already-available persisted-read endpoint.
 *
 * Tabs:
 *   Market Pulse   — fetchMarketPulseSnapshot  (market-intelligence)
 *   Breadth        — fetchPersistedMarketBreadth (market-context-intelligence)
 *   Sector Map     — fetchSectorIntelligenceSnapshot (market-intelligence)
 *   Flow           — fetchSmartMoneySectors (smart-money-intelligence)
 *                    ⚠ Price-volume proxy only — no ownership/filing data available.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  Typography,
} from '@mui/material';
import { ArrowForwardOutlined, FlashOnOutlined, GppGoodOutlined, TimelineOutlined, TrendingUpOutlined } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { humanizeCode, indexLabel } from '@/shared/format/enumLabels';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchMarketPulseSnapshot, fetchSectorIntelligenceSnapshot } from '../api/researchHubDrilldownApi';
import { fetchPersistedMarketBreadth } from '@/features/market-context-intelligence';
import type { PersistedMarketBreadthResponse } from '@/features/market-context-intelligence';
import { fetchSmartMoneySectors } from '@/features/smart-money-intelligence';
import type { SectorSmartMoneySummary } from '@/features/smart-money-intelligence';
import type { MarketPulseSnapshot, SectorIntelligenceSnapshot } from '../api/researchHubDrilldownApi';
import type { MarketScope } from '@/contexts/MarketScopeContext';

type DrilldownTab = 'market-pulse' | 'breadth' | 'sector-map' | 'flow';

export const ResearchDrilldownTabs: React.FC = () => {
  const { scope } = useMarketScope();
  const [activeTab, setActiveTab] = useState<DrilldownTab>('market-pulse');

  return (
    <Paper variant="outlined">
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v as DrilldownTab)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab
          value="market-pulse"
          label="Market Pulse"
          icon={<TrendingUpOutlined fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          value="breadth"
          label="Breadth / Participation"
          icon={<GppGoodOutlined fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          value="sector-map"
          label="Sector Map"
          icon={<TimelineOutlined fontSize="small" />}
          iconPosition="start"
        />
        <Tab
          value="flow"
          label="Flow / Institutional"
          icon={<FlashOnOutlined fontSize="small" />}
          iconPosition="start"
        />
      </Tabs>
      <Box sx={{ p: 2 }}>
        {activeTab === 'market-pulse' && <MarketPulseTabPanel scope={scope} />}
        {activeTab === 'breadth' && <BreadthTabPanel scope={scope} />}
        {activeTab === 'sector-map' && <SectorMapTabPanel scope={scope} />}
        {activeTab === 'flow' && <FlowTabPanel scope={scope} />}
      </Box>
    </Paper>
  );
};

// ─── Market Pulse panel ───────────────────────────────────────────────────────

const MarketPulseTabPanel: React.FC<{ scope: MarketScope }> = ({ scope }) => {
  const [snapshot, setSnapshot] = useState<MarketPulseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const env = await fetchMarketPulseSnapshot(scope);
      setSnapshot(env.snapshot);
      if (!env.snapshot) setError(env.message || 'Market Pulse snapshot not available.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load Market Pulse snapshot.');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <LinearProgress />;

  if (error || !snapshot) {
    return (
      <Alert severity="info">
        <Typography fontWeight={700}>Market Pulse — Daily Context</Typography>
        <Typography variant="body2">{error ?? 'Snapshot not available for this scope.'}</Typography>
        <Button
          size="small"
          component={Link}
          to="/market-pulse"
          sx={{ mt: 1 }}
          endIcon={<ArrowForwardOutlined />}
        >
          Open Market Pulse page
        </Button>
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Status row */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <Chip label={snapshot.marketHealthLabel} color="primary" />
        <Chip
          label={`Health score: ${snapshot.marketHealthScore !== null && snapshot.marketHealthScore !== undefined ? snapshot.marketHealthScore : 'N/A'}`}
          variant="outlined"
        />
        {snapshot.vixSummary && snapshot.vixSummary.latest !== null && (
          <Chip
            label={`India VIX: ${snapshot.vixSummary.latest.toFixed(1)} (${snapshot.vixSummary.posture})`}
            color={
              snapshot.vixSummary.posture === 'HIGH'
                ? 'error'
                : snapshot.vixSummary.posture === 'ELEVATED'
                  ? 'warning'
                  : 'success'
            }
            variant="outlined"
          />
        )}
        {snapshot.advanceDecline?.ratio !== null &&
          snapshot.advanceDecline?.ratio !== undefined && (
            <Chip
              label={`A/D: ${snapshot.advanceDecline.advances}↑ / ${snapshot.advanceDecline.declines}↓ (ratio ${snapshot.advanceDecline.ratio.toFixed(2)})`}
              color={snapshot.advanceDecline.ratio >= 1 ? 'success' : 'warning'}
              variant="outlined"
            />
          )}
        <Typography variant="caption" color="text.secondary">
          Data through:{' '}
          {snapshot.dataThroughDate
            ? new Date(snapshot.dataThroughDate).toLocaleDateString()
            : 'Unavailable'}
        </Typography>
      </Stack>

      {/* Breadth + Delivery summaries */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Breadth Summary
          </Typography>
          <Typography variant="body2">{snapshot.breadthSummary || 'Unavailable'}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Delivery Participation
          </Typography>
          <Typography variant="body2">{snapshot.deliverySummary || 'Unavailable'}</Typography>
        </Paper>
      </Box>

      {/* Key indices */}
      {snapshot.topIndices.length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Key Indices
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {snapshot.topIndices.slice(0, 6).map((idx) => (
              <Chip
                key={idx.symbol}
                label={`${indexLabel(idx.symbol)}: ${idx.value !== null ? idx.value.toLocaleString() : 'N/A'}${idx.changePercent !== null && idx.changePercent !== undefined ? ` (${idx.changePercent >= 0 ? '+' : ''}${(idx.changePercent * 100).toFixed(1)}%)` : ''}`}
                size="small"
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Sector heatmap */}
      {(snapshot.strongSectors.length > 0 || snapshot.weakSectors.length > 0) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          {snapshot.strongSectors.length > 0 && (
            <Box>
              <Typography variant="caption" fontWeight={700} color="success.main">
                Strong sectors
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {snapshot.strongSectors.map((s) => (
                  <Chip key={s} label={indexLabel(s)} size="small" color="success" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
          {snapshot.weakSectors.length > 0 && (
            <Box>
              <Typography variant="caption" fontWeight={700} color="warning.main">
                Weak sectors
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {snapshot.weakSectors.map((s) => (
                  <Chip key={s} label={indexLabel(s)} size="small" color="warning" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      )}

      <Button
        size="small"
        component={Link}
        to="/market-pulse"
        endIcon={<ArrowForwardOutlined />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Full Market Pulse page
      </Button>
    </Stack>
  );
};

// ─── Breadth panel ────────────────────────────────────────────────────────────

const BreadthTabPanel: React.FC<{ scope: MarketScope }> = ({ scope }) => {
  const [data, setData] = useState<PersistedMarketBreadthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPersistedMarketBreadth({ region: scope.region }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load breadth data.');
    } finally {
      setLoading(false);
    }
  }, [scope.region]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <LinearProgress />;

  const breadth = data?.breadth;

  if (error || !breadth || data?.status === 'missing') {
    return (
      <Alert severity="info">
        <Typography fontWeight={700}>Breadth / Participation</Typography>
        <Typography variant="body2">
          {error ??
            'Persisted breadth snapshot not available for this scope. Run the market-context pipeline to generate one.'}
        </Typography>
        {data?.gaps && data.gaps.length > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mt: 0.5 }}
          >
            Gaps: {data.gaps.join(', ')}
          </Typography>
        )}
      </Alert>
    );
  }

  const pct = (v: number | null) =>
    v === null ? 'N/A' : `${(v * 100).toFixed(1)}%`;
  const num = (v: number | null | undefined) =>
    v === null || v === undefined ? 'N/A' : v.toLocaleString();

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <Typography variant="subtitle2" fontWeight={700}>
          As of{' '}
          {data?.asOf ? new Date(data.asOf).toLocaleDateString() : 'Unavailable'}
        </Typography>
        <Chip label={`Status: ${data?.status ?? 'unknown'}`} size="small" variant="outlined" />
        {data?.sourceLabels?.savedBreadth && (
          <Typography variant="caption" color="text.secondary">
            {data.sourceLabels.savedBreadth}
          </Typography>
        )}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          gap: 1.5,
        }}
      >
        <DrillMetric label="Above SMA 50" value={pct(breadth.percentAboveSma50)} />
        <DrillMetric label="Above SMA 200" value={pct(breadth.percentAboveSma200)} />
        <DrillMetric
          label="Advance / Decline Ratio"
          value={
            breadth.advanceDeclineRatio !== null
              ? breadth.advanceDeclineRatio.toFixed(2)
              : 'N/A'
          }
        />
        <DrillMetric
          label="52W Highs / Lows"
          value={`${num(breadth.newHigh52WeekCount)} / ${num(breadth.newLow52WeekCount)}`}
        />
        <DrillMetric label="Bullish Signals" value={num(breadth.bullishSignalCount)} />
        <DrillMetric label="Bearish Signals" value={num(breadth.bearishSignalCount)} />
        <DrillMetric label="Price Universe" value={num(breadth.instrumentCount)} />
        {breadth.sma50SampleCount !== undefined && (
          <DrillMetric label="SMA 50 Sample" value={num(breadth.sma50SampleCount)} />
        )}
      </Box>

      {(breadth.officialAdvanceCount !== null ||
        breadth.officialDeclineCount !== null) && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Official NSE Advances / Declines
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              sx={{ ml: 1 }}
            >
              ({data?.sourceLabels?.officialAdvancesDeclines ?? 'NSE official'})
            </Typography>
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Advances: ${num(breadth.officialAdvanceCount)}`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              label={`Declines: ${num(breadth.officialDeclineCount)}`}
              size="small"
              color="warning"
              variant="outlined"
            />
            {breadth.officialUnchangedCount !== null && (
              <Chip
                label={`Unchanged: ${num(breadth.officialUnchangedCount)}`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>
      )}

      {data?.gaps && data.gaps.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          <Typography variant="caption">{data.gaps.join(', ')}</Typography>
        </Alert>
      )}
    </Stack>
  );
};

// ─── Sector Map panel ─────────────────────────────────────────────────────────

const SectorMapTabPanel: React.FC<{ scope: MarketScope }> = ({ scope }) => {
  const [rows, setRows] = useState<SectorIntelligenceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const env = await fetchSectorIntelligenceSnapshot(scope);
      const sectorRows = (env.snapshot as SectorIntelligenceSnapshot[] | null) ?? [];
      setRows(sectorRows);
      setAvailability(env.availability);
      if (sectorRows.length === 0) {
        setError(env.message || 'Sector snapshot not available.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load sector map.');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <LinearProgress />;

  if (error || rows.length === 0) {
    return (
      <Alert severity="info">
        <Typography fontWeight={700}>Sector Map</Typography>
        <Typography variant="body2">
          {error ?? 'No sector snapshot rows available for this scope.'}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 0.5 }}
        >
          Individual stock map data is not available — sector-level rotation data is
          shown when the sector-intelligence pipeline has run.
        </Typography>
      </Alert>
    );
  }

  const classColor = (c: string): 'success' | 'info' | 'default' | 'warning' => {
    if (c === 'STRONG') return 'success';
    if (c === 'IMPROVING') return 'info';
    if (c === 'NEUTRAL') return 'default';
    return 'warning';
  };

  const fmtPpt = (v: number | null) =>
    v === null || v === undefined ? 'N/A' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <Typography variant="subtitle2" fontWeight={700}>
          {rows.length} sectors
        </Typography>
        <Chip label={availability} size="small" variant="outlined" />
        {rows[0]?.dataThroughDate && (
          <Typography variant="caption" color="text.secondary">
            Data through: {new Date(rows[0].dataThroughDate).toLocaleDateString()}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          (Stock-level map not available — sector rotation only)
        </Typography>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sector</TableCell>
              <TableCell>Classification</TableCell>
              <TableCell align="right">Score</TableCell>
              <TableCell align="right">1W</TableCell>
              <TableCell align="right">1M</TableCell>
              <TableCell align="right">3M</TableCell>
              <TableCell>Tags</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.sector} hover>
                <TableCell>
                  <Button
                    size="small"
                    component={Link}
                    to={`/signals?sector=${encodeURIComponent(row.sector)}`}
                    sx={{ p: 0, minWidth: 0, fontWeight: 700, textTransform: 'none' }}
                  >
                    {indexLabel(row.sector)}
                  </Button>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={humanizeCode(row.classification)}
                    color={classColor(row.classification)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  {row.sectorScore !== null ? row.sectorScore.toFixed(0) : 'N/A'}
                </TableCell>
                <TableCell align="right">{fmtPpt(row.return1W)}</TableCell>
                <TableCell align="right">{fmtPpt(row.return1M)}</TableCell>
                <TableCell align="right">{fmtPpt(row.return3M)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {row.reasonTags.slice(0, 2).map((t) => (
                      <Chip key={t} label={humanizeCode(t)} size="small" />
                    ))}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};

// ─── Flow / Institutional panel ───────────────────────────────────────────────

const FlowTabPanel: React.FC<{ scope: MarketScope }> = ({ scope }) => {
  const [sectors, setSectors] = useState<SectorSmartMoneySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSectors(
        await fetchSmartMoneySectors('3M', scope.region, scope.assetType),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load smart money sector data.');
    } finally {
      setLoading(false);
    }
  }, [scope.region, scope.assetType]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <LinearProgress />;

  if (error || sectors.length === 0) {
    return (
      <Alert severity="info">
        <Typography fontWeight={700}>Flow / Institutional Context</Typography>
        <Typography variant="body2">
          {error ?? 'Smart money sector data not available for this scope.'}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 0.5 }}
        >
          Ownership data (institutional filings) is unavailable. Flow
          classification is derived from price-volume patterns only.
        </Typography>
      </Alert>
    );
  }

  const statusColor = (
    s: string,
  ): 'success' | 'error' | 'default' => {
    if (s === 'STRONG_ACCUMULATION' || s === 'ACCUMULATING') return 'success';
    if (s === 'STRONG_DISTRIBUTION' || s === 'DISTRIBUTING') return 'error';
    return 'default';
  };

  return (
    <Stack spacing={2}>
      <Alert severity="info" sx={{ py: 0.5 }}>
        <Typography variant="caption">
          Ownership data (institutional filings) is unavailable for NSE/BSE.
          Classification is derived from price-volume patterns (3M window) — use
          as a directional proxy only.
        </Typography>
      </Alert>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sector</TableCell>
              <TableCell>Status (price-volume proxy)</TableCell>
              <TableCell align="right">Avg Score</TableCell>
              <TableCell align="right">Accumulating</TableCell>
              <TableCell align="right">Distributing</TableCell>
              <TableCell align="right">Unusual Vol</TableCell>
              <TableCell align="right">Universe</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sectors.map((row) => (
              <TableRow key={row.sector} hover>
                <TableCell>
                  <Button
                    size="small"
                    component={Link}
                    to={`/admin/smart-money?sector=${encodeURIComponent(row.sector)}`}
                    sx={{ p: 0, minWidth: 0, fontWeight: 700, textTransform: 'none' }}
                  >
                    {indexLabel(row.sector)}
                  </Button>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={humanizeCode(row.sectorStatus)}
                    color={statusColor(row.sectorStatus)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  {row.averageSmartMoneyScore.toFixed(1)}
                </TableCell>
                <TableCell align="right">{row.accumulationCount}</TableCell>
                <TableCell align="right">{row.distributionCount}</TableCell>
                <TableCell align="right">{row.unusualVolumeCount}</TableCell>
                <TableCell align="right">{row.instrumentCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        size="small"
        component={Link}
        to="/admin/smart-money"
        endIcon={<ArrowForwardOutlined />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Full Smart Money page
      </Button>
    </Stack>
  );
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

const DrillMetric: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography fontWeight={700}>{value}</Typography>
  </Paper>
);
