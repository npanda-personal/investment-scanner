import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { StalenessBadge } from '@/shared/components';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { useDailyOverviewDashboard } from '../hooks/useDailyOverviewDashboard';
import type {
  CandidateGroupSummary,
  MarketMoverRange,
  MarketMoverRow,
  TodayReviewCandidateGroupSet,
} from '../types';

const moverRanges: MarketMoverRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];
const unavailableLabel = 'Unavailable';

export function DailyOverviewDashboardPage() {
  const { profile } = useMarketScope();
  const dashboard = useDailyOverviewDashboard();
  const [moverRange, setMoverRange] = useState<MarketMoverRange>('1D');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateGroupSummary['rows'][number] | null>(null);

  const todayReview = dashboard.critical.todayReview.data;
  const marketMovers = dashboard.critical.marketMovers.data;
  const marketContext = dashboard.deferred.marketContext.data;

  const todayReviewGroups: TodayReviewCandidateGroupSet = useMemo(() => ({
    bullishReview: todayReview?.groups.longReview ?? [],
    bearishReview: todayReview?.groups.shortReview ?? [],
    exitRiskReview: todayReview?.groups.exitRiskReview ?? [],
    watchOnly: todayReview?.groups.watchOnly ?? [],
    blocked: todayReview?.groups.blocked ?? [],
    insufficientData: todayReview?.groups.insufficientData ?? [],
    unproven: todayReview?.groups.unproven ?? [],
  }), [todayReview]);

  const topSignalCandidates = useMemo(() => mapTodayReviewRows([
    ...todayReviewGroups.bullishReview,
    ...todayReviewGroups.bearishReview,
    ...todayReviewGroups.exitRiskReview,
  ]).slice(0, 10), [todayReviewGroups]);

  const moverSummary = marketMovers?.ranges.find((item) => item.range === moverRange) ?? null;
  const hotStocks = useMemo(() => {
    const candidateByInstrumentId = new Map(
      [...todayReviewGroups.bullishReview, ...todayReviewGroups.bearishReview]
        .map((item) => [item.instrumentId, item] as const),
    );
    return [...(moverSummary?.gainers ?? []), ...(moverSummary?.losers ?? [])]
      .map((mover) => ({
        mover,
        candidate: candidateByInstrumentId.get(mover.instrumentId) ?? null,
      }))
      .filter((item) => item.candidate)
      .sort((left, right) => Math.abs(right.mover.returnPercent) - Math.abs(left.mover.returnPercent))
      .slice(0, 6);
  }, [moverSummary?.gainers, moverSummary?.losers, todayReviewGroups.bearishReview, todayReviewGroups.bullishReview]);

  if (profile.isCrypto) {
    return (
      <Box className="page-container page-container--workspace">
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 700 }}>
                Daily Overview
              </Typography>
            </Box>
          </Paper>
          <NotApplicableForAssetClass
            feature="Daily Overview"
            detail="Crypto coverage in this release is available on Signals, Market Scans, and the Instrument workspace. This view will support crypto in a later update."
          />
        </Stack>
      </Box>
    );
  }

  return (
    <Box className="page-container page-container--workspace">
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={1.5}>
              <Box>
                <Typography variant="h4" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 700 }}>
                  Daily Overview
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Stock market snapshot for movers, top signal candidates, and sector strength.
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                <Button component={RouterLink} to="/today-review" variant="outlined">
                  Open Today Review
                </Button>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={() => void dashboard.refresh()}
                  disabled={dashboard.refreshing}
                >
                  {dashboard.refreshing ? 'Refreshing' : 'Refresh'}
                </Button>
              </Stack>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip label={`${dashboard.scope.region} / ${dashboard.scope.assetType}`} color="primary" variant="outlined" />
              <Chip label={`Today Review: ${formatStatus(todayReview?.run?.status)}`} variant="outlined" />
              <Chip label={`Data through: ${formatDate(todayReview?.run?.dataThroughDate)}`} variant="outlined" />
              {/* NR-37: visible staleness badge for today-review dataThroughDate */}
              <StalenessBadge asOf={todayReview?.run?.dataThroughDate} label="Today Review" />
            </Stack>
          </Stack>
        </Paper>

        {/* Per-section errors are rendered inline; no combined top-level error needed */}

        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={1}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="h6">Market Price Movers</Typography>
                    {/* NR-37: surface movers generatedAt staleness — visible when data is days old */}
                    <StalenessBadge asOf={marketMovers?.generatedAt} label="Movers" />
                  </Stack>
                  <ToggleButtonGroup
                    value={moverRange}
                    exclusive
                    onChange={(_event, value: MarketMoverRange | null) => {
                      if (!value) return;
                      setMoverRange(value);
                      void dashboard.loadMarketMoversRange(value);
                    }}
                    size="small"
                    sx={{ flexWrap: 'wrap', gap: 1 }}
                  >
                    {moverRanges.map((range) => (
                      <ToggleButton key={range} value={range}>
                        {range}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Stack>
                {dashboard.critical.marketMovers.loading && <LinearProgress />}
                {dashboard.critical.marketMovers.error && !dashboard.critical.marketMovers.loading && (
                  <SectionError message={dashboard.critical.marketMovers.error} onRetry={() => void dashboard.refresh()} />
                )}
                {!dashboard.critical.marketMovers.loading && !dashboard.critical.marketMovers.error && moverSummary?.warnings?.[0] && (
                  <Alert severity="info">{moverSummary.warnings[0]}</Alert>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <MoverList
                      title={`Top ${moverRange} Price Gainers`}
                      icon={<TrendingUpIcon color="success" />}
                      rows={moverSummary?.gainers ?? []}
                      tone="success.main"
                      loading={dashboard.critical.marketMovers.loading}
                      hasError={Boolean(dashboard.critical.marketMovers.error)}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <MoverList
                      title={`Top ${moverRange} Price Losers`}
                      icon={<TrendingDownIcon color="error" />}
                      rows={moverSummary?.losers ?? []}
                      tone="error.main"
                      loading={dashboard.critical.marketMovers.loading}
                      hasError={Boolean(dashboard.critical.marketMovers.error)}
                    />
                  </Grid>
                </Grid>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Today At A Glance</Typography>
                {dashboard.critical.todayReview.loading ? (
                  <Stack spacing={1}>
                    <Skeleton variant="rounded" height={34} />
                    <Skeleton variant="rounded" height={34} />
                    <Skeleton variant="rounded" height={34} />
                  </Stack>
                ) : dashboard.critical.todayReview.error ? (
                  <SectionError message={dashboard.critical.todayReview.error} onRetry={() => void dashboard.refresh()} />
                ) : (
                  <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`Bullish ${formatNumber(todayReviewGroups.bullishReview.length)}`} color="success" variant="outlined" />
                    <Chip label={`Bearish ${formatNumber(todayReviewGroups.bearishReview.length)}`} color="error" variant="outlined" />
                    <Chip label={`Exit/Risk ${formatNumber(todayReviewGroups.exitRiskReview.length)}`} color="warning" variant="outlined" />
                    <Chip label={`Watch ${formatNumber(todayReviewGroups.watchOnly.length)}`} variant="outlined" />
                    <Chip label={`Blocked ${formatNumber(todayReviewGroups.blocked.length)}`} variant="outlined" />
                  </Stack>
                )}
                <Divider />
                {dashboard.deferred.marketContext.loading ? (
                  <Stack spacing={0.75}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="50%" />
                  </Stack>
                ) : dashboard.deferred.marketContext.error ? (
                  <Typography variant="body2" color="text.secondary">
                    Market context unavailable — see Sector Strength below.
                  </Typography>
                ) : (
                  <>
                    <Tooltip title="Advance/decline ratio: number of advancing stocks divided by declining stocks. Values above 1.0 indicate more advancers than decliners." arrow>
                      <Typography variant="body2" color="text.secondary">
                        A/D ratio: {formatRatio(marketContext?.breadth?.advanceDeclineRatio)}
                      </Typography>
                    </Tooltip>
                    <Typography variant="body2" color="text.secondary">
                      Regime: {formatStatus(marketContext?.regime?.regime)}
                    </Typography>
                  </>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={7}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={1}>
                  <Typography variant="h6">Top Signal Candidates</Typography>
                  <Typography variant="body2" color="text.secondary">Top 10 by Today Review rank</Typography>
                </Stack>
                {dashboard.critical.todayReview.loading && <LinearProgress />}
                {dashboard.critical.todayReview.error && !dashboard.critical.todayReview.loading && (
                  <SectionError message={dashboard.critical.todayReview.error} onRetry={() => void dashboard.refresh()} />
                )}
                {!dashboard.critical.todayReview.loading && !dashboard.critical.todayReview.error && topSignalCandidates.length === 0 && (
                  <Alert severity="info">No ranked signal candidates are currently published for this scope.</Alert>
                )}
                {!dashboard.critical.todayReview.loading && !dashboard.critical.todayReview.error && topSignalCandidates.length > 0 && (
                  <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 430 }}>
                    <Table stickyHeader size="small" sx={{
                      minWidth: 820,
                      '& .MuiTableCell-root': {
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      },
                    }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 64 }}>Rank</TableCell>
                          <TableCell sx={{ minWidth: 150 }}>Stock</TableCell>
                          <TableCell sx={{ minWidth: 120 }}>Type</TableCell>
                          <TableCell sx={{ minWidth: 110 }}>Grade</TableCell>
                          <TableCell sx={{ minWidth: 180 }}>Strategy</TableCell>
                          <TableCell sx={{ minWidth: 280 }}>Trigger Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {topSignalCandidates.map((row) => (
                          <TableRow
                            key={row.id}
                            hover
                            onClick={() => setSelectedCandidate(row)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>#{row.rank}</TableCell>
                            <TableCell>
                              <Tooltip title={`${row.symbol} - ${row.companyName || 'Company unavailable'}`} arrow>
                                <Typography variant="body2" fontWeight={800} noWrap>
                                  {row.symbol} - {row.companyName || 'Company unavailable'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>{labelize(row.direction || row.state)}</TableCell>
                            <TableCell>{row.grade} / {Math.round(row.confidenceScore)}</TableCell>
                            <TableCell>
                              <Tooltip title={`${row.strategyCode} v${row.strategyVersion || 'N/A'}`} arrow>
                                <Typography variant="body2" noWrap>{row.strategyCode} v{row.strategyVersion || 'N/A'}</Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={row.reasonSummary} arrow>
                                <Typography variant="body2" color="text.secondary" noWrap>{row.reasonSummary}</Typography>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Mover-Backed Signal Candidates</Typography>
                <Typography variant="body2" color="text.secondary">
                  Stocks where market movement overlaps with a current signal candidate.
                </Typography>
                {dashboard.critical.todayReview.loading && <LinearProgress />}
                {dashboard.critical.todayReview.error && !dashboard.critical.todayReview.loading && (
                  <SectionError message={dashboard.critical.todayReview.error} onRetry={() => void dashboard.refresh()} />
                )}
                {!dashboard.critical.todayReview.loading && !dashboard.critical.todayReview.error && hotStocks.length === 0 && (
                  <Alert severity="info">No mover and signal-candidate overlap is available for {moverRange}.</Alert>
                )}
                <Grid container spacing={1}>
                  {hotStocks.map((item) => (
                    <Grid key={`${item.mover.instrumentId}-${item.candidate?.id}`} item xs={12} sm={6}>
                      <Paper variant="outlined" sx={{ p: 1.25, height: '100%' }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" justifyContent="space-between" gap={1}>
                            <Typography variant="body2" fontWeight={800} noWrap>{item.mover.symbol}</Typography>
                            <Chip size="small" label={formatPercent(item.mover.returnPercent)} color={item.mover.returnPercent >= 0 ? 'success' : 'error'} variant="outlined" />
                          </Stack>
                          <Typography variant="caption" color="text.secondary" noWrap>{item.mover.companyName}</Typography>
                          <Typography variant="body2" fontWeight={700}>{item.candidate?.grade} - {Math.round(item.candidate?.confidenceScore ?? 0)} - {item.candidate?.direction}</Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6">Sector Strength</Typography>
            {dashboard.deferred.marketContext.error && !dashboard.deferred.marketContext.loading && (
              <SectionError message={dashboard.deferred.marketContext.error} onRetry={() => void dashboard.refresh()} />
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <SectorList
                  title="Leading Sectors"
                  rows={marketContext?.topSectors ?? []}
                  loading={dashboard.deferred.marketContext.loading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <SectorList
                  title="Weak Sectors"
                  rows={marketContext?.weakSectors ?? []}
                  loading={dashboard.deferred.marketContext.loading}
                />
              </Grid>
            </Grid>
          </Stack>
        </Paper>
      </Stack>
      <CandidateDetailDialog candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
    </Box>
  );
}

function CandidateDetailDialog({ candidate, onClose }: { candidate: CandidateGroupSummary['rows'][number] | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(candidate)} onClose={onClose} maxWidth="md" fullWidth>
      {candidate && (
        <>
          <DialogTitle>
            <Stack spacing={0.5}>
              <Typography variant="h6">{candidate.symbol} rule-ranked candidate</Typography>
              <Typography variant="body2" color="text.secondary">{candidate.companyName || 'Company unavailable'}</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Rank #${candidate.rank}`} variant="outlined" />
                <Chip label={`${candidate.grade} / ${Math.round(candidate.confidenceScore)}`} variant="outlined" />
                <Chip label={labelize(candidate.direction || candidate.state)} variant="outlined" />
                <Chip label={`Strategy ${candidate.strategyCode} v${candidate.strategyVersion || 'N/A'}`} variant="outlined" />
                <Chip label={`DQ ${candidate.dataQualityStatus || 'Unavailable'}`} variant="outlined" />
              </Stack>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Trigger Reason</Typography>
                <Typography color="text.secondary">{candidate.reasonSummary}</Typography>
              </Box>
              {candidate.watchReasons.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>Review Notes</Typography>
                  <Typography color="text.secondary">{candidate.watchReasons.join(' ')}</Typography>
                </Box>
              )}
              {candidate.blockers.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>Blockers</Typography>
                  <Typography color="text.secondary">{candidate.blockers.join(' ')}</Typography>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary">
                Source timestamp: {formatDateTime(candidate.sourceTimestamp)}
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Close</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={onRetry}>
          Retry
        </Button>
      }
    >
      Couldn&apos;t reach the server — {message}
    </Alert>
  );
}

function MoverList({ title, icon, rows, tone, loading, hasError }: { title: string; icon: ReactNode; rows: MarketMoverRow[]; tone: string; loading: boolean; hasError: boolean }) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" gap={1}>
        {icon}
        <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
      </Stack>
      {loading ? (
        <Stack spacing={0.75}>
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rounded" height={38} />)}
        </Stack>
      ) : hasError ? null : rows.length === 0 ? (
        <Alert severity="info">No data for today.</Alert>
      ) : (
        <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {rows.map((row, index) => (
            <Box key={`${title}-${row.instrumentId}`}>
              <ListItem sx={{ py: 0.75, gap: 1.25 }}>
                <Tooltip title={`${row.symbol} - ${row.sector || 'Sector N/A'}`} arrow>
                  <Typography variant="body2" fontWeight={800} noWrap sx={{ minWidth: 130, maxWidth: 180 }}>
                    {row.symbol} - {row.sector || 'Sector N/A'}
                  </Typography>
                </Tooltip>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                  {row.companyName}
                </Typography>
                <Typography variant="body2" fontWeight={800} sx={{ color: tone, minWidth: 72, textAlign: 'right' }}>
                  {formatPercent(row.returnPercent)}
                </Typography>
              </ListItem>
              {index < rows.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
    </Stack>
  );
}

function SectorList({ title, rows, loading }: { title: string; rows: Array<{ sector: string; return1M: number | null; return3M: number | null; return6M: number | null; relativeStrengthScore: number }>; loading: boolean }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
      {loading ? (
        <Stack spacing={0.75}>
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} variant="rounded" height={38} />)}
        </Stack>
      ) : rows.length === 0 ? (
        <Alert severity="info">No data for today.</Alert>
      ) : (
        <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {rows.slice(0, 6).map((row, index) => (
            <Box key={`${title}-${row.sector}`}>
              <ListItem sx={{ py: 0.75, gap: 1.25 }}>
                <Typography variant="body2" fontWeight={800} noWrap sx={{ flex: 1 }}>{row.sector}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  1M {formatPercent(row.return1M)} - 3M {formatPercent(row.return3M)} - 6M {formatPercent(row.return6M)}
                </Typography>
                <Chip size="small" label={row.relativeStrengthScore} variant="outlined" />
              </ListItem>
              {index < Math.min(rows.length, 6) - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
    </Stack>
  );
}

function mapTodayReviewRows(rows: TodayReviewCandidateGroupSet[keyof TodayReviewCandidateGroupSet]): CandidateGroupSummary['rows'] {
  return [...rows]
    .sort((left, right) => {
      const rankDelta = (Number.isFinite(left.rank) ? left.rank : Number.MAX_SAFE_INTEGER) - (Number.isFinite(right.rank) ? right.rank : Number.MAX_SAFE_INTEGER);
      if (rankDelta !== 0) return rankDelta;
      return right.confidenceScore - left.confidenceScore;
    })
    .map((item) => ({
      id: item.id,
      rank: item.rank,
      symbol: item.symbol,
      companyName: item.companyName,
      direction: item.direction,
      state: item.state,
      setupType: item.setupType,
      grade: item.grade,
      confidenceScore: item.confidenceScore,
      strategyCode: item.strategyCode,
      strategyVersion: item.strategyVersion,
      reasonSummary: item.reasonSummary,
      dataQualityStatus: typeof item.dataQualitySnapshot?.signalReadinessStatus === 'string' ? item.dataQualitySnapshot.signalReadinessStatus : null,
      blockers: item.blockers || [],
      watchReasons: item.watchReasons || [],
      sourceTimestamp: item.updatedAt || item.createdAt || null,
      targetRoute: '/today-review',
    }));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return unavailableLabel;
  return new Date(value).toLocaleString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return unavailableLabel;
  return new Date(value).toLocaleDateString();
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return unavailableLabel;
  return new Intl.NumberFormat().format(value);
}

function formatStatus(value: string | null | undefined) {
  return value || unavailableLabel;
}

function labelize(value: string | null | undefined): string {
  if (!value) return unavailableLabel;
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return unavailableLabel;
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

function formatRatio(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return unavailableLabel;
  return value.toFixed(2);
}
