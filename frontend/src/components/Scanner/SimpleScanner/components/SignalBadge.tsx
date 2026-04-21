import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { SimplifiedSignal } from '../../../../types/simple-scanner';

interface SignalBadgeProps {
  signal: SimplifiedSignal;
  compact?: boolean;
}

const SignalBadge: React.FC<SignalBadgeProps> = ({ signal, compact = false }) => {
  // Determine color based on direction
  const getColor = () => {
    switch (signal.direction) {
      case 'bullish':
        return 'success';
      case 'bearish':
        return 'error';
      default:
        return 'default';
    }
  };

  // Determine variant based on confidence
  const getVariant = () => {
    return signal.confidence > 70 ? 'filled' : 'outlined';
  };

  // Get confidence indicator
  const getConfidenceText = () => {
    if (signal.confidence > 80) return '🔥';
    if (signal.confidence > 60) return '⚡';
    return '';
  };

  if (compact) {
    return (
      <Tooltip title={`${signal.name}: ${signal.description}`}>
        <Chip
          size="small"
          label={signal.name}
          color={getColor()}
          variant={getVariant()}
          sx={{ mr: 0.5, mb: 0.5 }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={signal.description}>
      <Chip
        size="small"
        label={
          <span>
            {signal.name} {getConfidenceText()}
          </span>
        }
        color={getColor()}
        variant={getVariant()}
        sx={{ mr: 1, mb: 1 }}
      />
    </Tooltip>
  );
};

export default SignalBadge;