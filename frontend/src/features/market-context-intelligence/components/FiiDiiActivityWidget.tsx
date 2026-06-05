/**
 * CB-21: FII / DII Activity Widget
 *
 * Displays the last few sessions' FII and DII net buy/sell figures (₹ Crore)
 * sourced from NSE's free public endpoint.  Data is persisted server-side;
 * this component is a pure read — it never calls the /ingest endpoint.
 *
 * Color coding:
 *   DII  net buy  (positive) → success.main  (green)
 *   DII  net sell (negative) → error.main    (red)
 *   FII  net buy  (positive) → success.main
 *   FII  net sell (negative) → error.main
 *   zero / N/A               → text.secondary (grey)
 *
 * INR formatting: uses inrCompact from money.ts (values are ₹ Cr already,
 * so we multiply × 1e7 to get raw rupees then let inrCompact scale back).
 * Simpler: just format as "₹<num> Cr" directly since NSE already gives Cr.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { changeColor } from '@/shared/format/money';
import { fetchFiiDiiActivity, type FiiDiiRow } from '../api/marketContextIntelligenceService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a ₹ Crore value as "₹1,234.5 Cr" with sign. */
function fmtCr(value: number): string {
  if (!Number.isFinite(value)) return 'N/A';
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '+';
  return `${sign}₹${abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`;
}

function NetIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUpIcon fontSize="small" />;
  if (value < 0) return <TrendingDownIcon fontSize="small" />;
  return <RemoveIcon fontSize="small" />;
}

// ---------------------------------------------------------------------------
// Group rows by date, then produce a flat display structure
// ---------------------------------------------------------------------------

interface DaySummary {
  tradingDate: string;
  fii: FiiDiiRow | null;
  dii: FiiDiiRow | null;
}

function groupByDate(rows: FiiDiiRow[]): DaySummary[] {
  const map = new Map<string, DaySummary>();
  for (const row of rows) {
    if (!map.has(row.tradingDate)) {
      map.set(row.tradingDate, { tradingDate: row.tradingDate, fii: null, dii: null });
    }
    const day = map.get(row.tradingDate)!;
    if (row.category === 'FII') day.fii = row;
    else if (row.category === 'DII') day.dii = row;
  }
  // Most-recent first
  return [...map.values()].sort((a, b) => b.tradingDate.localeCompare(a.tradingDate));
}

function formatDate(iso: string): string {
  // "2026-06-05" → "05 Jun"
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FiiDiiActivityWidget: React.FC = () => {
  const [data, setData] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const resp = await fetchFiiDiiActivity({ days: 5 });
      if (resp.status === 'missing' || resp.rows.length === 0) {
        setUnavailable(true);
        setData([]);
        return;
      }
      if (resp.status === 'error') {
        setError(resp.message ?? 'Failed to load FII/DII data');
        setData([]);
        return;
      }
      setAsOf(resp.asOf);
      setData(groupByDate(resp.rows));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h6">FII / DII Activity</Typography>
          <Typography variant="caption" color="text.secondary">
            Cash-market net buy/sell · ₹ Crore · Source: NSE
          </Typography>
        </Box>
        {asOf && (
          <Tooltip title={`Latest session: ${asOf}`} arrow>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              As of {formatDate(asOf)}
            </Typography>
          </Tooltip>
        )}
      </Stack>

      {loading && (
        <Stack spacing={1}>
          <Skeleton variant="rectangular" height={28} />
          <Skeleton variant="rectangular" height={28} />
          <Skeleton variant="rectangular" height={28} />
        </Stack>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ fontSize: 13 }}>{error}</Alert>
      )}

      {!loading && !error && unavailable && (
        <Alert severity="info" sx={{ fontSize: 13 }}>
          FII/DII data not yet ingested. Use POST /api/v1/market-context/fii-dii/ingest to fetch from NSE.
        </Alert>
      )}

      {!loading && !error && !unavailable && data.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="caption" fontWeight={700}>Date</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="caption" fontWeight={700}>FII Net</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="caption" fontWeight={700}>DII Net</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((day) => {
              const fiiNet = day.fii?.netValueCr ?? null;
              const diiNet = day.dii?.netValueCr ?? null;
              return (
                <TableRow key={day.tradingDate}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {formatDate(day.tradingDate)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {fiiNet !== null ? (
                      <Tooltip
                        title={`Buy ₹${day.fii!.buyValueCr.toLocaleString('en-IN')} Cr · Sell ₹${day.fii!.sellValueCr.toLocaleString('en-IN')} Cr`}
                        arrow
                      >
                        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.5}
                          sx={{ color: changeColor(fiiNet), cursor: 'default' }}>
                          <NetIcon value={fiiNet} />
                          <Typography variant="body2" fontWeight={600} color="inherit">
                            {fmtCr(fiiNet)}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {diiNet !== null ? (
                      <Tooltip
                        title={`Buy ₹${day.dii!.buyValueCr.toLocaleString('en-IN')} Cr · Sell ₹${day.dii!.sellValueCr.toLocaleString('en-IN')} Cr`}
                        arrow
                      >
                        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={0.5}
                          sx={{ color: changeColor(diiNet), cursor: 'default' }}>
                          <NetIcon value={diiNet} />
                          <Typography variant="body2" fontWeight={600} color="inherit">
                            {fmtCr(diiNet)}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export default FiiDiiActivityWidget;
