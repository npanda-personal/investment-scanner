import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  Paper,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMemo, useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useDailyOverviewDashboard } from '../hooks/useDailyOverviewDashboard';
import type {
  CandidateGroupKey,
  CandidateGroupSummary,
  MarketMoverRange,
  MarketMoverRow,
  TodayReviewCandidateGroupSet,
} from '../types';

const candidateGroupOrder: CandidateGroupKey[] = ['bullishReview', 'bearishReview', 'exitRiskReview'];
const candidateGroupLabels: Record<CandidateGroupKey, string> = {
  bullishReview: 'Bullish candidates',
  bearishReview: 'Bearish pressure',
  exitRiskReview: 'Exit or risk review',
};

const moverRanges: MarketMoverRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];
const unavailableLabel = 'Unavailable';

export function DailyOverviewDashboardPage() {
  const dashboard = useDailyOverviewDashboard();
  const [candidateGroup, setCandidateGroup] = useState<CandidateGroupKey>('bullishReview');
  const [moverRange, setMoverRange] = useState<MarketMoverRange>('1D');

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

  const candidateSummaries: Record<CandidateGroupKey, CandidateGroupSummary> = useMemo(() => ({
    bullishReview: {
      key: 'bullishReview',
      label: candidateGroupLabels.bullishReview,
      count: todayReviewGroups.bullishReview.length,
      rows: mapTodayReviewRows(todayReviewGroups.bullishReview),
    },
    bearishReview: {
      key: 'bearishReview',
      label: candidateGroupLabels.bearishReview,
      count: todayReviewGroups.bearishReview.length,
      rows: mapTodayReviewRows(todayReviewGroups.bearishReview),
    },
    exitRiskReview: {
      key: 'exitRiskReview',
      label: candidateGroupLabels.exitRiskReview,
      count: todayReviewGroups.exitRiskReview.length,
      rows: mapTodayReviewRows(todayReviewGroups.exitRiskReview),
    },
  }), [todayReviewGroups]);

  const moverSummary = marketMovers?.ranges.find((item) => item.range === moverRange) ?? null;
  const activeCandidateGroup = candidateSummaries[candidateGroup];
  const hotStocks = useMemo(() => [
    ...todayReviewGroups.bullishReview,
    ...todayReviewGroups.bearishReview,
  ].sort((left, right) => right.confidenceScore - left.confidenceScore).slice(0, 8), [todayReviewGroups]);

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
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} flexWrap="wrap" useFlexGap>
              <Chip label={`${dashboard.scope.region} / ${dashboard.scope.assetType}`} color="primary" variant="outlined" />
              <Chip label={`Today Review: ${formatStatus(todayReview?.run?.status)}`} variant="outlined" />
              <Chip label={`Data through: ${formatDate(todayReview?.run?.dataThroughDate)}`} variant="outlined" />
              <Chip label={`Updated: ${formatDateTime(dashboard.latestSourceTimestamp)}`} variant="outlined" />
            </Stack>
          </Stack>
        </Paper>

        {(dashboard.critical.todayReview.error || dashboard.critical.marketMovers.error) && (
          <Alert severity="warning">
            {dashboard.critical.todayReview.error || dashboard.critical.marketMovers.error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={1}>
                  <Typography variant="h6">Gainers And Losers</Typography>
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
                {!dashboard.critical.marketMovers.loading && moverSummary?.warnings?.[0] && (
                  <Alert severity="info">{moverSummary.warnings[0]}</Alert>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <MoverList title={`Top ${moverRange} Gainers`} icon={<TrendingUpIcon color="success" />} rows={moverSummary?.gainers ?? []} tone="success.main" />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <MoverList title={`Top ${moverRange} Losers`} icon={<TrendingDownIcon color="error" />} rows={moverSummary?.losers ?? []} tone="error.main" />
                  </Grid>
                </Grid>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Today At A Glance</Typography>
                {dashboard.criticalLoading ? (
                  <Stack spacing={1}>
                    <Skeleton variant="rounded" height={34} />
                    <Skeleton variant="rounded" height={34} />
                    <Skeleton variant="rounded" height={34} />
                  </Stack>
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
                <Typography variant="body2" color="text.secondary">
                  Market breadth: {formatPercent(marketContext?.breadth?.advanceDeclineRatio)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Regime: {formatStatus(marketContext?.regime?.regime)}
                </Typography>
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
                  <ToggleButtonGroup
                    value={candidateGroup}
                    exclusive
                    onChange={(_event, value: CandidateGroupKey | null) => {
                      if (value) setCandidateGroup(value);
                    }}
                    size="small"
                    sx={{ flexWrap: 'wrap', gap: 1 }}
                  >
                    {candidateGroupOrder.map((groupKey) => (
                      <ToggleButton key={groupKey} value={groupKey}>
                        {candidateGroupLabels[groupKey]} ({formatNumber(candidateSummaries[groupKey].count)})
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Stack>
                {dashboard.critical.todayReview.loading && <LinearProgress />}
                {!dashboard.critical.todayReview.loading && activeCandidateGroup.rows.length === 0 && (
                  <Alert severity="info">No {activeCandidateGroup.label.toLowerCase()} are currently published for this scope.</Alert>
                )}
                {!dashboard.critical.todayReview.loading && activeCandidateGroup.rows.length > 0 && (
                  <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    {activeCandidateGroup.rows.slice(0, 8).map((row, index) => (
                      <Box key={row.id}>
                        <ListItem sx={{ py: 0.75, gap: 1.25 }}>
                          <Box sx={{ minWidth: 90 }}>
                            <Typography variant="body2" fontWeight={800} noWrap>{row.symbol}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{row.subLabel}</Typography>
                          </Box>
                          <Tooltip title={row.reasonSummary} arrow>
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                              {row.reasonSummary}
                            </Typography>
                          </Tooltip>
                        </ListItem>
                        {index < Math.min(activeCandidateGroup.rows.length, 8) - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                )}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Hot Stocks</Typography>
                {dashboard.critical.todayReview.loading && <LinearProgress />}
                {!dashboard.critical.todayReview.loading && hotStocks.length === 0 && (
                  <Alert severity="info">No high-confidence bullish or bearish candidates are available yet.</Alert>
                )}
                <Grid container spacing={1}>
                  {hotStocks.map((item) => (
                    <Grid key={item.id} item xs={12} sm={6}>
                      <Paper variant="outlined" sx={{ p: 1.25, height: '100%' }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" justifyContent="space-between" gap={1}>
                            <Typography variant="body2" fontWeight={800} noWrap>{item.symbol}</Typography>
                            <Chip size="small" label={item.direction} color={item.direction === 'LONG' ? 'success' : 'error'} variant="outlined" />
                          </Stack>
                          <Typography variant="caption" color="text.secondary" noWrap>{item.companyName || item.strategyCode}</Typography>
                          <Typography variant="body2" fontWeight={700}>{item.grade} · {Math.round(item.confidenceScore)}</Typography>
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
            {dashboard.deferred.marketContext.loading && <LinearProgress />}
            {dashboard.deferred.marketContext.error && <Alert severity="warning">{dashboard.deferred.marketContext.error}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <SectorList title="Leading Sectors" rows={marketContext?.topSectors ?? []} />
              </Grid>
              <Grid item xs={12} md={6}>
                <SectorList title="Weak Sectors" rows={marketContext?.weakSectors ?? []} />
              </Grid>
            </Grid>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}

function MoverList({ title, icon, rows, tone }: { title: string; icon: ReactNode; rows: MarketMoverRow[]; tone: string }) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" gap={1}>
        {icon}
        <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
      </Stack>
      {rows.length === 0 ? (
        <Alert severity="info">No rows available.</Alert>
      ) : (
        <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {rows.map((row, index) => (
            <Box key={`${title}-${row.instrumentId}`}>
              <ListItem sx={{ py: 0.75, gap: 1.25 }}>
                <Box sx={{ minWidth: 88 }}>
                  <Typography variant="body2" fontWeight={800} noWrap>{row.symbol}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{row.sector || 'Sector N/A'}</Typography>
                </Box>
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

function SectorList({ title, rows }: { title: string; rows: Array<{ sector: string; return1M: number | null; return3M: number | null; return6M: number | null; relativeStrengthScore: number }> }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
      {rows.length === 0 ? (
        <Alert severity="info">No sector rows available.</Alert>
      ) : (
        <List dense disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {rows.slice(0, 6).map((row, index) => (
            <Box key={`${title}-${row.sector}`}>
              <ListItem sx={{ py: 0.75, gap: 1.25 }}>
                <Typography variant="body2" fontWeight={800} noWrap sx={{ flex: 1 }}>{row.sector}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  1M {formatPercent(row.return1M)} · 3M {formatPercent(row.return3M)} · 6M {formatPercent(row.return6M)}
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

function mapTodayReviewRows(rows: TodayReviewCandidateGroupSet[CandidateGroupKey]): CandidateGroupSummary['rows'] {
  return [...rows]
    .sort((left, right) => right.confidenceScore - left.confidenceScore)
    .map((item) => ({
      id: item.id,
      symbol: item.symbol,
      reasonSummary: item.reasonSummary,
      subLabel: `${item.grade} · ${Math.round(item.confidenceScore)} · ${item.strategyCode}`,
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

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return unavailableLabel;
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}
