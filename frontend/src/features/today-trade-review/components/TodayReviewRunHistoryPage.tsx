import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '@/shared/components/PageHeader';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { useTodayReviewRuns } from '../hooks/useTodayReviewRuns';
import { formatDate, formatDateTime } from './todayReviewTableFormat';

const PAGE_SIZE = 20;

function statusColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'PARTIAL') return 'warning';
  if (status === 'FAILED') return 'error';
  return 'default';
}

function trustColor(trust: string): 'success' | 'error' | 'warning' | 'default' {
  if (trust === 'OK') return 'success';
  if (trust === 'FAILED') return 'error';
  if (trust === 'DEGRADED') return 'warning';
  return 'default';
}

function candidateTotal(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

function durationLabel(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return 'In progress';
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function TodayReviewRunHistoryPage() {
  const { scope } = useMarketScope();
  const [page, setPage] = useState(0);
  const { runs, loading, error, pagination } = useTodayReviewRuns({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  return (
    <Box className="page-container page-container--workspace">
      <Stack spacing={2}>
        <PageHeader
          title="Review History"
          subtitle="Past daily review sessions and their outcomes."
          backTo="/today-review"
          backLabel="Today's Review"
          badges={<Chip label={`${scope.region} / ${scope.assetType}`} color="primary" variant="outlined" />}
        />

        {loading && (
          <Alert severity="info" icon={<CircularProgress size={18} />}>
            Loading review history...
          </Alert>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && runs.length === 0 && (
          <Alert severity="info">
            No review history available for {scope.region} / {scope.assetType}.
          </Alert>
        )}

        {!loading && runs.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Run Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Trust</TableCell>
                  <TableCell align="right">Candidates</TableCell>
                  <TableCell>Data Through</TableCell>
                  <TableCell>Finished</TableCell>
                  <TableCell align="right">Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id} hover>
                    <TableCell>
                      <Link component={RouterLink} to={`/today-review/runs/${run.id}`} underline="hover">
                        <Typography variant="body2" fontWeight={600}>{formatDate(run.runDate)}</Typography>
                      </Link>
                    </TableCell>
                    <TableCell><Chip label={run.status} size="small" color={statusColor(run.status)} /></TableCell>
                    <TableCell><Chip label={run.trustStatus} size="small" color={trustColor(run.trustStatus)} variant="outlined" /></TableCell>
                    <TableCell align="right">{candidateTotal(run.candidateCounts)}</TableCell>
                    <TableCell>{formatDate(run.dataThroughDate)}</TableCell>
                    <TableCell>{formatDateTime(run.finishedAt || run.startedAt)}</TableCell>
                    <TableCell align="right">{durationLabel(run.startedAt, run.finishedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {pagination && (
              <TablePagination
                component="div"
                count={pagination.total}
                page={page}
                onPageChange={(_e, newPage) => setPage(newPage)}
                rowsPerPage={PAGE_SIZE}
                rowsPerPageOptions={[PAGE_SIZE]}
              />
            )}
          </TableContainer>
        )}
      </Stack>
    </Box>
  );
}
