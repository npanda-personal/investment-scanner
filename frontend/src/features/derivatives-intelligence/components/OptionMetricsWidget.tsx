/**
 * Option Metrics Widget — PCR · Max Pain · Support/Resistance
 *
 * Pure persisted-read of the derived option metrics (NSE F&O bhavcopy options).
 * Shows the market-wide PCR (index options) plus a per-underlying table at the
 * nearest expiry: PCR, OI-based support (max put-OI strike), resistance
 * (max call-OI strike) and max-pain.
 *
 * Research-support only — descriptive option-positioning context, NOT advice.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { StalenessBadge } from '@/shared/components/StalenessBadge';
import {
  fetchOptionMetrics,
  type OptionMetricsRow,
} from '../api/derivativesIntelligenceService';

function fmtStrike(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function fmtPcr(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return v.toFixed(2);
}

function pcrColor(v: number | null): 'success' | 'error' | 'default' {
  if (v === null) return 'default';
  if (v >= 1.2) return 'success';   // put-heavy
  if (v <= 0.7) return 'error';     // call-heavy
  return 'default';
}

function pcrHint(v: number | null): string {
  if (v === null) return 'Put-call ratio unavailable.';
  if (v >= 1.2) return `PCR ${v.toFixed(2)} — put-heavy positioning (more put OI than call OI).`;
  if (v <= 0.7) return `PCR ${v.toFixed(2)} — call-heavy positioning (more call OI than put OI).`;
  return `PCR ${v.toFixed(2)} — balanced put/call open interest.`;
}

function formatExpiry(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

export const OptionMetricsWidget: React.FC = () => {
  const [rows, setRows] = useState<OptionMetricsRow[]>([]);
  const [marketPcr, setMarketPcr] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const resp = await fetchOptionMetrics({ limit: 2000 });
      if (resp.status === 'missing' || resp.rows.length === 0) {
        setUnavailable(true);
        setRows([]);
        return;
      }
      if (resp.status === 'error') {
        setError(resp.message ?? 'Failed to load option metrics');
        setRows([]);
        return;
      }
      setAsOf(resp.tradingDate);
      setMarketPcr(resp.marketPcr);
      setRows(resp.rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Nearest expiry per underlying (rows arrive sorted by underlying, expiry asc).
  const nearest = useMemo(() => {
    const seen = new Set<string>();
    const out: OptionMetricsRow[] = [];
    for (const r of rows) {
      if (seen.has(r.underlying)) continue;
      seen.add(r.underlying);
      out.push(r);
    }
    return out;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toUpperCase();
    const base = q ? nearest.filter((r) => r.underlying.includes(q)) : nearest;
    return [...base].sort((a, b) => a.underlying.localeCompare(b.underlying));
  }, [nearest, query]);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h6">Option Metrics — PCR · Max Pain · S/R</Typography>
          <Typography variant="caption" color="text.secondary">
            Put-call ratio, support/resistance and max-pain at nearest expiry · Source: NSE F&O bhavcopy
          </Typography>
        </Box>
        {asOf && <StalenessBadge asOf={asOf} label="Option metrics" />}
      </Stack>

      {!loading && !error && !unavailable && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Tooltip title={pcrHint(marketPcr)} arrow>
            <Chip
              color={pcrColor(marketPcr)}
              variant="outlined"
              label={`Market PCR (index options): ${fmtPcr(marketPcr)}`}
              sx={{ fontWeight: 700, cursor: 'default' }}
            />
          </Tooltip>
          <TextField
            size="small"
            placeholder="Filter underlying…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ maxWidth: 240 }}
          />
        </Stack>
      )}

      {loading && (
        <Stack spacing={1}>
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rectangular" height={28} />)}
        </Stack>
      )}

      {!loading && error && <Alert severity="error" sx={{ fontSize: 13 }}>{error}</Alert>}

      {!loading && !error && unavailable && (
        <Alert severity="info" sx={{ fontSize: 13 }}>
          Option metrics not yet ingested. Use POST /api/v1/derivatives/fo-bhavcopy/ingest to fetch from NSE.
        </Alert>
      )}

      {!loading && !error && !unavailable && (
        <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell><Typography variant="caption" fontWeight={700}>Underlying</Typography></TableCell>
                <TableCell><Typography variant="caption" fontWeight={700}>Expiry</Typography></TableCell>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>PCR</Typography></TableCell>
                <Tooltip title="Strike with the highest put open interest" arrow>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>Support</Typography></TableCell>
                </Tooltip>
                <Tooltip title="Strike with the highest call open interest" arrow>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>Resistance</Typography></TableCell>
                </Tooltip>
                <TableCell align="right"><Typography variant="caption" fontWeight={700}>Max Pain</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((r) => (
                <TableRow key={r.underlying} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{r.underlying}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{formatExpiry(r.expiryDate)}</Typography></TableCell>
                  <TableCell align="right">
                    <Tooltip title={pcrHint(r.pcrOi)} arrow>
                      <Chip size="small" variant="outlined" color={pcrColor(r.pcrOi)} label={fmtPcr(r.pcrOi)} sx={{ cursor: 'default', minWidth: 52 }} />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right"><Typography variant="body2" sx={{ color: 'success.main' }}>{fmtStrike(r.maxPutOiStrike)}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2" sx={{ color: 'error.main' }}>{fmtStrike(r.maxCallOiStrike)}</Typography></TableCell>
                  <TableCell align="right"><Typography variant="body2" fontWeight={600}>{fmtStrike(r.maxPainStrike)}</Typography></TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow><TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No underlyings match the filter.</Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Support = highest put-OI strike; Resistance = highest call-OI strike; Max Pain = strike minimizing option-writer payout.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        These are raw OI-concentration strikes (not classical chart levels), so on thin/low-liquidity underlyings they can coincide on one strike or invert (support above resistance under bearish OI skew). OI-derived levels for research only — not buy/sell advice.
      </Typography>
    </Paper>
  );
};

export default OptionMetricsWidget;
