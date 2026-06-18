import React from 'react';
import { Alert, Box, Button, Chip, Divider, Drawer, Snackbar, Stack, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { AddSignalToPortfolioDialog } from './AddSignalToPortfolioDialog';
import { AddToWatchlistDialog } from '@/features/watchlist-management';
import { CreateAlertDialog } from '@/features/alerts-monitoring';
import { DataTable, StatusBadge, type SortDirection } from '@/shared/components';
import type { SignalResult } from '../types';
import { buildSignalColumns } from './signalTableColumns';
import { formatDate } from './signalTableFormat';

type SignalTableProps = {
  signals: SignalResult[];
  totalCount?: number;
  loading?: boolean;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: SortDirection;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sortBy: string, direction: SortDirection) => void;
  strategyContextLoaded?: boolean;
  bannedSymbols?: Set<string>;
  emptyMessage?: string;
};

export function SignalTable({ signals, totalCount, loading, page, pageSize, sortBy, sortDirection, onPageChange, onPageSizeChange, onSortChange, strategyContextLoaded = false, bannedSymbols, emptyMessage }: SignalTableProps) {
  const navigate = useNavigate();
  const [selectedSignal, setSelectedSignal] = React.useState<SignalResult | null>(null);
  const [portfolioSignal, setPortfolioSignal] = React.useState<SignalResult | null>(null);
  const [watchlistSignal, setWatchlistSignal] = React.useState<SignalResult | null>(null);
  const [alertSignal, setAlertSignal] = React.useState<SignalResult | null>(null);
  const [successPortfolioId, setSuccessPortfolioId] = React.useState<string | null>(null);
  const [successWatchlistId, setSuccessWatchlistId] = React.useState<string | null>(null);

  const columns = buildSignalColumns({
    navigate,
    strategyContextLoaded,
    bannedSymbols,
    onAddWatchlist: setWatchlistSignal,
    onAddPortfolio: setPortfolioSignal,
    onCreateAlert: setAlertSignal,
  });

  return (
    <>
      <DataTable
        columns={columns}
        rows={signals}
        getRowId={(signal) => signal.id || `${signal.instrument_id}-${signal.generated_at}`}
        loading={loading}
        emptyMessage={emptyMessage || 'No signals match this view.'}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount ?? signals.length}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onRowClick={(signal) => setSelectedSignal(signal)}
      />
      <Drawer
        anchor="right"
        open={Boolean(selectedSignal)}
        onClose={() => setSelectedSignal(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, maxWidth: '100%', p: 3 } }}
      >
        {selectedSignal && (
          <Stack spacing={2}>
            <Box>
              <Typography variant="overline" color="text.secondary">Raw Signal Diagnostics</Typography>
              <Typography variant="h5" fontWeight={700}>{selectedSignal.symbol}</Typography>
              <Typography variant="body2" color="text.secondary">{selectedSignal.company_name || 'Unknown company'}</Typography>
            </Box>

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <StatusBadge label={selectedSignal.direction} />
              <StatusBadge label={selectedSignal.confidence} />
              <StatusBadge label={selectedSignal.data_status} />
              <Chip size="small" variant="outlined" label={`Score ${selectedSignal.score}`} />
            </Stack>

            <Typography variant="body2">{selectedSignal.explanation}</Typography>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Generation Audit</Typography>
              <Stack spacing={0.75}>
                <Typography variant="body2" color="text.secondary">Model: {selectedSignal.modelVersion || 'N/A'}</Typography>
                <Typography variant="body2" color="text.secondary">Ruleset: {selectedSignal.rulesetVersion || '—'}</Typography>
                <Typography variant="body2" color="text.secondary">Generated date: {formatDate(selectedSignal.generatedDate || selectedSignal.generated_at)}</Typography>
                <Typography variant="body2" color="text.secondary">Source data date: {formatDate(selectedSignal.sourceDataDate)}</Typography>
                <Typography variant="body2" color="text.secondary">Source price date: {formatDate(selectedSignal.sourcePriceDate)}</Typography>
                <Typography variant="body2" color="text.secondary">Write status: {selectedSignal.writeStatus || 'N/A'}</Typography>
                <Typography variant="body2" color="text.secondary">Audit status: {selectedSignal.auditStatus || 'N/A'}</Typography>
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Calibration</Typography>
              {selectedSignal.calibrationStatus === 'CALIBRATED' && selectedSignal.calibratedScore != null ? (
                <Stack spacing={0.75}>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    <Typography variant="body2" color="text.secondary">Raw score: {selectedSignal.score}</Typography>
                    <Typography variant="body2" color="text.secondary">→ Calibrated: <strong>{selectedSignal.calibratedScore}</strong></Typography>
                    {selectedSignal.reliabilityTier && (
                      <Chip size="small" label={selectedSignal.reliabilityTier} color={selectedSignal.reliabilityTier === 'FULL' ? 'success' : 'warning'} />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">Horizon: {selectedSignal.calibrationHorizon || 'N/A'} · Samples: {selectedSignal.calibrationSampleSize ?? 'N/A'}</Typography>
                  <Typography variant="body2" color="text.secondary">Lifecycle: {selectedSignal.lifecycleState || 'N/A'}</Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {selectedSignal.calibrationStatus
                    ? `Calibration ${selectedSignal.calibrationStatus.toLowerCase()} — raw score shown, no adjustment applied.`
                    : 'Calibration not yet available for this signal.'}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Track Record (historical outcomes)</Typography>
              {selectedSignal.cohortWinRate != null ? (
                <Stack spacing={0.75}>
                  <Typography variant="body2" color="text.secondary">
                    Signals like this (same direction &amp; score band) resolved in their signaled direction{' '}
                    <strong>{Math.round(selectedSignal.cohortWinRate * 100)}%</strong> of the time over{' '}
                    {selectedSignal.cohortMetricsHorizon || '20D'} (n={selectedSignal.cohortDirectionalSampleSize ?? 0} directional).
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                    {selectedSignal.cohortAvgReturnPercent != null && (
                      <Typography variant="body2" color="text.secondary">Avg forward return: {selectedSignal.cohortAvgReturnPercent.toFixed(2)}%</Typography>
                    )}
                    {selectedSignal.cohortWinRateConfidence && (
                      <Chip
                        size="small"
                        label={`${selectedSignal.cohortWinRateConfidence} confidence`}
                        color={selectedSignal.cohortWinRateConfidence === 'HIGH' ? 'success' : selectedSignal.cohortWinRateConfidence === 'MEDIUM' ? 'default' : 'warning'}
                        variant="outlined"
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.disabled">Past matured outcomes for this cohort — context for the score, not a forecast.</Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No matured outcomes yet for this signal&apos;s cohort.</Typography>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Scoring Inputs</Typography>
              {selectedSignal.scoringInputSummary ? (
                <Stack spacing={0.75}>
                  <Typography variant="body2" color="text.secondary">Price bars: {selectedSignal.scoringInputSummary.priceBarsUsed}</Typography>
                  <Typography variant="body2" color="text.secondary">Latest close: {formatDate(selectedSignal.scoringInputSummary.latestCloseDate)}</Typography>
                  <Typography variant="body2" color="text.secondary">SMA50: {selectedSignal.scoringInputSummary.hasSma50 ? 'Yes' : 'No'} | SMA200: {selectedSignal.scoringInputSummary.hasSma200 ? 'Yes' : 'No'} | Volume: {selectedSignal.scoringInputSummary.hasVolume ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2" color="text.secondary">Fundamentals: {selectedSignal.scoringInputSummary.fundamentalsAvailable ? 'Yes' : 'No'} | Strategy context: {selectedSignal.scoringInputSummary.strategyContextLoaded ? 'Yes' : 'No'}</Typography>
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">Legacy signal has no scoring input snapshot.</Typography>}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Data Quality Eligibility</Typography>
              {selectedSignal.dataQualityEligibility ? (
                <Stack spacing={0.75}>
                  <Typography variant="body2" color="text.secondary">Filter applied: {selectedSignal.dataQualityEligibility.filterApplied ? 'Yes' : 'No'} | Eligible: {selectedSignal.dataQualityEligibility.eligible === null ? 'Unknown' : selectedSignal.dataQualityEligibility.eligible ? 'Yes' : 'No'}</Typography>
                  <Typography variant="body2" color="text.secondary">Coverage: {selectedSignal.dataQualityEligibility.coverageStatus || 'N/A'} | Readiness: {selectedSignal.dataQualityEligibility.signalReadinessStatus || 'N/A'} | Liquidity: {selectedSignal.dataQualityEligibility.liquidityStatus || 'N/A'}</Typography>
                  {selectedSignal.dataQualityEligibility.excludedReason && <Typography variant="body2" color="text.secondary">Reason: {selectedSignal.dataQualityEligibility.excludedReason}</Typography>}
                </Stack>
              ) : <Typography variant="body2" color="text.secondary">Legacy signal has no eligibility snapshot.</Typography>}
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Triggered Factors</Typography>
              {selectedSignal.triggered_signals.length ? selectedSignal.triggered_signals.map((item) => (
                <Typography key={`${item.category}-${item.code}`} variant="body2" color="text.secondary">- {item.label} ({item.category})</Typography>
              )) : <Typography variant="body2" color="text.secondary">No triggered factors.</Typography>}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Negative Factors</Typography>
              {selectedSignal.negative_signals.length ? selectedSignal.negative_signals.map((item) => (
                <Typography key={`${item.category}-${item.code}`} variant="body2" color="text.secondary">- {item.label} ({item.category})</Typography>
              )) : <Typography variant="body2" color="text.secondary">No negative factors.</Typography>}
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Warnings</Typography>
              {selectedSignal.warnings?.length ? selectedSignal.warnings.map((item) => (
                <Typography key={item} variant="body2" color="text.secondary">- {item}</Typography>
              )) : <Typography variant="body2" color="text.secondary">No warnings.</Typography>}
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Strategy Context</Typography>
              {!strategyContextLoaded ? (
                <Typography variant="body2" color="text.secondary">Strategy context is not loaded for this table view. Enable "Show strategy context" to inspect matches and blockers.</Typography>
              ) : (
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Matches</Typography>
                    {selectedSignal.strategyMatches?.length ? selectedSignal.strategyMatches.map((match) => (
                      <Box key={`${match.strategyCode}-${match.strategyVersion}`} sx={{ mt: 0.75 }}>
                        <Typography variant="body2">{match.strategyCode} v{match.strategyVersion} | {match.decision} | Score {match.score}</Typography>
                        {match.reasons.slice(0, 4).map((reason) => <Typography key={reason} variant="caption" display="block" color="text.secondary">- {reason}</Typography>)}
                      </Box>
                    )) : <Typography variant="body2" color="text.secondary">No Strategy Framework match for this raw signal.</Typography>}
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>Blocked Strategies</Typography>
                    {selectedSignal.blockedStrategies?.length ? selectedSignal.blockedStrategies.map((blocked) => (
                      <Box key={`${blocked.strategyCode}-${blocked.strategyVersion}`} sx={{ mt: 0.75 }}>
                        <Typography variant="body2">{blocked.strategyCode} v{blocked.strategyVersion}</Typography>
                        <Typography variant="caption" display="block" color="text.secondary">{blocked.reason}</Typography>
                      </Box>
                    )) : <Typography variant="body2" color="text.secondary">No blocked Strategy Framework matches.</Typography>}
                  </Box>
                </Stack>
              )}
            </Box>

            <Divider />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => navigate(`/research/stocks/${selectedSignal.instrument_id}`)}>Open Research</Button>
              <Button variant="contained" onClick={() => navigate(`/strategy?instrumentId=${selectedSignal.instrument_id}`)}>Review Strategy Decision</Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
      {portfolioSignal && (
        <AddSignalToPortfolioDialog open signal={portfolioSignal} onClose={() => setPortfolioSignal(null)} onAdded={(portfolioId) => setSuccessPortfolioId(portfolioId)} />
      )}
      {watchlistSignal && (
        <AddToWatchlistDialog open instrumentId={watchlistSignal.instrument_id} symbol={watchlistSignal.symbol} companyName={watchlistSignal.company_name} onClose={() => setWatchlistSignal(null)} onAdded={(watchlistId) => setSuccessWatchlistId(watchlistId)} />
      )}
      {alertSignal && (
        <CreateAlertDialog
          open
          onClose={() => setAlertSignal(null)}
          defaults={{
            name: `${alertSignal.symbol} signal score above ${alertSignal.score}`,
            type: 'SIGNAL_SCORE_ABOVE',
            scope: 'STOCK',
            instrumentId: alertSignal.instrument_id,
            condition: { threshold: alertSignal.score },
          }}
        />
      )}
      <Snackbar open={Boolean(successPortfolioId)} autoHideDuration={5000} onClose={() => setSuccessPortfolioId(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessPortfolioId(null)}>
          Added to portfolio. <Button color="inherit" component={Link} to={successPortfolioId ? `/portfolios/${successPortfolioId}` : '/portfolios'} size="small">Open</Button>
        </Alert>
      </Snackbar>
      <Snackbar open={Boolean(successWatchlistId)} autoHideDuration={5000} onClose={() => setSuccessWatchlistId(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessWatchlistId(null)}>
          Added to watchlist. <Button color="inherit" component={Link} to={successWatchlistId ? `/watchlists/${successWatchlistId}` : '/watchlists'} size="small">Open</Button>
        </Alert>
      </Snackbar>
    </>
  );
}
