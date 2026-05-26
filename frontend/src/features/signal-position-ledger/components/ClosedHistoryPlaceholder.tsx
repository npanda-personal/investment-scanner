import React from 'react';
import { Paper, Stack, Typography } from '@mui/material';

export const ClosedHistoryPlaceholder: React.FC = () => (
  <Paper variant="outlined" sx={{ p: 3 }}>
    <Stack spacing={1}>
      <Typography variant="h6">Closed History</Typography>
      <Typography color="text.secondary">
        Closed history is not shown yet because durable close date, close price, and close reason proof are not available on the current source path.
      </Typography>
      <Typography color="text.secondary" variant="body2">
        This tab stays reserved for a later child that adds reusable close-proof truth.
      </Typography>
    </Stack>
  </Paper>
);
