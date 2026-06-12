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
import { money } from '@/shared/format/money';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';

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
  const [signals, setSignals] = useState<SignalResult[]>([]);
  const [gainers, setGainers] = useState<MarketMoverRow[]>([]);
  const [losers, setLosers] = useState<MarketMoverRow[]>([]);
  const [moverWarnings, setMoverWarnings] = useState<string[]>([]);
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
    ])
      .then(([topSignals, movers]) => {
        if (cancelled) return;
        setSignals((topSignals.signals ?? []) as SignalResult[]);
        const range = movers?.ranges?.[0];
        setGainers(range?.gainers ?? []);
        setLosers(range?.losers ?? []);
        setMoverWarnings(range?.warnings ?? []);
      })
      .catch(() => { if (!cancelled) setError('Failed to load crypto market overview.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile.isCrypto]);

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
                        <Link to={`/stocks/${s.instrument_id}`} style={{ textDecoration: 'none' }}>
                          {s.symbol}{s.company_name ? ` · ${s.company_name}` : ''}
                        </Link>
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
