import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { compact, money } from '@/shared/format/money';
import { fetchCryptoAssetDetail, signalEvidenceLabel, type CryptoAssetDetail } from '../api/cryptoBoardApi';

/**
 * Crypto instrument detail — persisted-read layout for the Signals & History tab when
 * the active scope is crypto. Reads ONLY GET /crypto/assets/:id/detail and renders the
 * stored signal evidence, indicators, momentum, catalog, DeFi fundamentals, and futures.
 * No FE computation/derivation — every value is computed by the crypto pipeline.
 */

const directionColor = (d: string | null | undefined): 'success' | 'error' | 'default' =>
  d === 'BULLISH' ? 'success' : d === 'BEARISH' ? 'error' : 'default';

const pct = (value: number | null | undefined): string =>
  value == null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const num = (value: number | null | undefined, digits = 1): string =>
  value == null ? '—' : value.toFixed(digits);

const usd = (value: number | null | undefined): string =>
  value == null ? '—' : money(value, 'USD');

const usdCompact = (value: number | null | undefined): string =>
  value == null ? '—' : compact(value, 'USD');

const date = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleDateString() : '—';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1" fontWeight={600} sx={color ? { color } : undefined}>{value}</Typography>
    </Box>
  );
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
      {children}
    </Box>
  );
}

export default function CryptoInstrumentDetail({ instrumentId }: { instrumentId?: string }) {
  const [detail, setDetail] = useState<CryptoAssetDetail | null>(null);
  const [loading, setLoading] = useState(!!instrumentId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instrumentId) { setLoading(false); return; }
    let canceled = false;
    setLoading(true);
    setError(null);
    fetchCryptoAssetDetail(instrumentId)
      .then((res) => { if (!canceled) { setDetail(res); setLoading(false); } })
      .catch((err) => {
        if (canceled) return;
        setError(err?.response?.status === 404 ? 'No crypto data found for this asset.' : (err?.message || 'Failed to load crypto detail'));
        setLoading(false);
      });
    return () => { canceled = true; };
  }, [instrumentId]);

  if (!instrumentId) return <Alert severity="info">No instrument selected.</Alert>;
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 3 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Loading crypto detail…</Typography>
      </Box>
    );
  }
  if (error) return <Alert severity="warning">{error}</Alert>;
  if (!detail) return <Alert severity="info">No crypto data available for this asset.</Alert>;

  const { catalog, metrics, fundamental, futures, signal } = detail;

  return (
    <Stack spacing={2}>
      {/* Header / catalog identity */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
          {catalog.logo_url && <Avatar src={catalog.logo_url} alt={catalog.symbol} sx={{ width: 40, height: 40 }} />}
          <Box>
            <Typography variant="h6">{catalog.name || catalog.symbol}</Typography>
            <Typography variant="caption" color="text.secondary">
              {catalog.display_symbol || catalog.symbol}
              {catalog.rank != null ? ` · Rank #${catalog.rank}` : ''}
            </Typography>
          </Box>
        </Stack>
        {catalog.category_tags && catalog.category_tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {catalog.category_tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
            ))}
          </Box>
        )}
        {catalog.website_url && (
          <MuiLink href={catalog.website_url} target="_blank" rel="noopener noreferrer" variant="caption">
            {catalog.website_url}
          </MuiLink>
        )}
      </Paper>

      {/* Persisted signal */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">Latest Signal</Typography>
        {signal ? (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
              <Chip label={signal.direction ?? '—'} color={directionColor(signal.direction)} size="small" />
              <Chip label={`Score ${signal.score != null ? Math.round(signal.score) : '—'}`} size="small" variant="outlined" />
              <Chip label={signal.confidence ?? '—'} size="small" variant="outlined" />
              <Typography variant="caption" color="text.secondary">Generated {date(signal.generated_at)}</Typography>
            </Stack>
            {signal.explanation && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{signal.explanation}</Typography>
            )}
            {signal.triggered_signals && signal.triggered_signals.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Bullish evidence</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {signal.triggered_signals.map((s, i) => {
                    const label = signalEvidenceLabel(s);
                    return <Chip key={`${label}-${i}`} label={label} size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem' }} />;
                  })}
                </Box>
              </Box>
            )}
            {signal.negative_signals && signal.negative_signals.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Bearish evidence</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {signal.negative_signals.map((s, i) => {
                    const label = signalEvidenceLabel(s);
                    return <Chip key={`${label}-${i}`} label={label} size="small" color="error" variant="outlined" sx={{ fontSize: '0.65rem' }} />;
                  })}
                </Box>
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>No signal available for this asset yet.</Typography>
        )}
      </Paper>

      {/* Momentum */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Momentum</Typography>
        <StatGrid>
          <Stat label="Price" value={usd(metrics?.price)} />
          <Stat label="24h" value={pct(metrics?.pct_change_1d)} color={(metrics?.pct_change_1d ?? 0) >= 0 ? 'success.main' : 'error.main'} />
          <Stat label="7d" value={pct(metrics?.pct_change_7d)} color={(metrics?.pct_change_7d ?? 0) >= 0 ? 'success.main' : 'error.main'} />
          <Stat label="30d" value={pct(metrics?.pct_change_30d)} color={(metrics?.pct_change_30d ?? 0) >= 0 ? 'success.main' : 'error.main'} />
          <Stat label="From ATH" value={pct(metrics?.distance_from_ath_pct)} />
          <Stat label="RS vs BTC" value={pct(metrics?.rs_vs_btc_pct)} />
          <Stat label="Market Cap" value={usdCompact(metrics?.market_cap)} />
          <Stat label="Volume Spike" value={metrics?.volume_spike ? 'Yes' : 'No'} />
        </StatGrid>
      </Paper>

      {/* Indicators */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Technical Indicators</Typography>
        <StatGrid>
          <Stat label="RSI14" value={num(metrics?.rsi14)} />
          <Stat label="MACD" value={num(metrics?.macd, 4)} />
          <Stat label="BB %B" value={num(metrics?.bb_percent_b, 2)} />
          <Stat label="Cross State" value={metrics?.cross_state ?? '—'} />
          <Stat label="SMA50" value={usd(metrics?.sma50)} />
          <Stat label="SMA200" value={usd(metrics?.sma200)} />
        </StatGrid>
      </Paper>

      {/* Catalog / supply */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Catalog</Typography>
        <StatGrid>
          <Stat label="Circulating Supply" value={catalog.circulating_supply != null ? compact(catalog.circulating_supply, '') : '—'} />
          <Stat label="Max Supply" value={catalog.max_supply != null ? compact(catalog.max_supply, '') : '—'} />
          <Stat label="Fully Diluted Val" value={usdCompact(catalog.fully_diluted_valuation)} />
          <Stat label="Market Cap" value={usdCompact(catalog.market_cap)} />
          <Stat label="ATH" value={usd(catalog.ath_price)} />
          <Stat label="ATH Date" value={date(catalog.ath_date)} />
          <Stat label="ATL" value={usd(catalog.atl_price)} />
          <Stat label="ATL Date" value={date(catalog.atl_date)} />
        </StatGrid>
      </Paper>

      {/* DeFi fundamentals + Futures */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Fundamentals (DeFi)</Typography>
          {fundamental ? (
            <Stack spacing={1}>
              <Stat label="TVL" value={usdCompact(fundamental.tvl_usd)} />
              <Stat label="TVL Change 7d" value={pct(fundamental.tvl_change_7d_pct)} />
              <Stat label="Fees 24h" value={usdCompact(fundamental.fees_24h_usd)} />
              <Stat label="Category" value={fundamental.category ?? '—'} />
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">No DeFi fundamentals tracked for this asset.</Typography>
          )}
        </Paper>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Futures</Typography>
          {futures ? (
            <Stack spacing={1}>
              <Stat label="Funding Rate" value={num(futures.funding_rate_pct, 4)} />
              <Stat label="Open Interest" value={usdCompact(futures.open_interest_usd)} />
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">No futures data tracked for this asset.</Typography>
          )}
        </Paper>
      </Box>

      <Divider />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 0.5 }}>
        For research support only, not financial advice. All values are persisted from the daily crypto pipeline.
      </Typography>
    </Stack>
  );
}
