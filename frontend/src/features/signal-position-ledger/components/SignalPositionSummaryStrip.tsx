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
          Loading entry trigger summary for {scopeLabel}.
        </Typography>
      </Paper>
    );
  }

  const validatedEvidence = data.items.filter((item) => item.currentDataQualityStatus === 'READY' && item.trustEvidenceStatus === 'SOURCE_PROVEN').length;
  const forwardValidated = data.items.filter((item) => item.calibrationEvidenceStatus === 'AVAILABLE').length;
  const hiddenDetails = data.items.filter((item) => (item.displayWarnings || []).length > 0).length;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
      <SummaryTile label="Entry trigger candidates" value={data.totalCount} helper={`${scopeLabel} total`} />
      <SummaryTile label="DQ ready evidence" value={validatedEvidence} helper="Visible rows" />
      <SummaryTile label="Forward-validation shown" value={forwardValidated} helper="Visible rows" />
      <SummaryTile label="Rows with caveats" value={hiddenDetails} helper="Open details" />
    </Box>
  );
};
