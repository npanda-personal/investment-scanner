import React from 'react';
import { Chip } from '@mui/material';

interface RegionBadgeProps {
  region?: string | null;
  size?: 'small' | 'medium';
}

/**
 * Small "Region: <X>" chip so each admin panel visibly states which market it reflects.
 * Makes region isolation verifiable at a glance (the whole screen should match the
 * global header selector). GLOBAL/empty renders as "All markets".
 */
const RegionBadge: React.FC<RegionBadgeProps> = ({ region, size = 'small' }) => {
  const value = region && region.toUpperCase() !== 'GLOBAL' ? region.toUpperCase() : 'All markets';
  return <Chip size={size} variant="outlined" color="info" label={`Region: ${value}`} />;
};

export default RegionBadge;
