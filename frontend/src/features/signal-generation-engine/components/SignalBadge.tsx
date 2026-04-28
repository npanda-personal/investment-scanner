import React from 'react';
import { Chip } from '@mui/material';
import type { SignalDirection } from '../types';

const colorFor = (direction?: string) => {
  if (direction === 'BULLISH') return 'success';
  if (direction === 'BEARISH') return 'error';
  return 'warning';
};

export const SignalBadge: React.FC<{ direction?: SignalDirection | string; label?: string }> = ({ direction, label }) => (
  <Chip size="small" color={colorFor(direction)} variant="outlined" label={label || direction || 'NEUTRAL'} />
);

