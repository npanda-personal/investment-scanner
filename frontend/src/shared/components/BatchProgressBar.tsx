import { Alert, Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';

type BatchProgressBarProps = {
  running: boolean;
  label: string;
  processedCount: number;
  totalCount: number | null;
  batchCount?: number;
  estimatedBatchTotal?: number;
  generatedCount?: number;
  updatedCount?: number;
  insertedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  noOpCount?: number;
  warningsCount?: number;
  error?: string | null;
  complete?: boolean;
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export function BatchProgressBar({
  running,
  label,
  processedCount,
  totalCount,
  batchCount,
  estimatedBatchTotal,
  generatedCount,
  updatedCount,
  insertedCount,
  skippedCount,
  failedCount,
  noOpCount,
  warningsCount,
  error,
  complete,
}: BatchProgressBarProps) {
  if (!running && !complete && !error) return null;

  const hasKnownTotal = typeof totalCount === 'number' && totalCount > 0;
  const percent = hasKnownTotal ? clampPercent((processedCount / totalCount) * 100) : 0;
  const counts = [
    generatedCount !== undefined ? `Generated ${generatedCount}` : null,
    updatedCount !== undefined ? `Updated ${updatedCount}` : null,
    insertedCount !== undefined ? `Inserted ${insertedCount}` : null,
    skippedCount !== undefined ? `Skipped ${skippedCount}` : null,
    failedCount !== undefined ? `Failed ${failedCount}` : null,
    noOpCount !== undefined ? `No-op ${noOpCount}` : null,
  ].filter(Boolean).join(', ');

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">{label}</Typography>
        <LinearProgress
          variant={running && !hasKnownTotal ? 'indeterminate' : 'determinate'}
          value={hasKnownTotal ? percent : complete ? 100 : 0}
        />
        <Typography variant="body2" color="text.secondary">
          {hasKnownTotal
            ? `Processed ${Math.min(processedCount, totalCount)} / ${totalCount}`
            : `Processed ${processedCount}`}
          {batchCount ? ` · Batch ${batchCount}${estimatedBatchTotal ? ` of ${estimatedBatchTotal}` : ''}` : ''}
          {counts ? ` · ${counts}` : ''}
          {warningsCount ? ` · Warnings ${warningsCount}` : ''}
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {complete && !error && (
          <Box>
            <Typography variant="body2" color="success.main">Complete</Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
