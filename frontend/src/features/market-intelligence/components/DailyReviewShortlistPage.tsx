import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { humanizeCode } from '@/shared/format/enumLabels';
import { PageHeader } from '@/shared/components';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { useDailyReviewShortlist } from '../hooks/useDailyReviewShortlist';
import type {
  DailyReviewShortlistResult,
  DailyReviewShortlistRow,
  DailyReviewShortlistWarningSeverity,
} from '../api/dailyReviewShortlistService';

export function DailyReviewShortlistPage() {
  const { profile } = useMarketScope();
  const { data, loading, error, scope } = useDailyReviewShortlist();

  if (profile.isCrypto) {
    return (
      <Box className="page-container page-container--hub">
        <PageHeader
          title="Daily Review Shortlist"
          subtitle="The first answer for the daily workflow: what are the 10 names to review today."
        />
        <NotApplicableForAssetClass
          feature="Daily Review"
          detail="Crypto coverage in this release is available on Market Scans and the Instrument workspace. This view will support crypto in a later update."
        />
      </Box>
    );
  }

  return (
    <Box className="page-container page-container--hub">
      <PageHeader
        title="Daily Review Shortlist"
        subtitle="The first answer for the daily workflow: what are the 10 names to review today."
        badges={(
          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${scope.region} / ${scope.assetType}`} color="primary" variant="outlined" size="small" />
            <Chip label="Snapshot" variant="outlined" size="small" />
            <Chip label="10 review slots" variant="outlined" size="small" />
          </Stack>
        )}
      />

      {loading && (
        <Stack spacing={2}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary">
            Loading shortlist — reading stored data from Today Review, Active Positions, Stock Interest, Data Quality, and Market Pulse…
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            {[0, 1, 2, 3].map((i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="text" width="80%" />
              </Paper>
            ))}
          </Box>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Skeleton variant="text" width="30%" sx={{ mb: 1 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 1 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.25 }}>
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="50%" />
                </Paper>
              ))}
            </Box>
          </Paper>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Skeleton variant="text" width="25%" />
            </Box>
            {[0, 1, 2, 3].map((i) => (
              <Box key={i} sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Skeleton variant="text" width={24} />
                  <Skeleton variant="text" width={80} />
                  <Skeleton variant="text" width={120} />
                  <Skeleton variant="text" width={160} sx={{ flexGrow: 1 }} />
                </Stack>
              </Box>
            ))}
          </Paper>
        </Stack>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && !error && data && <DailyReviewShortlistContent data={data} />}
    </Box>
  );
}

function DailyReviewShortlistContent({ data }: { data: DailyReviewShortlistResult }) {
  return (
    <Stack spacing={2}>
      {data.sourceErrors.length > 0 && (
        <Stack spacing={1}>
          {data.sourceErrors.map((message) => <Alert key={message} severity="warning">{message}</Alert>)}
        </Stack>
      )}

      <OverviewGrid data={data} />
      <SourceContributionPanel data={data} />
      <ShortlistTable rows={data.rows} targetCount={data.targetCount} />
      <EvidencePanels data={data} />
    </Stack>
  );
}

function OverviewGrid({ data }: { data: DailyReviewShortlistResult }) {
  const review = data.reviewReadiness;
  const pulse = data.marketPulse?.snapshot;
  const dq = data.dataQualitySummary;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
      <MetricCard label="Shortlist Count" value={`${data.rows.length} / ${data.targetCount}`} helper="Rows shown from stored data." />
      <MetricCard label="Review Mode" value={formatEnum(review?.reviewMode)} helper={review?.trustStatus ? `Trust: ${formatEnum(review.trustStatus)}` : 'Review readiness unavailable.'} />
      <MetricCard label="Market Pulse" value={pulse?.marketHealthLabel || 'Unavailable'} helper={pulse?.status ? `Status: ${formatEnum(pulse.status)}` : data.marketPulse?.message || 'Market Pulse data not available.'} />
      <MetricCard label="Data Quality" value={dq ? formatNumber(dq.signalReadyCount) : 'Unavailable'} helper={dq ? `Signal-ready rows; DQ status ${formatEnum(dq.dataStatus)}.` : 'Summary unavailable.'} />
    </Box>
  );
}

function SourceContributionPanel({ data }: { data: DailyReviewShortlistResult }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        <SectionTitle title="Source Contribution" subtitle="Selected count reflects saved source ordering." />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 1 }}>
          {data.sourceContributions.map((source) => (
            <Paper key={source.source} variant="outlined" sx={{ p: 1.25 }}>
              <Typography variant="caption" color="text.secondary">{humanizeCode(source.source)}</Typography>
              <Typography fontWeight={800}>{source.selectedCount} selected</Typography>
              <Typography variant="body2" color="text.secondary">{source.availableCount} available</Typography>
            </Paper>
          ))}
        </Box>
      </Stack>
    </Paper>
  );
}

function ShortlistTable({ rows, targetCount }: { rows: DailyReviewShortlistRow[]; targetCount: number }) {
  if (rows.length === 0) {
    return (
      <Alert severity="info">
        <Stack spacing={0.5}>
          <Typography fontWeight={800}>No review names qualify for the shortlist in stored data.</Typography>
          <Typography variant="body2">No fake rows are shown. Review Ready Universe, Today Review, Stock Interest, or Active Positions evidence may be missing or blocked for this scope.</Typography>
        </Stack>
      </Alert>
    );
  }

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Stack spacing={1.25} sx={{ p: 2, pb: 0 }}>
        <SectionTitle title="Today's 10 Review Names" subtitle={`Showing ${rows.length} of ${targetCount} review slots.`} />
      </Stack>
      <TableContainer>
        <Table size="small" aria-label="Daily Review Shortlist table">
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Lane</TableCell>
              <TableCell>Sources</TableCell>
              <TableCell>Warning</TableCell>
              <TableCell>Data Quality</TableCell>
              <TableCell>Reason Summary</TableCell>
              <TableCell>Detail</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.rank}</TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography fontWeight={800}>{row.symbol}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.companyName || 'Not available'}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.sector || 'Not available'}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>{row.lane}</TableCell>
                <TableCell><ChipList values={row.sourceContributions} size="small" /></TableCell>
                <TableCell><Chip label={row.warningSeverity} color={warningColor(row.warningSeverity)} variant="outlined" size="small" /></TableCell>
                <TableCell>
                  <Stack spacing={0.25}>
                    <Typography variant="body2">{formatEnum(row.dataQualityStatus)}</Typography>
                    <Typography variant="caption" color="text.secondary">{firstOrFallback(row.dataQualityReasons, 'Not available')}</Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ minWidth: 260 }}>
                  <Typography variant="body2">{row.reasonSummary}</Typography>
                </TableCell>
                <TableCell>
                  <Button
                    component={RouterLink}
                    to={row.detailPath}
                    size="small"
                    endIcon={<OpenInNewIcon fontSize="small" />}
                  >
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <AccordionStack rows={rows} />
    </Paper>
  );
}

const ACCORDION_PAGE_SIZE = 10;

function AccordionStack({ rows }: { rows: DailyReviewShortlistRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, ACCORDION_PAGE_SIZE);
  const hidden = rows.length - ACCORDION_PAGE_SIZE;

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Stack spacing={1}>
        {visible.map((row) => <ExplainabilityAccordion key={`${row.id}:why`} row={row} />)}
      </Stack>
      {rows.length > ACCORDION_PAGE_SIZE && (
        <Box sx={{ mt: 1 }}>
          <Collapse in={!expanded} unmountOnExit>
            <Button size="small" onClick={() => setExpanded(true)}>
              Show all ({hidden} more)
            </Button>
          </Collapse>
          <Collapse in={expanded} unmountOnExit>
            <Button size="small" onClick={() => setExpanded(false)}>
              Show fewer
            </Button>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}

function ExplainabilityAccordion({ row }: { row: DailyReviewShortlistRow }) {
  return (
    <Accordion disableGutters variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Typography fontWeight={800}>{row.symbol}</Typography>
          <Typography color="text.secondary">{row.sourceOrderLabel}</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.25}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1 }}>
            <InlineFact label="Market Pulse" value={row.marketPulseContext} />
            <InlineFact label="Fundamentals" value={row.fundamentalsContext} />
            <InlineFact label="Portfolio / Watchlist" value={overlayText(row)} />
          </Box>
          <Stack spacing={0.75}>
            {row.explainability.map((item) => <Typography key={item} variant="body2">{item}</Typography>)}
          </Stack>
          {(row.warnings.length > 0 || row.blockers.length > 0) && (
            <Stack spacing={0.75}>
              {row.blockers.map((item) => <Alert key={item} severity="error">{item}</Alert>)}
              {row.warnings.map((item) => <Alert key={item} severity="warning">{item}</Alert>)}
            </Stack>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function EvidencePanels({ data }: { data: DailyReviewShortlistResult }) {
  const review = data.reviewReadiness;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <SectionTitle title="Review Ready Universe" subtitle="Saved readiness status from Market Data / Data Quality." />
          <InlineFact label="Review mode" value={formatEnum(review?.reviewMode)} />
          <InlineFact label="Trust status" value={formatEnum(review?.trustStatus)} />
          <InlineFact label="User decision" value={formatEnum(review?.userDecision)} />
          <InlineFact label="Trusted / catalog" value={review ? `${formatNumber(review.trustedCount)} / ${formatNumber(review.catalogCount)}` : 'Unavailable'} />
          <InlineFact label="Required data-through" value={formatDate(review?.requiredDataThroughDate)} />
          <InlineFact label="Stored data-through" value={formatDate(review?.storedDataThroughDate)} />
          {review?.blockers && review.blockers.length > 0 && (
            <Stack spacing={0.75}>
              {review.blockers.slice(0, 3).map((blocker) => (
                <Alert key={`${blocker.category}:${blocker.affectedCount}`} severity="warning">
                  {formatEnum(blocker.category)}: {formatNumber(blocker.affectedCount)} affected; {blocker.nextActionLabel}
                </Alert>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <SectionTitle title="Evidence Caveats" subtitle="Warnings are shown alongside the shortlist for context." />
          {data.sourceWarnings.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No source warnings.</Typography>
          ) : (
            data.sourceWarnings.slice(0, 6).map((warning) => <Alert key={warning} severity="warning">{warning}</Alert>)
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <SectionTitle title="Active Rows Excluded" subtitle="Normal active position rows are not repeated as new-review names." />
          {data.excludedActiveRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No normal active rows were excluded.</Typography>
          ) : (
            <SimpleRows rows={data.excludedActiveRows.map((row) => ({
              symbol: row.symbol,
              label: row.companyName || 'Not available',
              detail: row.reason,
            }))} />
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.25}>
          <SectionTitle title="Warning-Heavy Rows" subtitle="Blocked, unproven, insufficient-data, or risk-avoid rows are disclosed outside the top-10 list." />
          {data.warningRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No warning-heavy rows in stored data.</Typography>
          ) : (
            <SimpleRows rows={data.warningRows.map((row) => ({
              symbol: row.symbol,
              label: `${row.source} / ${row.severity}`,
              detail: row.reason,
            }))} />
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" fontWeight={800}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{helper}</Typography>
      </Stack>
    </Paper>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={800}>{title}</Typography>
      {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
    </Box>
  );
}

function InlineFact({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>
    </Stack>
  );
}

const SIMPLE_ROWS_PAGE_SIZE = 10;

function SimpleRows({ rows }: { rows: Array<{ symbol: string; label: string; detail: string }> }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, SIMPLE_ROWS_PAGE_SIZE);
  const hidden = rows.length - SIMPLE_ROWS_PAGE_SIZE;

  return (
    <Stack spacing={1}>
      {visible.map((row) => (
        <Paper key={`${row.symbol}:${row.detail}`} variant="outlined" sx={{ p: 1.25 }}>
          <Stack spacing={0.25}>
            <Typography fontWeight={800}>{row.symbol}</Typography>
            <Typography variant="caption" color="text.secondary">{row.label}</Typography>
            <Typography variant="body2">{row.detail}</Typography>
          </Stack>
        </Paper>
      ))}
      {rows.length > SIMPLE_ROWS_PAGE_SIZE && (
        <>
          <Collapse in={!expanded} unmountOnExit>
            <Button size="small" onClick={() => setExpanded(true)}>
              Show all ({hidden} more)
            </Button>
          </Collapse>
          <Collapse in={expanded} unmountOnExit>
            <Button size="small" onClick={() => setExpanded(false)}>
              Show fewer
            </Button>
          </Collapse>
        </>
      )}
    </Stack>
  );
}

function ChipList({ values, size = 'medium' }: { values: string[]; size?: 'small' | 'medium' }) {
  if (values.length === 0) return <Typography variant="body2" color="text.secondary">Unavailable</Typography>;
  return (
    <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
      {values.map((value) => <Chip key={value} label={humanizeCode(value)} size={size} variant="outlined" />)}
    </Stack>
  );
}

function warningColor(severity: DailyReviewShortlistWarningSeverity): 'default' | 'info' | 'warning' | 'error' {
  if (severity === 'Blocker') return 'error';
  if (severity === 'High' || severity === 'Watch') return 'warning';
  if (severity === 'Info') return 'info';
  return 'default';
}

function overlayText(row: DailyReviewShortlistRow): string {
  const parts = [];
  if (row.portfolioNames.length > 0) parts.push(`Portfolio: ${row.portfolioNames.join(', ')}`);
  if (row.watchlistNames.length > 0) parts.push(`Watchlist: ${row.watchlistNames.join(', ')}`);
  return parts.length > 0 ? parts.join('; ') : 'No personal overlay.';
}

function firstOrFallback(values: string[], fallback: string): string {
  return values.find((value) => value && value.trim()) ?? fallback;
}

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unavailable';
  return new Intl.NumberFormat().format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Unavailable';
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(value).toLocaleDateString() : value;
}

function formatEnum(value: string | null | undefined): string {
  if (!value) return 'Unavailable';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}
