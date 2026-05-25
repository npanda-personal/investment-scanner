import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { StatusBadge } from '@/shared/components';
import type { PipelineStatusRun } from '../types';

type PipelineStatusStripProps = {
  activeRun: PipelineStatusRun | null;
  lastRun: PipelineStatusRun | null;
  generatedAt: string | null;
  region: string;
  assetType: string;
};

export function PipelineStatusStrip({ activeRun, lastRun, generatedAt, region, assetType }: PipelineStatusStripProps) {
  const progressRun = activeRun || lastRun;
  const percent = progressRun && progressRun.totalCount > 0
    ? Math.min(100, Math.round((progressRun.processedCount / progressRun.totalCount) * 100))
    : null;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Typography variant="subtitle2">Scope</Typography>
            <Chip size="small" label={`${region} / ${assetType}`} />
            <Typography variant="subtitle2">Active</Typography>
            <StatusBadge label={activeRun?.status || 'IDLE'} />
            <Typography variant="subtitle2">Last</Typography>
            <StatusBadge label={lastRun?.status || 'NO_RUN_EVIDENCE'} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Generated {formatDateTime(generatedAt)} | Data through {formatDate(progressRun?.dataThroughDate)}
          </Typography>
        </Stack>
        <Stack spacing={0.5} sx={{ minWidth: { xs: '100%', md: 260 } }}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="caption" color="text.secondary">Pipeline progress</Typography>
            <Typography variant="caption" color="text.secondary">
              {progressRun ? `${progressRun.processedCount} / ${progressRun.totalCount || 'unknown'}` : 'No run evidence'}
            </Typography>
          </Stack>
          <LinearProgress
            variant={percent === null ? 'determinate' : 'determinate'}
            value={percent ?? 0}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}
