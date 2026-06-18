/**
 * MarketContextRail — the right-hand context rail on the Stock Workspace (non-chart tabs).
 *
 * Extracted verbatim from UnifiedStockPage.tsx (over the source-file line cap) so the
 * market-context presentation lives in one cohesive place. Assembles regime, sector
 * strength, relative strength, institutional flow, F&O eligibility/ban (NSE-only), and
 * the latest signal from a single persisted context snapshot — no live fetch beyond that
 * saved read; missing data is shown explicitly. Research-support language only.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { fetchInstrumentContextSnapshot } from '@/features/market-intelligence/api/marketIntelligenceService';
import { exchangeLabel } from '@/shared/format/exchangeLabels';
import UsSmartMoneyPanel from './UsSmartMoneyPanel';

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}%`;
}

function regimeColor(regime: string | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (!regime) return 'default';
  if (regime === 'RISK_ON') return 'success';
  if (regime === 'RISK_OFF') return 'error';
  if (regime === 'NEUTRAL') return 'warning';
  return 'default';
}

function signalColor(direction: string | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (!direction) return 'default';
  if (direction === 'BULLISH') return 'success';
  if (direction === 'BEARISH') return 'error';
  return 'warning';
}

function sectorClassColor(cls: string | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (!cls) return 'default';
  if (cls === 'STRONG') return 'success';
  if (cls === 'IMPROVING') return 'warning';
  if (cls === 'WEAK') return 'error';
  return 'default';
}

function ContextRow({ label, value, color, sub, tooltip }: {
  label: string;
  value: string;
  color?: 'success' | 'warning' | 'error' | 'default';
  sub?: string;
  tooltip?: string;
}) {
  const labelEl = (
    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120, pt: 0.4, cursor: tooltip ? 'help' : undefined }}>
      {label}
    </Typography>
  );
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
      {tooltip ? (
        <Tooltip title={tooltip} placement="left">
          {labelEl}
        </Tooltip>
      ) : labelEl}
      <Stack alignItems="flex-end" spacing={0}>
        <Chip
          label={value}
          size="small"
          color={color ?? 'default'}
          variant={color && color !== 'default' ? 'filled' : 'outlined'}
          sx={{ fontSize: '0.7rem', height: 22 }}
        />
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {sub}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export function MarketContextRail({
  instrumentId,
  symbol,
  derivativesEligible,
}: {
  instrumentId?: string;
  symbol?: string | null;
  derivativesEligible?: boolean | null;
}) {
  const { scope, profile } = useMarketScope();

  const [snapshot, setSnapshot] = useState<import('@/features/market-intelligence/types').InstrumentContextSnapshot | null>(null);
  const [loading, setLoading] = useState(!!instrumentId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instrumentId) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    let canceled = false;
    setLoading(true);
    setError(null);
    fetchInstrumentContextSnapshot(scope, instrumentId)
      .then((result) => {
        if (!canceled) {
          setSnapshot(result.snapshot);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!canceled) {
          setError(err instanceof Error ? err.message : 'Failed to load context');
          setLoading(false);
        }
      });
    return () => { canceled = true; };
  }, [instrumentId, scope]);

  const ctx = snapshot;

  const regimeValue = ctx?.marketRegime.absent
    ? '—'
    : `${ctx?.marketRegime.value?.regime ?? '—'} (${ctx?.marketRegime.value?.score ?? '—'})`;

  const sectorValue = ctx?.sectorStrength.absent
    ? '—'
    : `${ctx?.sectorStrength.value?.sector ?? '—'}: ${ctx?.sectorStrength.value?.classification ?? '—'}`;

  const rsValue = ctx?.relativeStrength.absent
    ? '—'
    : (() => {
        const rs = ctx?.relativeStrength.value;
        if (!rs) return '—';
        if (rs.relativeReturn63d !== null && rs.relativeReturn63d !== undefined) {
          return `vs ${profile.benchmarkLabel} ${formatPercent(rs.relativeReturn63d)}`;
        }
        if (rs.stockReturn63d !== null && rs.stockReturn63d !== undefined) {
          return `63d: ${formatPercent(rs.stockReturn63d)}`;
        }
        return '—';
      })();

  const smValue = ctx?.smartMoney.absent
    ? '—'
    : `${ctx?.smartMoney.value?.status ?? '—'} (${ctx?.smartMoney.value?.score ?? '—'})`;

  const fnoBanValue = ctx?.fnoBan.absent
    ? '—'
    : ctx?.fnoBan.value?.banned
      ? `Banned (${ctx?.fnoBan.value?.banDate ?? ''})`
      : 'Not banned';

  const signalValue = ctx?.latestSignal.absent
    ? '—'
    : `${ctx?.latestSignal.value?.direction ?? '—'} (${ctx?.latestSignal.value?.score !== undefined ? Math.round(ctx?.latestSignal.value?.score ?? 0) : '—'})`;

  const fnoEligibleValue =
    derivativesEligible === true ? 'Yes'
    : derivativesEligible === false ? 'No'
    : '—';

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Market Context</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Assembled from saved data. Missing data shown clearly.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Instrument context
          </Typography>

          {!instrumentId && (
            <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
              No instrument selected.
            </Alert>
          )}

          {instrumentId && loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">Loading context…</Typography>
            </Box>
          )}

          {instrumentId && !loading && error && (
            <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>{error}</Alert>
          )}

          {instrumentId && !loading && !ctx && !error && (
            <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
              Context not available — instrument may not exist in catalog.
            </Alert>
          )}

          {ctx && (
            <>
              <ContextRow
                label="Market regime"
                value={regimeValue}
                color={regimeColor(ctx.marketRegime.value?.regime)}
                sub={ctx.marketRegime.asOf ? `as of ${ctx.marketRegime.asOf}` : undefined}
                tooltip="Broad market posture: RISK_ON = favorable conditions, NEUTRAL = mixed, RISK_OFF = unfavorable."
              />
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Sector strength"
                value={sectorValue}
                color={sectorClassColor(ctx.sectorStrength.value?.classification)}
                sub={ctx.sectorStrength.absent ? ctx.sectorStrength.source : undefined}
                tooltip="How this stock's sector is trending relative to its recent average."
              />
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Relative strength"
                value={rsValue}
                color={
                  ctx.relativeStrength.absent ? 'default'
                    : (ctx.relativeStrength.value?.relativeReturn63d ?? 0) >= 0.05 ? 'success'
                    : (ctx.relativeStrength.value?.relativeReturn63d ?? 0) <= -0.05 ? 'error'
                    : 'warning'
                }
                sub={ctx.relativeStrength.asOf ? `prices as of ${ctx.relativeStrength.asOf}` : undefined}
                tooltip="How this stock's 63-day return compares to the benchmark index."
              />
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Institutional flow"
                value={smValue}
                color={
                  ctx.smartMoney.absent ? 'default'
                    : ctx.smartMoney.value?.status === 'ACCUMULATION' ? 'success'
                    : ctx.smartMoney.value?.status === 'DISTRIBUTION' ? 'error'
                    : 'default'
                }
                sub={ctx.smartMoney.asOf ? `as of ${ctx.smartMoney.asOf}` : undefined}
                tooltip={`Institutional buying (ACCUMULATION) or selling (DISTRIBUTION) pattern from ${exchangeLabel(scope)} delivery data.`}
              />
              {/* F&O eligibility / ban are India NSE-only concepts — gate by capability. */}
              {profile.capabilities.hasDelivery && (
                <>
                  <Divider sx={{ my: 0.5 }} />
                  <ContextRow
                    label="F&O eligible"
                    value={fnoEligibleValue}
                    color={
                      derivativesEligible === true ? 'success'
                        : derivativesEligible === false ? 'default'
                        : 'default'
                    }
                    tooltip="Whether this stock has futures and options contracts listed on NSE."
                  />
                  <Divider sx={{ my: 0.5 }} />
                  <ContextRow
                    label="F&O ban"
                    value={fnoBanValue}
                    color={
                      ctx.fnoBan.absent ? 'default'
                        : ctx.fnoBan.value?.banned ? 'error'
                        : 'success'
                    }
                    sub={ctx.fnoBan.asOf ? `ban list ${ctx.fnoBan.asOf}` : undefined}
                    tooltip="Stocks in the F&O ban period cannot have new derivative positions opened."
                  />
                </>
              )}
              <Divider sx={{ my: 0.5 }} />
              <ContextRow
                label="Latest signal"
                value={signalValue}
                color={signalColor(ctx.latestSignal.value?.direction)}
                sub={ctx.latestSignal.asOf ? `as of ${ctx.latestSignal.asOf}` : undefined}
                tooltip="The most recent signal direction and score for this stock."
              />
            </>
          )}
        </Stack>
      </Paper>

      {/* US-only: SEC Form 4 (insider) + 13F (institutional) "smart money" panel. */}
      {profile.capabilities.hasSecSmartMoney && <UsSmartMoneyPanel symbol={symbol} />}

      <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
        Watchlists, Alerts, and Portfolios are personal tools. Context data updates via the daily pipeline.
      </Alert>
    </Stack>
  );
}
