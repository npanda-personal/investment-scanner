import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import type { SignalPositionLedgerActiveListResponse } from '../types';

type SummaryTileProps = {
  label: string;
  value: number;
  helper: string;
};

const SummaryTile: React.FC<SummaryTileProps> = ({ label, value, helper }) => (
  <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
    <Stack spacing={0.5}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 0 }}>{value.toLocaleString()}</Typography>
      <Typography color="text.secondary" variant="caption">{helper}</Typography>
    </Stack>
  </Paper>
);

type SignalPositionSummaryStripProps = {
  data: SignalPositionLedgerActiveListResponse;
  scopeLabel: string;
  loading: boolean;
};

export const SignalPositionSummaryStrip: React.FC<SignalPositionSummaryStripProps> = ({ data, scopeLabel, loading }) => {
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Typography color="text.secondary" variant="body2">
          Loading active position summary for {scopeLabel}.
        </Typography>
      </Paper>
    );
  }

  const exitCompatibility = data.items.filter((item) => item.healthState === 'EXIT_TRIGGERED').length;
  const riskWarning = data.items.filter((item) => item.healthState === 'RISK_WARNING').length;
  const limitedReturnBasis = data.items.filter((item) => item.currentReturnStatus === 'STALE' || item.currentReturnStatus === 'UNAVAILABLE').length;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
      <SummaryTile label="Active positions" value={data.totalCount} helper={`${scopeLabel} total`} />
      <SummaryTile label="Exit-trigger compatibility" value={exitCompatibility} helper="This page" />
      <SummaryTile label="Risk warning" value={riskWarning} helper="This page" />
      <SummaryTile label="Return basis limited" value={limitedReturnBasis} helper="This page" />
    </Box>
  );
};
