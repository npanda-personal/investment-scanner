import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import StopIcon from '@mui/icons-material/Stop';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type {
  ExchangeHistoricalBackfillResponse,
  MarketDataSourceFileImportRecord,
} from '../api/marketDataFoundationService';

type SourceFileImportSortBy = 'importedAt' | 'tradingDate';
type SourceFileImportSortDirection = 'asc' | 'desc';

export function HistoricalBackfillRunEvidence({
  run,
  loading,
  onResume,
  onRetry,
  onCancel,
}: {
  run: ExchangeHistoricalBackfillResponse;
  loading: boolean;
  onResume: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const runningDates = activeBackfillDates(run);
  const summaryItems = [
    ['Status', run.status],
    ['Date range', `${run.startDate} to ${run.endDate}`],
    ['Workers', `${run.currentWorkers} active / ${run.workerCount} configured`],
    ['Active dates', runningDates],
    ['Progress', `${run.progressPercent}%`],
    ['Completed', formatOpsNumber(run.completed)],
    ['Skipped', formatOpsNumber(run.skipped)],
    ['Failed', formatOpsNumber(run.failed)],
    ['Pending', formatOpsNumber(run.pending)],
    ['Running', formatOpsNumber(run.running)],
    ['Not available', formatOpsNumber(run.notAvailable)],
    ['Retries', formatOpsNumber(run.retryCount)],
    ['ETA', formatDuration(run.estimatedRemainingMs)],
    ['Rows imported', formatOpsNumber(run.rowsInserted + run.rowsUpdated + run.rowsNoOp)],
    ['BSE fills', formatOpsNumber(run.bseFills)],
  ];
  const issueSummary = backfillIssueSummary(run);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Box sx={{ p: 2, pb: 1 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }} justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2">Historical Backfill Run</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? 'Refreshing run status' : `Run ${run.runId}`}
            </Typography>
          </Box>
          <Stack aria-label="Historical backfill run controls" direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onResume}
              disabled={loading || !['BLOCKED', 'PARTIAL', 'FAILED', 'RUNNING'].includes(run.status)}
            >
              Resume Backfill
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={onRetry}
              disabled={loading || (run.failed + run.notAvailable) === 0}
            >
              Retry Failed Dates
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={onCancel}
              disabled={loading || !['PENDING', 'RUNNING', 'BLOCKED'].includes(run.status)}
            >
              Cancel Backfill
            </Button>
          </Stack>
        </Stack>
      </Box>
      <Box sx={{ px: 2, pb: 1.5, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(7, minmax(0, 1fr))' }, gap: 1 }}>
        {summaryItems.map(([label, value]) => (
          <Box key={label} sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
            <Tooltip title={value}>
              <Typography variant="body2" fontWeight={700} noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</Typography>
            </Tooltip>
          </Box>
        ))}
      </Box>
      {issueSummary && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Alert severity={run.failed > 0 ? 'error' : 'warning'} sx={{ '& .MuiAlert-message': { minWidth: 0, width: '100%' } }}>
            <Tooltip title={issueSummary.fullText}>
              <Typography variant="body2" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {issueSummary.label}
              </Typography>
            </Tooltip>
          </Alert>
        </Box>
      )}
    </Box>
  );
}

export function SourceFileImportEvidence({
  imports,
  sortBy,
  sortDirection,
  onSortChange,
}: {
  imports: MarketDataSourceFileImportRecord[];
  sortBy: SourceFileImportSortBy;
  sortDirection: SourceFileImportSortDirection;
  onSortChange: (sortBy: SourceFileImportSortBy) => void;
}) {
  const [selectedImport, setSelectedImport] = useState<MarketDataSourceFileImportRecord | null>(null);
  const visibleImports = imports.slice(0, 10);

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography variant="subtitle2">SourceFileImport Evidence</Typography>
      </Box>
      <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
        <Table
          size="small"
          aria-label="SourceFileImport evidence"
          sx={{
            minWidth: 1040,
            tableLayout: 'fixed',
            '& .MuiTableCell-root': { verticalAlign: 'top' },
            '& .MuiTableCell-head': {
              color: 'text.secondary',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 80 }}>Source</TableCell>
              <TableCell sx={{ width: 96 }}>Segment</TableCell>
              <TableCell sx={{ width: 130 }}>
                <TableSortLabel
                  active={sortBy === 'tradingDate'}
                  direction={sortBy === 'tradingDate' ? sortDirection : 'desc'}
                  onClick={() => onSortChange('tradingDate')}
                >
                  Trading Date
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 128 }}>Status</TableCell>
              <TableCell sx={{ width: 190 }}>Rows</TableCell>
              <TableCell sx={{ width: 270 }}>File</TableCell>
              <TableCell sx={{ width: 146 }}>
                <TableSortLabel
                  active={sortBy === 'importedAt'}
                  direction={sortBy === 'importedAt' ? sortDirection : 'desc'}
                  onClick={() => onSortChange('importedAt')}
                >
                  Imported
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 64 }} align="right">Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleImports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">No SourceFileImport evidence for this scope yet.</Typography>
                </TableCell>
              </TableRow>
            ) : visibleImports.map((item) => (
              <TableRow key={item.id} hover onClick={() => setSelectedImport(item)} sx={{ cursor: 'pointer' }}>
                <TableCell><EvidenceCell value={item.source} strong /></TableCell>
                <TableCell><EvidenceCell value={item.segment} /></TableCell>
                <TableCell><EvidenceCell value={formatOpsDate(item.tradingDate)} /></TableCell>
                <TableCell><EvidenceCell value={item.status} strong /></TableCell>
                <TableCell><EvidenceCell value={`${formatOpsNumber(item.rowsAccepted)} accepted / ${formatOpsNumber(item.rowsRejected)} rejected / ${formatOpsNumber(item.rowsRaw)} raw`} /></TableCell>
                <TableCell><EvidenceCell value={item.fileName} /></TableCell>
                <TableCell><EvidenceCell value={formatOpsDateTime(item.importedAt)} /></TableCell>
                <TableCell align="right">
                  <Tooltip title="Open full SourceFileImport details">
                    <IconButton
                      size="small"
                      aria-label={`View SourceFileImport details ${item.id}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedImport(item);
                      }}
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <SourceFileImportDetailsDialog record={selectedImport} onClose={() => setSelectedImport(null)} />
    </Box>
  );
}

function SourceFileImportDetailsDialog({ record, onClose }: { record: MarketDataSourceFileImportRecord | null; onClose: () => void }) {
  if (!record) return null;
  const details = sourceFileImportDetailRows(record);
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        SourceFileImport Details
        <IconButton
          aria-label="Close SourceFileImport details"
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '160px minmax(0, 1fr)' },
            gap: 1,
            alignItems: 'start',
          }}
        >
          {details.map((item) => (
            <SourceFileImportDetailField key={item.label} label={item.label} value={item.value} />
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function SourceFileImportDetailField({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Typography variant="caption" color="text.secondary" sx={{ pt: { sm: 0.35 } }}>{label}</Typography>
      <Typography
        variant="body2"
        sx={{
          minWidth: 0,
          overflowWrap: 'anywhere',
          fontFamily: label === 'File Hash' || label === 'ID' ? 'monospace' : undefined,
        }}
      >
        {value}
      </Typography>
    </>
  );
}

function sourceFileImportDetailRows(record: MarketDataSourceFileImportRecord) {
  return [
    { label: 'ID', value: record.id },
    { label: 'Source', value: record.source },
    { label: 'Segment', value: record.segment },
    { label: 'Trading Date', value: formatOpsDate(record.tradingDate) },
    { label: 'Status', value: record.status },
    { label: 'Rows Raw', value: formatOpsNumber(record.rowsRaw) },
    { label: 'Rows Accepted', value: formatOpsNumber(record.rowsAccepted) },
    { label: 'Rows Rejected', value: formatOpsNumber(record.rowsRejected) },
    { label: 'File Name', value: record.fileName },
    { label: 'File URL', value: record.fileUrl || 'N/A' },
    { label: 'File Hash', value: record.fileHash },
    { label: 'File Size', value: record.fileSize === null || record.fileSize === undefined ? 'N/A' : `${formatOpsNumber(record.fileSize)} bytes` },
    { label: 'Parser Version', value: record.parserVersion },
    { label: 'Imported At', value: formatOpsDateTime(record.importedAt) },
    { label: 'Error', value: record.errorMessage ? userMessage(record.errorMessage) : 'N/A' },
    { label: 'Created At', value: formatOpsDateTime(record.createdAt) },
    { label: 'Updated At', value: formatOpsDateTime(record.updatedAt) },
  ];
}

function EvidenceCell({ value, strong = false }: { value: string; strong?: boolean }) {
  return (
    <Tooltip title={value}>
      <Typography
        variant="body2"
        fontWeight={strong ? 700 : 400}
        noWrap
        sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {value}
      </Typography>
    </Tooltip>
  );
}

function backfillIssueSummary(run: ExchangeHistoricalBackfillResponse) {
  const jobIssues = run.jobs
    .map((job) => job.error || (job.status === 'NOT_AVAILABLE' ? 'Official exchange file is not available for one or more dates.' : ''))
    .filter(Boolean);
  const issueMessages = [...run.errors, ...run.warnings, ...jobIssues]
    .map(userMessage)
    .filter((message, index, all) => message && all.indexOf(message) === index);
  if (issueMessages.length === 0) return null;
  const visible = issueMessages.slice(0, 3);
  const suffix = issueMessages.length > visible.length ? ` +${issueMessages.length - visible.length} more` : '';
  return {
    label: `Needs attention: ${visible.join(' | ')}${suffix}`,
    fullText: issueMessages.join(' | '),
  };
}

function activeBackfillDates(run: ExchangeHistoricalBackfillResponse) {
  const dates = run.jobs
    .filter((job) => job.status === 'RUNNING')
    .map((job) => job.tradingDate);
  if (dates.length === 0) return run.status === 'RUNNING' ? 'Claiming date jobs' : 'None';
  const visible = dates.slice(0, 3);
  const suffix = dates.length > visible.length ? ` +${dates.length - visible.length} more` : '';
  return `${visible.join(', ')}${suffix}`;
}

function userMessage(message: string) {
  const text = String(message || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'No details available.';
  if (/HTTP\s*404|404|not found|missing|unavailable/i.test(text)) return 'Official exchange file is not available for one or more dates.';
  if (/HTTP\s*429|rate limit|too many requests/i.test(text)) return 'Exchange request was throttled; retry later.';
  if (/HTTP\s*5\d\d|service unavailable|gateway/i.test(text)) return 'Exchange service returned a temporary error; retry later.';
  if (/latestPrice\.upsert|latest_prices|LatestPrice|Prisma/i.test(text)) return 'Latest price rebuild failed for one or more dates; persisted candle import needs review.';
  if (/already completed|already imported/i.test(text)) return 'Some dates were already imported and skipped.';
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function formatOpsDate(value: string | null | undefined) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatOpsDateTime(value: string | null | undefined) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatOpsNumber(value: number) {
  return new Intl.NumberFormat().format(Number.isFinite(value) ? value : 0);
}

function formatDuration(value: number | null) {
  if (!value || value <= 0) return 'N/A';
  const seconds = Math.round(value / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
