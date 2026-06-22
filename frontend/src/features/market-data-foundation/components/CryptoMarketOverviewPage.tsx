import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { MarketRegimeWidget } from '@/features/market-context-intelligence';
import { fetchTopSignals } from '@/features/signal-generation-engine/api/signalGenerationEngineService';
import type { SignalResult } from '@/features/signal-generation-engine/types';
import { fetchDailyOverviewMarketMovers } from '@/features/daily-overview-dashboard/api/dailyOverviewDashboardApi';
import type { MarketMoverRow } from '@/features/daily-overview-dashboard/types';
import { fetchMarketContextSummary } from '@/features/market-context-intelligence';
import type { MarketContextSummary } from '@/features/market-context-intelligence';
import { money } from '@/shared/format/money';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { fetchCryptoBoard, type CryptoBoardRow } from '../api/cryptoBoardApi';

const directionColor = (d: string): 'success' | 'error' | 'warning' =>
  d === 'BULLISH' ? 'success' : d === 'BEARISH' ? 'error' : 'warning';

const pct = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

/**
 * Crypto Market Overview — a crypto-native landing surface (24/7, USD): regime +
 * BTC dominance, top coins by signal (with live price + daily change), and the
 * day's gainers/losers. Reads only crypto-scoped endpoints (the market-scope
 * interceptor injects region=GLOBAL & assetType=CRYPTO).
 */
const CryptoMarketOverviewPage: React.FC = () => {
  const { profile } = useMarketScope();
  // Volume-spike strip is gated on the hasVolumeInterest capability flag.
  const hasVolumeInterest = profile.capabilities.hasVolumeInterest;
  const [signals, setSignals] = useState<SignalResult[]>([]);
  const [gainers, setGainers] = useState<MarketMoverRow[]>([]);
  const [losers, setLosers] = useState<MarketMoverRow[]>([]);
  const [moverWarnings, setMoverWarnings] = useState<string[]>([]);
  const [summary, setSummary] = useState<MarketContextSummary | null>(null);
  const [volumeSpikes, setVolumeSpikes] = useState<CryptoBoardRow[]>([]);
  const [near52wHighRows, setNear52wHighRows] = useState<CryptoBoardRow[]>([]);
  const [near52wLowRows, setNear52wLowRows] = useState<CryptoBoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.isCrypto) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchTopSignals({ limit: 25 }).catch(() => ({ signals: [] as SignalResult[] })),
      fetchDailyOverviewMarketMovers({ region: 'GLOBAL', assetType: 'CRYPTO', range: '1D' }).catch(() => null),
      fetchMarketContextSummary({ region: 'CRYPTO' }).catch(() => null),
      hasVolumeInterest
        ? fetchCryptoBoard({ volumeSpikeOnly: true, sortBy: 'pctChange1d', sortOrder: 'desc', limit: 10 }).catch(() => null)
        : Promise.resolve(null),
      fetchCryptoBoard({ near52wHigh: true, sortBy: 'marketCap', sortOrder: 'desc', limit: 10 }).catch(() => null),
      fetchCryptoBoard({ near52wLow: true, sortBy: 'marketCap', sortOrder: 'desc', limit: 10 }).catch(() => null),
    ])
      .then(([topSignals, movers, contextSummary, spikes, highRows, lowRows]) => {
        if (cancelled) return;
        setSignals((topSignals.signals ?? []) as SignalResult[]);
        const range = movers?.ranges?.[0];
        setGainers(range?.gainers ?? []);
        setLosers(range?.losers ?? []);
        setMoverWarnings(range?.warnings ?? []);
        setSummary(contextSummary ?? null);
        setVolumeSpikes(spikes?.rows ?? []);
        setNear52wHighRows(highRows?.rows ?? []);
        setNear52wLowRows(lowRows?.rows ?? []);
      })
      .catch(() => { if (!cancelled) setError('Failed to load crypto market overview.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile.isCrypto, hasVolumeInterest]);

  const lastUpdated = useMemo(() => {
    const ts = signals.map((s) => s.priceTimestamp).filter(Boolean).sort().pop();
    return ts ? new Date(ts).toLocaleString() : null;
  }, [signals]);

  if (!profile.isCrypto) {
    return (
      <Box sx={{ p: 3 }}>
        <PageHeader title="Crypto Market" subtitle="Switch the market scope to Crypto to view this page." />
        <NotApplicableForAssetClass
          feature="Crypto Market Overview"
          detail="This page is only available under the Crypto asset class. Use the market-scope selector to switch to Crypto."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Crypto Market"
        subtitle="24/7 crypto overview — regime, top coins by signal, and daily movers (USD, Binance/CoinGecko)."
      />
      {lastUpdated && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Prices as of {lastUpdated} (latest available data).
        </Typography>
      )}

      <MarketRegimeWidget />

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Paper>
      ) : (
        <Stack spacing={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
            <BreadthPanel summary={summary} />
            <FearGreedGauge summary={summary} />
          </Box>

          {hasVolumeInterest && <VolumeSpikeStrip rows={volumeSpikes} />}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Near52wStrip title="Near 52-Week Highs" rows={near52wHighRows} color="success" />
            <Near52wStrip title="Near 52-Week Lows" rows={near52wLowRows} color="error" />
          </Box>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Top Coins by Signal</Typography>
            {signals.length === 0 ? (
              <Typography color="text.secondary">No crypto signals available yet. The crypto pipeline populates these on its next run.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Coin</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">24h</TableCell>
                    <TableCell align="center">Signal</TableCell>
                    <TableCell align="right">Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {signals.map((s) => (
                    <TableRow key={s.instrument_id} hover>
                      <TableCell>
                        <Typography
                          component={Link}
                          to={`/stocks/${s.instrument_id}`}
                          variant="body2"
                          color="primary"
                          sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          {s.symbol}
                        </Typography>
                        {s.company_name && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 160 }}>
                            {s.company_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{money(s.currentPrice, 'USD')}</TableCell>
                      <TableCell align="right" sx={{ color: (s.dailyChangePercent ?? 0) >= 0 ? 'success.main' : 'error.main' }}>{pct(s.dailyChangePercent)}</TableCell>
                      <TableCell align="center"><Chip size="small" label={s.direction} color={directionColor(s.direction)} variant="outlined" /></TableCell>
                      <TableCell align="right">{s.score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <MoverCard title="Top Gainers (24h)" rows={gainers} />
            <MoverCard title="Top Losers (24h)" rows={losers} />
          </Box>
          {moverWarnings.length > 0 && (
            <Typography variant="caption" color="text.secondary">{moverWarnings.join(' ')}</Typography>
          )}
        </Stack>
      )}
    </Box>
  );
};

const fmtRatio = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : value.toFixed(2);
const fmtPctOf100 = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : `${value.toFixed(0)}%`;

/**
 * Crypto market breadth — persisted-read of the market-context summary (region=CRYPTO).
 * Renders only stored fields; no computation. BTC dominance lives in the regime
 * explanation (rendered by MarketRegimeWidget above). Fear & Greed (also persisted on the
 * summary) is rendered by FearGreedGauge below.
 */
const BreadthPanel: React.FC<{ summary: MarketContextSummary | null }> = ({ summary }) => {
  const breadth = summary?.breadth;
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Market Breadth</Typography>
      {!breadth || breadth.dataStatus === 'MISSING' ? (
        <Typography color="text.secondary">
          Breadth data is not available yet. The crypto market-context pipeline populates this on its next run.
        </Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
          <Stat label="% Above SMA50" value={fmtPctOf100(breadth.percentAboveSma50)} />
          <Stat label="% Above SMA200" value={fmtPctOf100(breadth.percentAboveSma200)} />
          <Stat label="Advance/Decline" value={fmtRatio(breadth.advanceDeclineRatio)} />
          <Stat label="Bullish vs Bearish" value={`${breadth.bullishSignalCount} / ${breadth.bearishSignalCount}`} />
        </Box>
      )}
    </Paper>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="h6">{value}</Typography>
  </Box>
);

// Sentiment-zone color for the 0–100 Fear & Greed index (fear=red → greed=green).
const fearGreedColor = (value: number): string =>
  value < 25 ? '#d32f2f' : value < 45 ? '#f57c00' : value < 55 ? '#fbc02d' : value < 75 ? '#7cb342' : '#388e3c';

/**
 * Fear & Greed sentiment gauge — persisted-read of the crypto market-context summary
 * (alternative.me daily index, free source; surfaced via fearGreedIndex/fearGreedLabel).
 * Contrarian sentiment context only — not advice. Renders the stored 0–100 index + label,
 * or an empty state when the pipeline hasn't populated it yet. No computation on render.
 */
const FearGreedGauge: React.FC<{ summary: MarketContextSummary | null }> = ({ summary }) => {
  const index = summary?.fearGreedIndex;
  const label = summary?.fearGreedLabel;
  if (index === null || index === undefined) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Fear &amp; Greed</Typography>
        <Typography color="text.secondary">
          Sentiment index is not available yet. The crypto market-context pipeline populates this on its next run.
        </Typography>
      </Paper>
    );
  }
  const value = Math.max(0, Math.min(100, index));
  const color = fearGreedColor(value);
  const theta = (180 - (value / 100) * 180) * (Math.PI / 180);
  const needleX = 100 + 70 * Math.cos(theta);
  const needleY = 100 - 70 * Math.sin(theta);
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Fear &amp; Greed</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg viewBox="0 0 200 116" width="100%" style={{ maxWidth: 220 }} role="img" aria-label={`Fear and Greed index ${value}${label ? ` (${label})` : ''}`}>
          <defs>
            <linearGradient id="fgGaugeArc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d32f2f" />
              <stop offset="30%" stopColor="#f57c00" />
              <stop offset="50%" stopColor="#fbc02d" />
              <stop offset="70%" stopColor="#7cb342" />
              <stop offset="100%" stopColor="#388e3c" />
            </linearGradient>
          </defs>
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#fgGaugeArc)" strokeWidth={14} strokeLinecap="round" />
          <line x1="100" y1="100" x2={needleX} y2={needleY} stroke={color} strokeWidth={3} strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill={color} />
        </svg>
        <Typography variant="h4" sx={{ color, lineHeight: 1 }}>{Math.round(value)}</Typography>
        {label && <Typography variant="body2" color="text.secondary">{label}</Typography>}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, textAlign: 'center' }}>
          Contrarian sentiment gauge · daily reading from a free source (alternative.me)
        </Typography>
      </Box>
    </Paper>
  );
};

/**
 * Volume-spike strip — persisted board rows where volume_spike=true. Pure read of
 * GET /crypto/board?volumeSpikeOnly=true. Gated by the hasVolumeInterest capability.
 */
const VolumeSpikeStrip: React.FC<{ rows: CryptoBoardRow[] }> = ({ rows }) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ mb: 1 }}>Volume Spikes</Typography>
    {rows.length === 0 ? (
      <Typography color="text.secondary">No volume spikes flagged in the latest snapshot.</Typography>
    ) : (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {rows.map((row) => (
          <Chip
            key={row.instrument_id}
            component={Link}
            to={`/stocks/${row.instrument_id}`}
            clickable
            color="warning"
            variant="outlined"
            label={`${row.symbol} ${pct(row.pct_change_1d)}`}
          />
        ))}
      </Box>
    )}
  </Paper>
);

const Near52wStrip: React.FC<{ title: string; rows: CryptoBoardRow[]; color: 'success' | 'error' }> = ({ title, rows, color }) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
    {rows.length === 0 ? (
      <Typography color="text.secondary">None flagged in the latest snapshot.</Typography>
    ) : (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {rows.map((row) => (
          <Chip
            key={row.instrument_id}
            component={Link}
            to={`/stocks/${row.instrument_id}`}
            clickable
            color={color}
            variant="outlined"
            label={`${row.symbol} ${pct(row.pct_change_1d)}`}
          />
        ))}
      </Box>
    )}
  </Paper>
);

const MoverCard: React.FC<{ title: string; rows: MarketMoverRow[] }> = ({ title, rows }) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
    {rows.length === 0 ? (
      <Typography color="text.secondary">No data yet.</Typography>
    ) : (
      <Table size="small">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.symbol} hover>
              <TableCell>{row.symbol}</TableCell>
              <TableCell align="right">{money(row.latestClose, 'USD')}</TableCell>
              <TableCell align="right" sx={{ color: row.returnPercent >= 0 ? 'success.main' : 'error.main' }}>
                {row.returnPercent >= 0 ? '+' : ''}{row.returnPercent.toFixed(2)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </Paper>
);

export default CryptoMarketOverviewPage;
