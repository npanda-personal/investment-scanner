import React from 'react';
import { Alert, Box, Chip, CircularProgress, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { LaunchOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useInstrumentSignal } from '../hooks/useInstrumentSignal';
import { SignalBadge } from './SignalBadge';

// Mirrors the backend canonical threshold DEFAULT_STALENESS_DAYS
// (backend/src/modules/signal-generation-engine/signal-asof.ts). The backend's
// isStaleAsOf() measures staleness from the underlying price date, so we anchor on
// sourcePriceDate (falling back to generated_at) — a signal built on >5-day-old data
// reflects an older market, not today's.
const SIGNAL_STALENESS_DAYS = 5;

export const SignalWidget: React.FC<{ instrumentId?: string }> = ({ instrumentId }) => {
  const navigate = useNavigate();
  const { signal, loading, error } = useInstrumentSignal(instrumentId);

  if (!instrumentId) return null;

  const stalenessAnchor = signal ? (signal.sourcePriceDate ?? signal.generated_at) : null;
  const anchorMs = stalenessAnchor ? new Date(stalenessAnchor).getTime() : NaN;
  const daysOld = Number.isFinite(anchorMs)
    ? Math.floor((Date.now() - anchorMs) / 86_400_000)
    : null;
  const isStale = daysOld != null && daysOld >= SIGNAL_STALENESS_DAYS;

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Typography variant="h6">Signal Score</Typography>
        {signal && <SignalBadge direction={signal.direction} />}
      </Box>
      {loading ? (
        <CircularProgress size={22} />
      ) : error ? (
        <Alert severity="warning">{error}</Alert>
      ) : signal ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
            {signal.calibratedScore != null ? (
              <>
                <Typography variant="h4">{signal.score}</Typography>
                <Typography variant="body2" color="text.secondary">→ {signal.calibratedScore} (calibrated)</Typography>
                {signal.reliabilityTier && (
                  <Chip size="small" label={signal.reliabilityTier} color={signal.reliabilityTier === 'FULL' ? 'success' : 'warning'} sx={{ height: 18, fontSize: 10 }} />
                )}
              </>
            ) : (
              <>
                <Typography variant="h4">{signal.score}</Typography>
                <Tooltip title="Not enough historical evidence to calibrate this signal yet" arrow>
                  <Typography variant="caption" color="text.disabled" sx={{ cursor: 'help' }}>calibration pending</Typography>
                </Tooltip>
              </>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">Confidence: {signal.confidence}</Typography>
          <Box component="ul" sx={{ pl: 2, my: 1 }}>
            {(signal.triggered_signals.length > 0 ? signal.triggered_signals : signal.negative_signals).slice(0, 3).map((reason) => (
              <Typography key={reason.code} component="li" variant="body2">{reason.label}</Typography>
            ))}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {isStale && (
              <Tooltip title={`This signal reflects data from about ${daysOld} days ago, not today's market — refresh to regenerate.`} arrow>
                <Chip size="small" color="warning" variant="outlined" label={`Stale · ${daysOld}d old`} sx={{ height: 18, fontSize: 10, cursor: 'help' }} />
              </Tooltip>
            )}
            <Typography variant="caption" color="text.secondary">
              {new Date(signal.generated_at).toLocaleString()}
              {signal.sourcePriceDate ? ` · prices through ${new Date(signal.sourcePriceDate).toLocaleDateString()}` : ''}
            </Typography>
          </Box>
        </>
      ) : (
        <Typography color="text.secondary">No signal generated yet.</Typography>
      )}
      <Box sx={{ mt: 1 }}>
        <Tooltip title="Open Signals Dashboard" arrow>
          <IconButton size="small" onClick={() => navigate('/signals')}>
            <LaunchOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};
