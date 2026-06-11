import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { HistoryOutlined } from '@mui/icons-material';
import { fetchSignalQualitySummary } from '@/features/signal-quality-lab';
import type { EvidenceUsability, QualitySummary } from '@/features/signal-quality-lab';

// Win rates and returns from the API are 0-1 ratios — multiply by 100 for display.
function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function fmtSigned(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const pct = (value * 100).toFixed(1);
  return value >= 0 ? `+${pct}%` : `${pct}%`;
}

type EvidenceConfig = {
  color: 'success' | 'warning' | 'error' | 'default';
  label: string;
  hideNumbers: boolean;
};

function evidenceConfig(usability: EvidenceUsability | undefined): EvidenceConfig {
  switch (usability) {
    case 'USABLE':
      return { color: 'success', label: 'Good evidence', hideNumbers: false };
    case 'LIMITED':
      return { color: 'warning', label: 'Limited evidence (small sample)', hideNumbers: false };
    case 'UNAVAILABLE':
    default:
      return { color: 'error', label: 'Not enough history yet', hideNumbers: true };
  }
}

const MetricTile: React.FC<{
  label: string;
  value: string;
  tone?: 'success' | 'warning' | 'error';
}> = ({ label, value, tone }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography
      variant="h6"
      fontWeight={700}
      color={tone ? `${tone}.main` : 'text.primary'}
      sx={{ mt: 0.25 }}
    >
      {value}
    </Typography>
  </Box>
);

export const SignalTrackRecordPanel: React.FC = () => {
  const [summary, setSummary] = useState<QualitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSignalQualitySummary('20D')
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load signal track record.';
          setError(message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const evidence = evidenceConfig(summary?.evidenceUsability);

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <HistoryOutlined color="action" />
        <Typography variant="h6" fontWeight={700}>
          Signal Track Record (last 20 trading days)
        </Typography>
        {summary && (
          <Chip
            size="small"
            label={evidence.label}
            color={evidence.color}
            variant="outlined"
          />
        )}
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && summary && summary.evidenceUsability === 'UNAVAILABLE' && (
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Not enough signal history yet to show track record metrics. Check back after more
            signals have had 20 trading days to mature.
          </Typography>
        </Box>
      )}

      {!loading && !error && summary && summary.evidenceUsability !== 'UNAVAILABLE' && (
        <>
          <Grid container spacing={3} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <MetricTile
                label="Bullish win rate"
                value={fmtPct(summary.overallBullishWinRate)}
                tone={
                  summary.overallBullishWinRate !== null && summary.overallBullishWinRate >= 0.55
                    ? 'success'
                    : summary.overallBullishWinRate !== null && summary.overallBullishWinRate < 0.45
                    ? 'error'
                    : undefined
                }
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricTile
                label="Bearish win rate"
                value={fmtPct(summary.overallBearishWinRate)}
                tone={
                  summary.overallBearishWinRate !== null && summary.overallBearishWinRate >= 0.55
                    ? 'success'
                    : summary.overallBearishWinRate !== null && summary.overallBearishWinRate < 0.45
                    ? 'error'
                    : undefined
                }
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricTile
                label="Avg 20-day return"
                value={fmtSigned(summary.average20DReturn)}
                tone={
                  summary.average20DReturn !== null && summary.average20DReturn > 0
                    ? 'success'
                    : summary.average20DReturn !== null && summary.average20DReturn < 0
                    ? 'error'
                    : undefined
                }
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricTile
                label="Sample size"
                value={
                  summary.evaluatedSignals > 0
                    ? `${summary.evaluatedSignals} / ${summary.matureSignals}`
                    : `${summary.matureSignals} mature`
                }
              />
            </Grid>
          </Grid>

          {(summary.bestPerformingSignalType || summary.worstPerformingSignalType) && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {summary.bestPerformingSignalType && (
                  <Typography variant="caption" color="text.secondary">
                    Best signal type:{' '}
                    <Box component="span" fontWeight={700} color="success.main">
                      {summary.bestPerformingSignalType}
                    </Box>
                  </Typography>
                )}
                {summary.worstPerformingSignalType && (
                  <Typography variant="caption" color="text.secondary">
                    Worst signal type:{' '}
                    <Box component="span" fontWeight={700} color="error.main">
                      {summary.worstPerformingSignalType}
                    </Box>
                  </Typography>
                )}
                {summary.bestSector && (
                  <Typography variant="caption" color="text.secondary">
                    Best sector:{' '}
                    <Box component="span" fontWeight={700} color="success.main">
                      {summary.bestSector}
                    </Box>
                  </Typography>
                )}
                {summary.worstSector && (
                  <Typography variant="caption" color="text.secondary">
                    Worst sector:{' '}
                    <Box component="span" fontWeight={700} color="error.main">
                      {summary.worstSector}
                    </Box>
                  </Typography>
                )}
              </Stack>
            </>
          )}
        </>
      )}

      <Divider sx={{ mt: 2, mb: 1.5 }} />
      <Typography variant="caption" color="text.disabled" display="block">
        For research support only, not financial advice.
      </Typography>
    </Paper>
  );
};

export default SignalTrackRecordPanel;
