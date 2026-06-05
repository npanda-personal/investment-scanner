import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Paper, Grid, Divider, List, ListItem, ListItemText, ListItemIcon, Chip, Stack } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { TradePlanApi } from '../api';
import { TradePlanResultDto } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const fmtPercent = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : `${(value * 100).toFixed(1)}%`;
const fmtNumber = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : value.toFixed(2);
const fmtDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : 'N/A';
const currencyCode = (plan: TradePlanResultDto | null) => plan?.marketDataSnapshot?.currency || (plan?.region === 'IN' ? 'INR' : 'USD');
const fmtMoney = (plan: TradePlanResultDto | null, value: number | null | undefined) =>
  value === null || value === undefined ? 'N/A' : `${currencyCode(plan)} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const excludeRepeatedMessages = (items: string[], seen: Set<string>) =>
  items.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
const stageLabel = (stage: string) => stage.split('_').map((item) => item[0] + item.slice(1).toLowerCase()).join(' ');
const proofStageColor = (status: string) => {
  if (status === 'PASS') return 'success';
  if (status === 'LIMITED' || status === 'UNPROVEN') return 'warning';
  return 'error';
};

export const TradePlanDetail: React.FC = () => {
  const { instrumentId } = useParams<{ instrumentId: string }>();
  const [plan, setPlan] = useState<TradePlanResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const { scope } = useMarketScope();

  const fetchPlan = async () => {
    if (!instrumentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await TradePlanApi.getLatestForInstrument(instrumentId, { region: scope.region, assetType: scope.assetType });
      setPlan(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!instrumentId || !plan?.symbol) return;
    setGenerating(true);
    try {
      // Basic generate request without portfolio or specific config.
      const data = await TradePlanApi.generatePlan({
         instrumentId,
         symbol: plan.symbol,
         region: scope.region,
         assetType: scope.assetType,
      });
      setPlan(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [instrumentId, scope.region, scope.assetType]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  if (!plan) {
     return (
        <Box>
            <Typography variant="h6">No active plan found for this instrument.</Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              No scoped plan exists for {scope.region}/{scope.assetType}. Open a row from Latest Plans or run batch generation after Strategy Decision has eligible review candidates.
            </Alert>
            <Button variant="contained" sx={{ mt: 2 }} component={Link} to="/trade-plans">
               Back to Trade Plans
            </Button>
        </Box>
     );
  }

  const hasActiveReadinessBlockers = (plan.paperReadinessBlockers?.length || 0) > 0 || plan.blockers.length > 0 || plan.planStatus === 'BLOCKED';
  const showPaperReadinessReasons = plan.paperReadinessStatus === 'READY_FOR_PAPER_REVIEW'
    && !hasActiveReadinessBlockers
    && (plan.paperReadinessReasons?.length || 0) > 0;
  const displayedWarningMessages = new Set<string>();
  const displayedPaperReadinessBlockers = excludeRepeatedMessages(plan.paperReadinessBlockers || [], displayedWarningMessages);
  const displayedPlanBlockers = excludeRepeatedMessages(plan.blockers, displayedWarningMessages);
  const displayedWarnings = excludeRepeatedMessages(plan.warnings, displayedWarningMessages);
  const displayedDataGaps = excludeRepeatedMessages(plan.dataGaps, displayedWarningMessages);

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} component={Link} to="/trade-plans" sx={{ mb: 2 }}>
        Back to Trade Plans
      </Button>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Trade Plan: {plan.symbol}</Typography>
        <Button variant="outlined" onClick={handleGenerate} disabled={generating || !plan?.symbol}>
            {generating ? 'Regenerating...' : 'Regenerate Plan'}
        </Button>
      </Box>

      {plan.planStatus === 'BLOCKED' && (
         <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorOutlineIcon />}>
            <strong>Plan Blocked:</strong> This plan does not meet risk requirements or is invalid.
         </Alert>
      )}

      <Alert severity={plan.paperReadinessStatus === 'READY_FOR_PAPER_REVIEW' ? 'success' : plan.paperReadinessStatus === 'WATCH_ONLY' ? 'warning' : 'info'} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <strong>{plan.paperReadinessStatus === 'READY_FOR_PAPER_REVIEW' ? 'Paper Review Candidate' : plan.paperReadinessStatus || 'Readiness not classified'}</strong>
          {plan.paperReadinessBlockers?.slice(0, 2).map((blocker) => <Chip key={blocker} size="small" label={blocker} />)}
        </Stack>
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Plan Levels</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary" variant="body2">Entry Zone</Typography>
                <Typography variant="h6">
                   {plan.entryZone ? `${fmtMoney(plan, plan.entryZone.preferredEntryMin)} - ${fmtMoney(plan, plan.entryZone.preferredEntryMax)}` : 'N/A'}
                   {plan.entryZone?.quality && <Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>{plan.entryZone.quality}</Typography>}
                </Typography>
                <Typography variant="body2" color="text.secondary">{plan.entryZone?.rationale}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary" variant="body2">Stop Loss</Typography>
                <Typography variant="h6" color="error.main">
                   {plan.stopLoss ? fmtMoney(plan, plan.stopLoss.price) : 'N/A'}
                   {plan.stopLoss?.quality && <Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>{plan.stopLoss.quality}</Typography>}
                </Typography>
                <Typography variant="body2" color="text.secondary">{plan.stopLoss?.rationale}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary" variant="body2">Target</Typography>
                <Typography variant="h6" color="success.main">
                   {plan.target ? fmtMoney(plan, plan.target.price) : 'N/A'}
                   {plan.target?.quality && <Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>{plan.target.quality}</Typography>}
                </Typography>
                {plan.target?.method === 'REWARD_RISK_MULTIPLE' && <Chip size="small" label="Default 2R target" sx={{ mb: 0.5 }} />}
                <Typography variant="body2" color="text.secondary">{plan.target?.rationale}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary" variant="body2">Reward/Risk Ratio</Typography>
                <Typography variant="h6">
                   {plan.rewardRiskRatio.toFixed(2)}R
                </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Position Sizing & Impact</Typography>
            <Divider sx={{ mb: 2 }} />
            {plan.positionSizing ? (
                <>
                  <Typography variant="body1">Review Quantity: <strong>{plan.positionSizing.suggestedQuantity} shares</strong></Typography>
                  <Typography variant="body1">Estimated Value: {fmtMoney(plan, plan.positionSizing.estimatedPositionValue)}</Typography>
                  <Typography variant="body1">Max Risk Amount: {fmtMoney(plan, plan.positionSizing.maxRiskAmount)}</Typography>
                  <Typography variant="body1" color="text.secondary">Based on capital base of {fmtMoney(plan, plan.positionSizing.capitalBase)} and {plan.positionSizing.riskPercent}% risk.</Typography>
                  
                  {plan.portfolioImpact ? (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>Portfolio Impact</Typography>
                      <Typography variant="body2">Estimated Exposure If Reviewed: {plan.portfolioImpact.singlePositionExposureAfterTrade?.toFixed(2)}%</Typography>
                      {plan.portfolioImpact.warnings.map((w, i) => (
                        <Typography key={i} variant="body2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                          <WarningAmberIcon fontSize="small" sx={{ mr: 1 }}/> {w}
                        </Typography>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Portfolio impact not evaluated; using capital-base estimate only.</Typography>
                  )}
                </>
            ) : (
                <Typography color="text.secondary">Position sizing not available (requires capital base or portfolio configuration).</Typography>
            )}
            
            <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Invalidation Rules</Typography>
            <Divider sx={{ mb: 1 }} />
            <List dense>
               {plan.invalidationRules.map((rule, i) => (
                  <ListItem key={i} disablePadding>
                     <ListItemIcon sx={{ minWidth: 32 }}><CheckCircleOutlineIcon fontSize="small" color="primary" /></ListItemIcon>
                     <ListItemText primary={rule} />
                  </ListItem>
               ))}
            </List>
          </Paper>
        </Grid>

        {(displayedPaperReadinessBlockers.length > 0 || displayedWarnings.length > 0 || displayedPlanBlockers.length > 0 || displayedDataGaps.length > 0) && (
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" color="error.main" gutterBottom>Warnings, Blockers & Gaps</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <List dense>
                    {displayedPaperReadinessBlockers.map((b, i) => (
                        <ListItem key={`prb-${i}`} disablePadding>
                            <ListItemIcon sx={{ minWidth: 32 }}><ErrorOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                            <ListItemText primary={`Paper readiness: ${b}`} primaryTypographyProps={{ color: 'error.main' }} />
                        </ListItem>
                    ))}
                    {displayedPlanBlockers.map((b, i) => (
                        <ListItem key={`b-${i}`} disablePadding>
                            <ListItemIcon sx={{ minWidth: 32 }}><ErrorOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                            <ListItemText primary={b} primaryTypographyProps={{ color: 'error.main' }} />
                        </ListItem>
                    ))}
                    {displayedWarnings.map((w, i) => (
                        <ListItem key={`w-${i}`} disablePadding>
                            <ListItemIcon sx={{ minWidth: 32 }}><WarningAmberIcon fontSize="small" color="warning" /></ListItemIcon>
                            <ListItemText primary={w} />
                        </ListItem>
                    ))}
                    {displayedDataGaps.map((g, i) => (
                        <ListItem key={`g-${i}`} disablePadding>
                            <ListItemIcon sx={{ minWidth: 32 }}><WarningAmberIcon fontSize="small" color="disabled" /></ListItemIcon>
                            <ListItemText primary={`Missing data: ${g}`} primaryTypographyProps={{ color: 'text.secondary' }} />
                        </ListItem>
                    ))}
                    </List>
                </Paper>
            </Grid>
        )}

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Proof Snapshot</Typography>
            <Divider sx={{ mb: 2 }} />
            {!plan.strategyProofSnapshot && (
              <Alert severity="warning" sx={{ mb: 2 }}>Plan is not paper-review ready because proof snapshot is missing.</Alert>
            )}
            {plan.strategyProofSnapshot?.proofWarnings?.some((item) => item.includes('Backtest summary missing')) && (
              <Alert severity="warning" sx={{ mb: 2 }}>Backtest summary missing for selected timeframe.</Alert>
            )}
            {!plan.dataQualitySnapshot || plan.dataQualitySnapshot.status === 'MISSING' ? (
              <Alert severity="warning" sx={{ mb: 2 }}>Data quality snapshot missing.</Alert>
            ) : null}
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Strategy Proof</Typography>
                <Typography variant="body2">Rating: {plan.strategyProofSnapshot?.strategyRating || plan.strategyRating || 'UNPROVEN'}</Typography>
                <Typography variant="body2">Label: {plan.strategyProofSnapshot?.readinessLabel || plan.readinessLabel || 'RESEARCH_ONLY'}</Typography>
                <Typography variant="body2">Proof: {plan.strategyProofSnapshot?.proofStatus || 'MISSING'}</Typography>
                <Typography variant="body2">Timeframe: {plan.backtestTimeframe || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Backtest Summary</Typography>
                <Typography variant="body2">CAGR: {fmtPercent(plan.backtestSummary?.cagr)}</Typography>
                <Typography variant="body2">Drawdown: {fmtPercent(plan.backtestSummary?.maxDrawdown)}</Typography>
                <Typography variant="body2">Sharpe: {fmtNumber(plan.backtestSummary?.sharpe)}</Typography>
                <Typography variant="body2">Trades: {plan.backtestSummary?.tradeCount ?? 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Decision Snapshot</Typography>
                <Typography variant="body2">Decision: {plan.strategyDecisionSnapshot?.decision || 'N/A'}</Typography>
                <Typography variant="body2">Confidence: {plan.strategyDecisionSnapshot?.confidence || 'N/A'}</Typography>
                <Typography variant="body2">Market Gate: {plan.strategyDecisionSnapshot?.marketGate || 'N/A'}</Typography>
                <Typography variant="body2">Score: {plan.strategyDecisionSnapshot?.decisionScore ?? 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Market & Quality</Typography>
                <Typography variant="body2">Latest Price: {fmtMoney(plan, plan.marketDataSnapshot?.latestPrice ?? plan.latestPrice)}</Typography>
                <Typography variant="body2">Price Time: {fmtDate(plan.marketDataSnapshot?.latestPriceTimestamp || plan.latestPriceTimestamp)}</Typography>
                <Typography variant="body2">Coverage: {plan.dataQualitySnapshot?.coverageStatus || 'MISSING'}</Typography>
                <Typography variant="body2">Liquidity: {plan.dataQualitySnapshot?.liquidityStatus || 'MISSING'}</Typography>
              </Grid>
            </Grid>
            {showPaperReadinessReasons && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Paper Readiness Reasons</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {plan.paperReadinessReasons?.map((reason) => <Chip key={reason} size="small" label={reason} />)}
                </Stack>
              </Box>
            )}
            {plan.paperReadinessProofChain && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Paper Readiness Proof Chain</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                  {plan.paperReadinessProofChain.stages.map((stage) => (
                    <Chip
                      key={stage.stage}
                      size="small"
                      color={proofStageColor(stage.status) as any}
                      variant={stage.status === 'PASS' ? 'outlined' : 'filled'}
                      label={`${stageLabel(stage.stage)}: ${stage.status}`}
                    />
                  ))}
                </Stack>
                <List dense disablePadding>
                  {plan.paperReadinessProofChain.prioritizedBlockers.slice(0, 4).map((blocker) => (
                    <ListItem key={blocker.category} disablePadding>
                      <ListItemText primary={`${blocker.priority}. ${blocker.nextActionLabel}`} secondary={`${blocker.sourceModule} - ${blocker.count} affected`} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
