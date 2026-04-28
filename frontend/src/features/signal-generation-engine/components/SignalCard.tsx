import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SignalBadge } from './SignalBadge';
import type { SignalResult } from '../types';

const formatDateTime = (value: string) => new Date(value).toLocaleString();

export const SignalCard: React.FC<{ signal: SignalResult }> = ({ signal }) => {
  const navigate = useNavigate();
  const reasons = signal.triggered_signals.length > 0 ? signal.triggered_signals : signal.negative_signals;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Box>
          <Typography fontWeight={700}>{signal.symbol}</Typography>
          <Typography variant="body2" color="text.secondary">{signal.company_name || 'Unknown company'}</Typography>
        </Box>
        <SignalBadge direction={signal.direction} />
      </Box>
      <Typography variant="h5">{signal.score}</Typography>
      <Typography variant="caption" color="text.secondary">Confidence: {signal.confidence}</Typography>
      <Box component="ul" sx={{ pl: 2, my: 1 }}>
        {reasons.slice(0, 3).map((reason) => (
          <Typography key={reason.code} component="li" variant="body2">{reason.label}</Typography>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary">{formatDateTime(signal.generated_at)}</Typography>
      <Box sx={{ mt: 1 }}>
        <Button size="small" onClick={() => navigate(`/research/stocks/${signal.instrument_id}`)}>Research</Button>
      </Box>
    </Paper>
  );
};

