import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import type { PostMortemSummaryData } from '../types';

interface PostMortemCardProps {
  data: PostMortemSummaryData;
}

const StatBox: React.FC<{ label: string; value: string; tone?: 'success' | 'error' | 'warning' }> = ({ label, value, tone }) => (
  <Paper variant="outlined" sx={{ px: 2, py: 1.5, textAlign: 'center', minWidth: 110 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="h6" color={tone ? `${tone}.main` : 'text.primary'} sx={{ fontWeight: 600 }}>{value}</Typography>
  </Paper>
);

export default function PostMortemCard({ data }: PostMortemCardProps) {
  const winRate = data.actedWinRate != null ? `${(data.actedWinRate * 100).toFixed(1)}%` : '—';
  const avgReturn = data.actedAvgReturnPct != null ? `${data.actedAvgReturnPct.toFixed(2)}%` : '—';
  const winTone = data.actedWinRate != null ? (data.actedWinRate >= 0.5 ? 'success' : 'warning') : undefined;
  const returnTone = data.actedAvgReturnPct != null ? (data.actedAvgReturnPct >= 0 ? 'success' : 'error') : undefined;

  const acted = data.byDecision.find((d) => d.decision === 'ACTED')?.count ?? 0;
  const skipped = data.byDecision.find((d) => d.decision === 'SKIPPED')?.count ?? 0;
  const watching = data.byDecision.find((d) => d.decision === 'WATCHING')?.count ?? 0;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Decision Review</Typography>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
        <StatBox label="Total Entries" value={String(data.totalEntries)} />
        <StatBox label="Acted" value={String(acted)} />
        <StatBox label="Skipped" value={String(skipped)} />
        <StatBox label="Watching" value={String(watching)} />
        <StatBox label="Win Rate" value={winRate} tone={winTone} />
        <StatBox label="Avg Return" value={avgReturn} tone={returnTone} />
        <StatBox label="Closed Trades" value={String(data.actedClosedCount)} />
        {data.missedAvoidedCount > 0 && (
          <StatBox label="Skipped w/ Signal" value={String(data.missedAvoidedCount)} />
        )}
      </Stack>
      {data.dataNote && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{data.dataNote}</Typography>
      )}
    </Box>
  );
}
