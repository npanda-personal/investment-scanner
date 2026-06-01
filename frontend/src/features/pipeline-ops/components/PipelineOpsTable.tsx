import { Fragment, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Collapse,
  IconButton,
  LinearProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link as RouterLink } from 'react-router-dom';
import { StatusBadge } from '@/shared/components';
import type {
  PipelineStatusSnapshot,
  PipelineStatusStage,
  PipelineStatusStageGroup,
} from '../types';
import { formatDateTime } from './PipelineStatusStrip';

type OperationDefinition = {
  stageKey: string;
  stageOrder: number;
  moduleName: string;
  operationName: string;
  sourcePath: string;
};

const OPERATION_CATALOG: OperationDefinition[] = [
  { stageKey: 'MARKET_DATA', stageOrder: 1, moduleName: 'Market Data', operationName: 'Incremental EOD data load', sourcePath: '/market-data-foundation' },
  { stageKey: 'DATA_QUALITY', stageOrder: 2, moduleName: 'Data Quality', operationName: 'Readiness evaluation', sourcePath: '/data-quality' },
  { stageKey: 'RAW_SIGNALS', stageOrder: 3, moduleName: 'Signals', operationName: 'Raw signal generation', sourcePath: '/signals' },
  { stageKey: 'SIGNAL_CALIBRATION', stageOrder: 4, moduleName: 'Signal Calibration', operationName: 'Calibration refresh', sourcePath: '/signals/calibration' },
  { stageKey: 'CONTEXT_SNAPSHOTS', stageOrder: 5, moduleName: 'Context Snapshots', operationName: 'Historical context snapshots', sourcePath: '/context-snapshots' },
  { stageKey: 'MARKET_CONTEXT', stageOrder: 6, moduleName: 'Market Context', operationName: 'Market and sector context', sourcePath: '/market-context' },
  { stageKey: 'SIGNAL_QUALITY', stageOrder: 7, moduleName: 'Signal Quality', operationName: 'Outcome quality refresh', sourcePath: '/signals/quality' },
  { stageKey: 'SMART_MONEY', stageOrder: 8, moduleName: 'Smart Money', operationName: 'Smart money context', sourcePath: '/smart-money' },
  { stageKey: 'STRATEGY_DECISION', stageOrder: 9, moduleName: 'Strategy', operationName: 'Strategy decision refresh', sourcePath: '/strategy' },
  { stageKey: 'BACKTEST_PROOF', stageOrder: 10, moduleName: 'Backtests', operationName: 'Backtest proof refresh', sourcePath: '/backtests' },
  { stageKey: 'RESEARCH_PROJECTION', stageOrder: 11, moduleName: 'Research', operationName: 'Research command projection', sourcePath: '/research' },
  { stageKey: 'TODAY_REVIEW', stageOrder: 12, moduleName: 'Today Review', operationName: 'Daily candidate publication', sourcePath: '/today-review' },
  { stageKey: 'SIGNAL_POSITION_LEDGER', stageOrder: 13, moduleName: 'Signal Position Ledger', operationName: 'Entry/exit trigger lifecycle refresh', sourcePath: '/signals/position-ledger' },
];

type PipelineOpsRow = OperationDefinition & PipelineStatusStageGroup;

type PipelineOpsTableProps = {
  snapshot: PipelineStatusSnapshot | null;
  activeOnly: boolean;
};

const ACTIVE_STATUSES = new Set(['PENDING', 'RUNNING']);
const clippedTextSx = {
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

export function PipelineOpsTable({
  snapshot,
  activeOnly,
}: PipelineOpsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const stageMap = new Map((snapshot?.stages || []).map((stage) => [stage.stageKey, stage]));
    const catalogRows = OPERATION_CATALOG.map((operation) => ({
      ...operation,
      ...(stageMap.get(operation.stageKey) || {
        activeStage: null,
        lastStage: null,
      }),
    }));
    const unknownRows = (snapshot?.stages || [])
      .filter((stage) => !OPERATION_CATALOG.some((operation) => operation.stageKey === stage.stageKey))
      .map((stage) => ({
        stageKey: stage.stageKey,
        stageOrder: stage.stageOrder,
        moduleName: 'Unmapped Module',
        operationName: stage.stageKey.replace(/_/g, ' ').toLowerCase(),
        sourcePath: '/pipeline-ops',
        activeStage: stage.activeStage,
        lastStage: stage.lastStage,
      }));
    const allRows: PipelineOpsRow[] = [...catalogRows, ...unknownRows]
      .sort((a, b) => a.stageOrder - b.stageOrder || a.stageKey.localeCompare(b.stageKey));
    return activeOnly ? allRows.filter((row) => row.activeStage && ACTIVE_STATUSES.has(row.activeStage.status)) : allRows;
  }, [activeOnly, snapshot]);

  const toggleRow = (stageKey: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(stageKey)) next.delete(stageKey);
      else next.add(stageKey);
      return next;
    });
  };

  if (!snapshot) {
    return (
      <Alert severity="info">No pipeline run evidence yet for this scope.</Alert>
    );
  }

  return (
    <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
      <Table
        size="small"
        aria-label="pipeline operations"
        sx={{
          minWidth: 1320,
          tableLayout: 'fixed',
          '& .MuiTableCell-root': {
            verticalAlign: 'top',
            overflow: 'hidden',
          },
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
            <TableCell sx={{ width: 44 }} />
            <TableCell sx={{ width: 170 }}>Module</TableCell>
            <TableCell sx={{ width: 210 }}>Operation</TableCell>
            <TableCell sx={{ width: 142 }}>Status</TableCell>
            <TableCell sx={{ width: 184 }}>Progress</TableCell>
            <TableCell sx={{ width: 174 }}>Last Run</TableCell>
            <TableCell sx={{ width: 160 }}>Counts</TableCell>
            <TableCell sx={{ width: 300 }}>Evidence</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const stage = row.activeStage || row.lastStage;
            const isExpanded = expandedRows.has(row.stageKey);
            return (
              <Fragment key={row.stageKey}>
                <TableRow hover>
                  <TableCell>
                    <IconButton size="small" onClick={() => toggleRow(row.stageKey)} aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${row.stageKey}`}>
                      {isExpanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={row.moduleName}>
                      <Typography variant="body2" fontWeight={700} noWrap sx={clippedTextSx}>{row.moduleName}</Typography>
                    </Tooltip>
                    <Tooltip title={row.stageKey}>
                      <Typography variant="caption" color="text.secondary" noWrap sx={clippedTextSx}>{row.stageKey}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={row.operationName}>
                      <Typography variant="body2" noWrap sx={clippedTextSx}>{row.operationName}</Typography>
                    </Tooltip>
                    <Link component={RouterLink} to={row.sourcePath} variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      View source <OpenInNewIcon sx={{ fontSize: 14 }} />
                    </Link>
                  </TableCell>
                  <TableCell><StatusBadge label={stage?.status || 'NO_RUN_EVIDENCE'} /></TableCell>
                  <TableCell><ProgressCell stage={stage} /></TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={clippedTextSx}>{formatDateTime(stage?.completedAt || stage?.startedAt || stage?.updatedAt)}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={clippedTextSx}>Data through {stage?.dataThroughDate ? formatDateTime(stage.dataThroughDate) : 'N/A'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={`Ok ${stage?.succeededCount ?? 0}`} />
                      <Chip size="small" label={`Partial ${stage?.partialCount ?? 0}`} />
                      <Chip size="small" label={`Fail ${stage?.failedCount ?? 0}`} />
                      <Chip size="small" label={`Skip ${stage?.skippedCount ?? 0}`} />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        <Chip size="small" color={stage?.warnings?.length ? 'warning' : 'default'} label={`Warnings ${stage?.warnings?.length ?? 0}`} />
                        <Chip size="small" color={stage?.errors?.length ? 'error' : 'default'} label={`Errors ${stage?.errors?.length ?? 0}`} />
                      </Stack>
                      {stage?.errors?.[0] && (
                        <Tooltip title={stage.errors[0]}>
                          <Typography variant="caption" color="error.main" noWrap sx={clippedTextSx}>{stage.errors[0]}</Typography>
                        </Tooltip>
                      )}
                      {!stage?.errors?.length && stage?.warnings?.[0] && (
                        <Tooltip title={stage.warnings[0]}>
                          <Typography variant="caption" color="warning.main" noWrap sx={clippedTextSx}>{stage.warnings[0]}</Typography>
                        </Tooltip>
                      )}
                      {stage?.metadata && (
                        <Tooltip title={compactMetadata(stage.metadata)}>
                          <Typography variant="caption" color="text.secondary" noWrap sx={clippedTextSx}>{compactMetadata(stage.metadata)}</Typography>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 0, borderBottom: isExpanded ? '1px solid' : 0, borderColor: 'divider' }}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <RowDetails stage={stage} />
                    </Collapse>
                  </TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ProgressCell({ stage }: { stage: PipelineStatusStage | null }) {
  const isTerminal = Boolean(stage?.completedAt) || ['COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED', 'BLOCKED', 'CANCELED'].includes(String(stage?.status || '').toUpperCase());
  const completedCount = stage && isTerminal
    ? Math.min(stage.totalCount, Math.max(stage.processedCount, stage.succeededCount + stage.failedCount + stage.skippedCount))
    : stage?.processedCount ?? 0;
  const percent = stage && stage.totalCount > 0 ? Math.min(100, Math.round((completedCount / stage.totalCount) * 100)) : 0;
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Typography variant="caption" color="text.secondary">
          {stage ? `${completedCount} / ${stage.totalCount || 'unknown'}` : 'No run evidence'}
        </Typography>
        <Typography variant="caption" color="text.secondary">{stage && stage.totalCount > 0 ? `${percent}%` : 'N/A'}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={percent} sx={{ height: 7, borderRadius: 1 }} />
      {stage?.hasMore && (
        <Typography variant="caption" color="warning.main">
          More batches pending from offset {stage.nextOffset ?? 'unknown'}
        </Typography>
      )}
    </Stack>
  );
}

function RowDetails({ stage }: { stage: PipelineStatusStage | null }) {
  if (!stage) {
    return (
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="body2" color="text.secondary">No pipeline run evidence yet.</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
        <DetailBlock label="Execution Scope" value={executionScopeLabel(stage)} />
        <DetailBlock label="Cache" value={`${stage.cacheStatus}${stage.cacheKey ? ` | ${stage.cacheKey}` : ''}`} />
        <DetailBlock label="Input" value={stage.inputFingerprint || 'N/A'} />
        <DetailBlock label="Output" value={stage.outputFingerprint || 'N/A'} />
        <DetailBlock label="Batch Cursor" value={`batch ${stage.batchSize ?? 'N/A'} | next ${stage.nextOffset ?? 'done'} | hasMore ${stage.hasMore ? 'yes' : 'no'}`} />
        <DetailBlock label="Lease" value={stage.leaseExpiresAt ? `${stage.leaseOwner || 'worker'} until ${formatDateTime(stage.leaseExpiresAt)}` : 'N/A'} />
        <DetailBlock label="Warnings" value={stage.warnings.length ? stage.warnings.join(' | ') : 'None'} />
        <DetailBlock label="Errors" value={stage.errors.length ? stage.errors.join(' | ') : 'None'} />
        <DetailBlock label="Metadata" value={stage.metadata ? compactMetadata(stage.metadata) : 'N/A'} />
      </Stack>
    </Box>
  );
}

function executionScopeLabel(stage: PipelineStatusStage) {
  const metadata = stage.metadata || {};
  const changedCount = Number(metadata.changedInstrumentCount ?? stage.changedInstrumentCount ?? 0);
  const adapterProcessed = Number(metadata.adapterProcessedCount ?? stage.processedCount ?? 0);
  const scope = changedCount > 0 ? 'incremental changed/downstream set' : 'module snapshot';
  return `${scope} | input ${changedCount || stage.totalCount || 0} | processed ${adapterProcessed}`;
}

function compactMetadata(metadata: Record<string, unknown>) {
  const keys = [
    'sourceStage',
    'adapter',
    'adapterProcessedCount',
    'completedCount',
    'changedInstrumentCount',
    'downstreamInstrumentCount',
    'generatedCount',
    'updatedCount',
    'rowsRead',
    'rowsParsed',
    'rowsInserted',
    'rowsUpdated',
    'rowsNoOp',
    'rowsSkipped',
    'backfillRunId',
    'workerCount',
    'currentWorkers',
    'totalDates',
    'completedDates',
    'skippedDates',
    'failedDates',
    'notAvailableDates',
    'pendingDates',
    'runningDates',
    'progressPercent',
    'bseFills',
    'datesSkippedAlreadyImported',
    'nextStartDate',
    'noOpCount',
    'calibratedCount',
    'passthroughCount',
    'evidenceStatus',
    'readinessStatus',
  ];
  return keys
    .filter((key) => metadata[key] !== undefined && metadata[key] !== null)
    .map((key) => `${key}: ${String(metadata[key])}`)
    .join(' | ') || 'No compact metadata';
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 180, maxWidth: 420 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Tooltip title={value}>
        <Typography variant="body2" noWrap>{value}</Typography>
      </Tooltip>
    </Box>
  );
}
