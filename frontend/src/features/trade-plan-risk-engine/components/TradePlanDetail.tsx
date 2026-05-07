import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Paper, Grid, Divider, List, ListItem, ListItemText, ListItemIcon, Chip, Stack } from '@mui/material';
import { useParams } from 'react-router-dom';
import { TradePlanApi } from '../api';
import { TradePlanResultDto } from '../types';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export const TradePlanDetail: React.FC = () => {
  const { instrumentId } = useParams<{ instrumentId: string }>();
  const [plan, setPlan] = useState<TradePlanResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchPlan = async () => {
    if (!instrumentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await TradePlanApi.getLatestForInstrument(instrumentId);
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
         symbol: plan.symbol || instrumentId, // Will fail if symbol is not known. Usually instrumentId is symbol in MVP or symbol is passed via state.
         capitalBase: 10000, // default fallback for now
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
  }, [instrumentId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  if (!plan) {
     return (
        <Box>
            <Typography variant="h6">No active plan found for this instrument.</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={handleGenerate} disabled={generating}>
               {generating ? 'Generating...' : 'Generate Trade Plan'}
            </Button>
        </Box>
     );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Trade Plan: {plan.symbol}</Typography>
        <Button variant="outlined" onClick={handleGenerate} disabled={generating}>
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
                   {plan.entryZone ? `${plan.entryZone.preferredEntryMin.toFixed(2)} - ${plan.entryZone.preferredEntryMax.toFixed(2)}` : 'N/A'}
                   {plan.entryZone?.quality && <Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>{plan.entryZone.quality}</Typography>}
                </Typography>
                <Typography variant="body2" color="text.secondary">{plan.entryZone?.rationale}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary" variant="body2">Stop Loss</Typography>
                <Typography variant="h6" color="error.main">
                   {plan.stopLoss ? plan.stopLoss.price.toFixed(2) : 'N/A'}
                   {plan.stopLoss?.quality && <Typography component="span" variant="caption" sx={{ ml: 1, px: 1, py: 0.5, bgcolor: 'action.hover', borderRadius: 1 }}>{plan.stopLoss.quality}</Typography>}
                </Typography>
                <Typography variant="body2" color="text.secondary">{plan.stopLoss?.rationale}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
                <Typography color="text.secondary" variant="body2">Target</Typography>
                <Typography variant="h6" color="success.main">
                   {plan.target ? plan.target.price.toFixed(2) : 'N/A'}
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
                  <Typography variant="body1">Estimated Value: ${plan.positionSizing.estimatedPositionValue.toFixed(2)}</Typography>
                  <Typography variant="body1">Max Risk Amount: ${plan.positionSizing.maxRiskAmount.toFixed(2)}</Typography>
                  <Typography variant="body1" color="text.secondary">Based on capital base of ${plan.positionSizing.capitalBase.toFixed(2)} and {plan.positionSizing.riskPercent}% risk.</Typography>
                  
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

        {((plan.paperReadinessBlockers?.length || 0) > 0 || plan.warnings.length > 0 || plan.blockers.length > 0 || plan.dataGaps.length > 0) && (
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" color="error.main" gutterBottom>Warnings, Blockers & Gaps</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <List dense>
                    {plan.paperReadinessBlockers?.map((b, i) => (
                        <ListItem key={`prb-${i}`} disablePadding>
                            <ListItemIcon sx={{ minWidth: 32 }}><ErrorOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                            <ListItemText primary={`Paper readiness: ${b}`} primaryTypographyProps={{ color: 'error.main' }} />
                        </ListItem>
                    ))}
                    {plan.blockers.map((b, i) => (
                        <ListItem key={`b-${i}`} disablePadding>
                            <ListItemIcon sx={{ minWidth: 32 }}><ErrorOutlineIcon fontSize="small" color="error" /></ListItemIcon>
                            <ListItemText primary={b} primaryTypographyProps={{ color: 'error.main' }} />
                        </ListItem>
                    ))}
                    {plan.warnings.map((w, i) => (
                        <ListItem key={`w-${i}`} disablePadding>
                            <ListItemIcon sx={{ minWidth: 32 }}><WarningAmberIcon fontSize="small" color="warning" /></ListItemIcon>
                            <ListItemText primary={w} />
                        </ListItem>
                    ))}
                    {plan.dataGaps.map((g, i) => (
                        <ListItem key={`g-${i}`} disablePadding>
                            <ListItemIcon sx={{ minWidth: 32 }}><WarningAmberIcon fontSize="small" color="disabled" /></ListItemIcon>
                            <ListItemText primary={`Missing data: ${g}`} primaryTypographyProps={{ color: 'text.secondary' }} />
                        </ListItem>
                    ))}
                    </List>
                </Paper>
            </Grid>
        )}
      </Grid>
    </Box>
  );
};
