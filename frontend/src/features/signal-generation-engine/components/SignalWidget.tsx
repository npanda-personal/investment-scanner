import React from 'react';
import { Alert, Box, Chip, CircularProgress, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { LaunchOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useInstrumentSignal } from '../hooks/useInstrumentSignal';
import { SignalBadge } from './SignalBadge';

export const SignalWidget: React.FC<{ instrumentId?: string }> = ({ instrumentId }) => {
  const navigate = useNavigate();
  const { signal, loading, error } = useInstrumentSignal(instrumentId);

  if (!instrumentId) return null;

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
            {signal.calibratedScore != null && signal.calibrationStatus === 'CALIBRATED' ? (
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
          <Typography variant="caption" color="text.secondary">{new Date(signal.generated_at).toLocaleString()}</Typography>
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
