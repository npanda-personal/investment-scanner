/**
 * Futures OI Buildup Widget — Derivatives Intelligence
 *
 * Displays the per-underlying open-interest buildup classification derived from
 * the NSE F&O bhavcopy (futures). Pure persisted-read — never triggers ingest.
 *
 * Buildup classification (research-support, descriptive — NOT trade advice):
 *   LONG_BUILDUP    price ↑ + OI ↑   fresh longs being added
 *   SHORT_BUILDUP   price ↓ + OI ↑   fresh shorts being added
 *   SHORT_COVERING  price ↑ + OI ↓   shorts being closed
 *   LONG_UNWINDING  price ↓ + OI ↓   longs being closed
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  FormControlLabel,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { StalenessBadge } from '@/shared/components/StalenessBadge';
import {
  fetchOiBuildup,
  type OiBuildupRow,
  type OiBuildupLabel,
} from '../api/derivativesIntelligenceService';

// ---------------------------------------------------------------------------
// Label presentation
// ---------------------------------------------------------------------------

const LABEL_META: Record<OiBuildupLabel, { text: string; color: 'success' | 'error' | 'warning' | 'info' | 'default'; help: string }> = {
  LONG_BUILDUP: { text: 'Long Buildup', color: 'success', help: 'Rising price with rising open interest — fresh longs being added.' },
  SHORT_BUILDUP: { text: 'Short Buildup', color: 'error', help: 'Falling price with rising open interest — fresh shorts being added.' },
  SHORT_COVERING: { text: 'Short Covering', color: 'info', help: 'Rising price with falling open interest — shorts being closed.' },
  LONG_UNWINDING: { text: 'Long Unwinding', color: 'warning', help: 'Falling price with falling open interest — longs being closed.' },
  NEUTRAL: { text: 'Neutral', color: 'default', help: 'No decisive price/OI direction.' },
};

const FILTERS: Array<{ key: OiBuildupLabel | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'LONG_BUILDUP', label: 'Long Buildup' },
  { key: 'SHORT_BUILDUP', label: 'Short Buildup' },
  { key: 'SHORT_COVERING', label: 'Short Covering' },
  { key: 'LONG_UNWINDING', label: 'Long Unwinding' },
];

function fmtPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = value < 0 ? '−' : '+';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function fmtOi(value: number): string {
  // OI is in contracts (lots). Compact display.
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)} K`;
  return String(value);
}

function changeColor(value: number | null): string | undefined {
  if (value === null || value === 0) return undefined;
  return value > 0 ? 'success.main' : 'error.main';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const OiBuildupWidget: React.FC = () => {
  const [rows, setRows] = useState<OiBuildupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [eligibleOnly, setEligibleOnly] = useState(true);
  const [filter, setFilter] = useState<OiBuildupLabel | 'ALL'>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const resp = await fetchOiBuildup({ eligibleOnly, limit: 200 });
      if (resp.status === 'missing' || resp.rows.length === 0) {
        setUnavailable(true);
        setRows([]);
        return;
      }
      if (resp.status === 'error') {
        setError(resp.message ?? 'Failed to load OI buildup data');
        setRows([]);
        return;
      }
      setAsOf(resp.tradingDate);
      setRows(resp.rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [eligibleOnly]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.buildupLabel] = (c[r.buildupLabel] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (filter === 'ALL' ? rows : rows.filter((r) => r.buildupLabel === filter)),
    [rows, filter],
  );

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h6">Futures OI Buildup</Typography>
          <Typography variant="caption" color="text.secondary">
            Open-interest positioning by underlying · OI in contracts · Source: NSE F&O bhavcopy
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {asOf && <StalenessBadge asOf={asOf} label="F&O OI" />}
          <FormControlLabel
            control={<Switch size="small" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} />}
            label={<Typography variant="caption">F&O-eligible only</Typography>}
            sx={{ mr: 0 }}
          />
        </Stack>
      </Stack>

      {!loading && !error && !unavailable && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filter}
            onChange={(_e, v) => { if (v) setFilter(v); }}
          >
            {FILTERS.map((f) => (
              <ToggleButton key={f.key} value={f.key} sx={{ textTransform: 'none', py: 0.25 }}>
                {f.label}
                {f.key !== 'ALL' && counts[f.key] ? ` (${counts[f.key]})` : ''}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      )}

      {loading && (
        <Stack spacing={1}>
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rectangular" height={28} />)}
        </Stack>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>{error}</Alert>
      )}

      {!loading && !error && unavailable && (
        <Alert severity="info" sx={{ fontSize: 13 }}>
          F&O OI buildup not yet ingested. Use POST /api/v1/derivatives/fo-bhavcopy/ingest to fetch from NSE.
        </Alert>
      )}

      {!loading && !error && !unavailable && (
        <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="caption" fontWeight={700}>Underlying</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700}>Buildup</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>Price Δ</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>OI Δ</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>Total OI</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((r) => {
                const meta = LABEL_META[r.buildupLabel];
                return (
                  <TableRow key={`${r.underlying}-${r.instrumentType}`} hover>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography variant="body2" fontWeight={600}>{r.underlying}</Typography>
                        {r.instrumentType === 'FUTIDX' && (
                          <Chip size="small" label="Index" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={meta.help} arrow>
                        <Chip size="small" label={meta.text} color={meta.color} variant="outlined" sx={{ cursor: 'default' }} />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: changeColor(r.priceChangePct) }}>{fmtPct(r.priceChangePct)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: changeColor(r.oiChange) }}>{fmtPct(r.oiChangePct)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">{fmtOi(r.totalOi)}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                      No underlyings in this category for the latest session.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Descriptive open-interest analysis for research only — not buy/sell advice. OI aggregated across active expiries; price change uses underlying spot.
      </Typography>
    </Paper>
  );
};

export default OiBuildupWidget;
