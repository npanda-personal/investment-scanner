import React, { useState, useEffect } from 'react';
import {
  Box,
  Tab,
  Tabs,
  Typography,
  Paper,
  Alert,
  Grid,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  MenuItem,
  TextField,
  LinearProgress,
} from '@mui/material';
import {
  LockOutlined,
  CheckCircleOutline,
  ErrorOutline,
  PlayArrow,
  WarningAmberOutlined,
  InfoOutlined,
} from '@mui/icons-material';
import { fetchMarketGate, evaluateStrategy, fetchCandidates, fetchExits, fetchLatestDecision, fetchModel, fetchHistory } from '../api/strategyDecisionApi';
import type { MarketGateResponse, StrategyDecisionDto, StrategyModel } from '../types';
import { PageHeader, StatusBadge, DataTable, type DataTableColumn } from '@/shared/components';
import { InstrumentSearchSelect } from '@/shared/components/EntitySearchSelect';
import { Link } from 'react-router-dom';
import { useMarketScope } from '@/contexts/MarketScopeContext';

const STRATEGY_DECISION_BATCH_SIZE = 100;

const titleCase = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDecision = (value: string) => {
  if (value === 'TRADE_CANDIDATE') return 'Review Candidate';
  if (value === 'EXIT_CANDIDATE') return 'Exit Review';
  if (value === 'REDUCE_RISK') return 'Reduce Risk';
  if (value === 'INSUFFICIENT_DATA') return 'Insufficient Data';
  return titleCase(value);
};

const formatAction = (value: string) => {
  if (value === 'CONSIDER_ENTRY') return 'Consider Review';
  if (value === 'AVOID_NEW_ENTRY') return 'Avoid New Review';
  if (value === 'WAIT_FOR_CONFIRMATION') return 'Wait For Confirmation';
  if (value === 'WAIT_FOR_PULLBACK') return 'Wait For Pullback';
  if (value === 'REVIEW_EXIT') return 'Review Exit Risk';
  if (value === 'REDUCE_EXPOSURE') return 'Reduce Exposure Risk';
  return titleCase(value);
};

const formatAllowedAction = (value: string) => {
  if (value === 'NEW_LONG_TRADES_ALLOWED') return 'New long candidates may be reviewed';
  if (value === 'ONLY_HIGH_QUALITY_SETUPS') return 'Only high-quality setups should be reviewed';
  if (value === 'MANAGE_EXISTING_POSITIONS_ONLY') return 'Manage existing positions only';
  if (value === 'NO_NEW_LONG_TRADES') return 'No new long candidates';
  return titleCase(value);
};

const symbolLinkSx = {
  color: 'primary.main',
  fontWeight: 600,
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
};

const StrategyDecisionDashboard: React.FC = () => {
  const { scope } = useMarketScope();
  const [activeTab, setActiveTab] = useState(0);
  const [gate, setGate] = useState<MarketGateResponse | null>(null);
  const [candidates, setCandidates] = useState<StrategyDecisionDto[]>([]);
  const [waitWatch, setWaitWatch] = useState<StrategyDecisionDto[]>([]);
  const [exits, setExits] = useState<StrategyDecisionDto[]>([]);
  const [lookupResult, setLookupResult] = useState<StrategyDecisionDto | null>(null);
  const [lookupHistory, setLookupHistory] = useState<StrategyDecisionDto[]>([]);
  const [model, setModel] = useState<StrategyModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [evaluationSummary, setEvaluationSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookupInstrument, setLookupInstrument] = useState<any | null>(null);

  // Pagination and filter state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [countryFilter, setCountryFilter] = useState<string>('SCOPE');

  // Evaluation form state
  const [evalStrategy, setEvalStrategy] = useState<string>('ALL');
  const loadData = async () => {
    setLoading(true);
    try {
      const selectedRegion = countryFilter === 'SCOPE' ? scope.region : (countryFilter === 'ALL' ? undefined : countryFilter);
      
      const [gateRes, candRes, waitRes, watchRes, exitRes, modelRes] = await Promise.all([
        fetchMarketGate({ region: scope.region }),
        fetchCandidates({ 
          limit: pageSize, 
          offset: page * pageSize, 
          decision: 'TRADE_CANDIDATE',
          region: selectedRegion,
          assetType: scope.assetType
        }),
        fetchCandidates({ 
          limit: 50, 
          decision: 'WAIT',
          region: selectedRegion,
          assetType: scope.assetType
        }),
        fetchCandidates({
          limit: 50,
          decision: 'WATCH',
          region: selectedRegion,
          assetType: scope.assetType
        }),
        fetchExits({ region: scope.region, assetType: scope.assetType }),
        fetchModel(),
      ]);
      setGate(gateRes);
      setCandidates(candRes.results);
      setTotalCount(candRes.total);
      setWaitWatch([...watchRes.results, ...waitRes.results]);
      setExits(exitRes);
      setModel(modelRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load strategy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize, activeTab, countryFilter, scope.region, scope.assetType]);

  useEffect(() => {
    setPage(0);
  }, [scope.region, scope.assetType, countryFilter]);

  const runEvaluate = async () => {
    setRunning(true);
    setProgress(0);
    setEvaluationSummary(null);
    setError(null);
    try {
      let offset = 0;
      const batchSize = STRATEGY_DECISION_BATCH_SIZE;
      let hasMore = true;
      let processedCount = 0;
      let generatedCount = 0;
      let failedCount = 0;
      let warningCount = 0;
      let totalCount = 0;
      let batches = 0;

      while (hasMore) {
        const response = await evaluateStrategy({ 
          strategy: evalStrategy as any, 
          batchSize, 
          offset,
          region: scope.region,
          assetType: scope.assetType,
        });

        batches += 1;
        processedCount += response.processedCount;
        generatedCount += response.generatedCount;
        failedCount += response.failedCount;
        warningCount += response.warnings.length;
        totalCount = response.totalCount;
        offset = response.nextOffset ?? offset + response.processedCount;
        hasMore = response.hasMore;
        
        const currentProgress = response.totalCount > 0 ? (Math.min(offset, response.totalCount) / response.totalCount) * 100 : 100;
        setProgress(hasMore ? currentProgress : 100);
        setEvaluationSummary(`Processed ${processedCount} / ${response.totalCount}. Generated ${generatedCount}, failed ${failedCount}, warnings ${warningCount}.`);
        
        if (!hasMore) break;
      }
      setEvaluationSummary(`Complete. Processed ${processedCount} / ${totalCount} in ${batches} batch${batches === 1 ? '' : 'es'}. Generated ${generatedCount}, failed ${failedCount}, warnings ${warningCount}.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Evaluation failed');
    } finally {
      setRunning(false);
      setTimeout(() => setProgress(0), 3000);
    }
  };

  const handleLookup = async (instrument: any | null) => {
    if (!instrument) {
      setLookupResult(null);
      setLookupHistory([]);
      return;
    }
    setLoading(true);
    try {
      const [result, history] = await Promise.all([
        fetchLatestDecision(instrument.id),
        fetchHistory(instrument.id)
      ]);
      setLookupResult(result);
      setLookupHistory(history);
    } catch (err: any) {
      setError(err.message || 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const candidateColumns: DataTableColumn<StrategyDecisionDto>[] = [
    { id: 'symbol', label: 'Symbol', render: (d) => <Box component={Link} to={`/research/stocks/${d.instrumentId}`} sx={symbolLinkSx}>{d.symbol}</Box> },
    { id: 'country', label: 'Region', render: (d) => <Typography variant="body2">{d.country || 'N/A'}</Typography> },
    { id: 'strategy', label: 'Strategy', render: (d) => <Box><Typography variant="body2">{d.strategy}</Typography>{d.frameworkBacked && <Typography variant="caption" color="text.secondary">Framework {d.strategyVersion || ''}</Typography>}</Box> },
    { id: 'decision', label: 'Decision', render: (d) => <StatusBadge label={formatDecision(d.decision)} /> },
    { id: 'decisionScore', label: 'Score', align: 'right', render: (d) => d.decisionScore },
    { id: 'confidence', label: 'Confidence', render: (d) => d.confidence },
    { id: 'entryZone', label: 'Entry Zone', render: (d) => d.entryZone ? `${d.entryZone.preferredEntryMin} - ${d.entryZone.preferredEntryMax}` : 'N/A' },
    { id: 'generatedAt', label: 'Generated', render: (d) => new Date(d.generatedAt).toLocaleDateString() },
    { id: 'actions', label: 'Actions', render: () => <Button size="small" component={Link} to={`/trade-plans`}>Risk Plan</Button> },
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto' }}>
      {running && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000 }}>
          <LinearProgress variant="determinate" value={progress} />
          <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 0.5, textAlign: 'center' }}>
            <Typography variant="caption">Strategy Evaluation in Progress: {Math.round(progress)}%</Typography>
          </Box>
        </Box>
      )}
      <PageHeader
        title="Strategy Decision Engine"
        subtitle="Strategy-backed review candidates, exit-risk alerts, and market state awareness."
        primaryAction={
          <Button
            variant="contained"
            startIcon={running ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
            onClick={() => setActiveTab(5)} // Switch to Evaluate tab
            disabled={running}
          >
            {running ? `Running (${Math.round(progress)}%)` : 'Run Evaluation'}
          </Button>
        }
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Research Support Only:</strong> This engine provides rule-based analysis to support your research. This is NOT financial advice, NOT a transaction recommendation, and NOT an automated trading system.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper sx={{ mb: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto" sx={{ flexGrow: 1 }}>
          <Tab label="Market Gate" />
          <Tab label="Review Candidates" />
          <Tab label="Wait / Watch" />
          <Tab label="Exits / Risks" />
          <Tab label="Rules & Model" />
          <Tab label="Evaluate" />
          <Tab label="Stock Lookup" />
        </Tabs>
        
        {(activeTab === 1 || activeTab === 2) && (
          <Box sx={{ px: 2, py: 1 }}>
            <TextField
              select
              size="small"
              label="Region Override"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="SCOPE">Default (Global Scope)</MenuItem>
              <MenuItem value="ALL">All Regions</MenuItem>
              <MenuItem value="IN">India</MenuItem>
              <MenuItem value="US">USA</MenuItem>
            </TextField>
          </Box>
        )}
      </Paper>

      {activeTab === 0 && gate && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Market Condition: {gate.marketCondition}</Typography>
              <Box sx={{ my: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle1">Gate Status:</Typography>
                <StatusBadge label={gate.marketGate} />
              </Box>
              
              {gate.marketGate === 'CLOSED' && (
                <Alert severity="warning" icon={<LockOutlined />} sx={{ my: 2 }}>
                  New long candidates are currently blocked by the market gate.
                </Alert>
              )}

              <Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 'bold' }}>Allowed Actions:</Typography>
              <List dense>
                {gate.allowedActions.map((a, i) => (
                  <ListItem key={i}>
                    <ListItemIcon><CheckCircleOutline color="success" /></ListItemIcon>
                    <ListItemText primary={formatAllowedAction(a)} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Reasons & Blockers</Typography>
              
              {gate.blockers.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" color="error" sx={{ fontWeight: 'bold', mb: 1 }}>Blockers:</Typography>
                  {gate.blockers.map((b, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', mb: 0.5 }}>
                      <ErrorOutline fontSize="small" />
                      <Typography variant="body2">{b}</Typography>
                    </Box>
                  ))}
                </Box>
              )}

              <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>Analysis:</Typography>
              {gate.reasons.map((r, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <InfoOutlined fontSize="small" color="action" />
                  <Typography variant="body2">{r}</Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <DataTable<StrategyDecisionDto>
          columns={candidateColumns}
          rows={candidates}
          getRowId={(row) => row.id || `${row.instrumentId}-${row.strategy}`}
          loading={loading}
          emptyMessage="No review candidates found for the current scope. Try running evaluation or checking the market gate."
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {activeTab === 2 && (
        <DataTable<StrategyDecisionDto>
          columns={[
            { id: 'symbol', label: 'Symbol', render: (d) => <Box component={Link} to={`/research/stocks/${d.instrumentId}`} sx={symbolLinkSx}>{d.symbol}</Box> },
            { id: 'decision', label: 'Status', render: (d) => <StatusBadge label={formatDecision(d.decision)} /> },
            { id: 'action', label: 'Requirement', render: (d) => formatAction(d.action) },
            { id: 'reasons', label: 'Reason', render: (d) => d.reasons[0] || 'Pending setup' },
          ]}
          rows={waitWatch}
          getRowId={(row) => row.id || `${row.instrumentId}-${row.strategy}`}
          loading={loading}
          emptyMessage="No instruments currently in wait or watch status for the current scope."
          page={0}
          pageSize={50}
          totalCount={waitWatch.length}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      )}

      {activeTab === 3 && (
        <DataTable<StrategyDecisionDto>
          columns={[
            { id: 'symbol', label: 'Symbol', render: (d) => <Box component={Link} to={`/research/stocks/${d.instrumentId}`} sx={symbolLinkSx}>{d.symbol}</Box> },
            { id: 'decision', label: 'Risk Level', render: (d) => <StatusBadge label={formatDecision(d.decision)} /> },
            { id: 'action', label: 'Review Action', render: (d) => formatAction(d.action) },
            { id: 'decisionScore', label: 'Risk Score', render: (d) => d.decisionScore },
            { id: 'reasons', label: 'Reasons', render: (d) => d.reasons.slice(0, 2).join('; ') },
          ]}
          rows={exits}
          getRowId={(row) => row.id || `${row.instrumentId}-${row.strategy}`}
          loading={loading}
          emptyMessage="No holdings currently flagged for exit review."
          page={0}
          pageSize={exits.length}
          totalCount={exits.length}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      )}

      {activeTab === 4 && model && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Strategy Model: {model.modelVersion}</Typography>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Market Gate Rules</Typography>
                <Grid container spacing={2}>
                  {Object.entries(model.marketGateRules).map(([state, rule]) => (
                    <Grid item xs={12} md={4} key={state}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="caption" color="textSecondary">{state}</Typography>
                        <Typography variant="body2">{rule}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {model.strategies.map((s, idx) => (
                <Box key={idx} sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{idx + 1}. {s.name}</Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>{s.description}</Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Decision Thresholds:</Typography>
                      <List dense>
                        {Object.entries(s.thresholds).map(([name, val]) => (
                          <ListItem key={name}><ListItemText primary={`${name}: ${val}`} /></ListItem>
                        ))}
                      </List>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Scoring Weights (%):</Typography>
                      <List dense>
                        {Object.entries(s.weights).map(([name, val]) => (
                          <ListItem key={name}><ListItemText primary={`${name.replace(/([A-Z])/g, ' $1')}: ${val}%`} /></ListItem>
                        ))}
                      </List>
                    </Grid>
                  </Grid>
                  <Divider sx={{ mt: 2 }} />
                </Box>
              ))}

              <Box sx={{ mt: 4, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Language & Safety Standards</Typography>
                {model.languageSafetyRules.map((rule, i) => (
                  <Typography key={i} variant="caption" display="block">- {rule}</Typography>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 5 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Evaluate Strategies</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Run the decision engine across the current latest-signal universe for {scope.region} / {scope.assetType}. Backend work stays bounded at {STRATEGY_DECISION_BATCH_SIZE} instruments per request.
          </Typography>
          
          <Grid container spacing={3} sx={{ maxWidth: 600 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Strategy"
                value={evalStrategy}
                onChange={(e) => setEvalStrategy(e.target.value)}
              >
                <MenuItem value="ALL">All Review Strategies</MenuItem>
                <MenuItem value="TREND_MOMENTUM">Trend Momentum Only</MenuItem>
                <MenuItem value="PULLBACK_IN_UPTREND">Pullback in Uptrend Only</MenuItem>
                <MenuItem value="DEFENSIVE_EXIT">Defensive Exit Risk</MenuItem>
              </TextField>
            </Grid>
            {evaluationSummary && (
              <Grid item xs={12}>
                <Alert severity={running ? 'info' : 'success'}>{evaluationSummary}</Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <Button
                variant="contained"
                size="large"
                startIcon={running ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                onClick={runEvaluate}
                disabled={running}
                fullWidth
              >
                {running ? `Processing (${Math.round(progress)}%)...` : 'Start Evaluation'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {activeTab === 6 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Stock Decision Lookup</Typography>
            <Box sx={{ maxWidth: 400, mt: 2 }}>
              <InstrumentSearchSelect 
                label="Search Stock"
                value={lookupInstrument}
                onChange={(inst) => {
                  setLookupInstrument(inst);
                  handleLookup(inst);
                }}
              />
            </Box>
          </Paper>

          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}

          {lookupResult && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h5">{lookupResult.symbol} - {lookupResult.strategy}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {lookupResult.country} | {lookupResult.exchange} | Generated: {new Date(lookupResult.generatedAt).toLocaleString()}
                  </Typography>
                  {lookupResult.frameworkBacked && (
                    <Typography variant="caption" display="block" color="primary">
                      Strategy Framework-backed {lookupResult.strategyVersion ? `v${lookupResult.strategyVersion}` : ''}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <StatusBadge label={formatDecision(lookupResult.decision)} />
                  <Typography variant="caption" display="block" color="textSecondary">Confidence: {lookupResult.confidence}</Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Strategy Assessment</Typography>
                  <Typography variant="h6" color="primary" sx={{ my: 1 }}>{formatAction(lookupResult.action)}</Typography>
                  
                  <Box sx={{ my: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">Decision Score</Typography>
                    <Typography variant="h4">{lookupResult.decisionScore}/100</Typography>
                    
                    {lookupResult.scoreBreakdown && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Score Breakdown:</Typography>
                        <Grid container spacing={1} sx={{ mt: 1 }}>
                          {Object.entries(lookupResult.scoreBreakdown).filter(([k]) => k !== 'total').map(([k, v]) => (
                            <Grid item xs={6} key={k}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee' }}>
                                <Typography variant="caption">{k.replace(/([A-Z])/g, ' $1')}</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{v}</Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                  </Box>

                  <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>Analysis:</Typography>
                  <List dense>
                    {lookupResult.reasons.map((r, i) => (
                      <ListItem key={i}><ListItemIcon><CheckCircleOutline color="success" fontSize="small" /></ListItemIcon><ListItemText primary={r} /></ListItem>
                    ))}
                    {lookupResult.warnings.map((w, i) => (
                      <ListItem key={i}><ListItemIcon><WarningAmberOutlined color="warning" fontSize="small" /></ListItemIcon><ListItemText primary={w} /></ListItem>
                    ))}
                    {lookupResult.blockers.map((b, i) => (
                      <ListItem key={i}><ListItemIcon><ErrorOutline color="error" fontSize="small" /></ListItemIcon><ListItemText primary={b} /></ListItem>
                    ))}
                  </List>
                </Grid>

                <Grid item xs={12} md={6}>
                  {lookupResult.entryZone && (
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Entry Zone ({lookupResult.entryZone.type})</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>{lookupResult.entryZone.rationale}</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="textSecondary">Reference</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{lookupResult.entryZone.referencePrice}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="textSecondary">Preferred Min</Typography>
                          <Typography variant="body1" color="success.main" sx={{ fontWeight: 'medium' }}>{lookupResult.entryZone.preferredEntryMin}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="textSecondary">Preferred Max</Typography>
                          <Typography variant="body1" color="success.main" sx={{ fontWeight: 'medium' }}>{lookupResult.entryZone.preferredEntryMax}</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {lookupResult.riskPlan && (
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Risk Plan</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>{lookupResult.riskPlan.rationale}</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="textSecondary">Stop Loss</Typography>
                          <Typography variant="body1" color="error" sx={{ fontWeight: 'medium' }}>{lookupResult.riskPlan.stopLoss}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="textSecondary">Target Price</Typography>
                          <Typography variant="body1" color="success.main" sx={{ fontWeight: 'medium' }}>{lookupResult.riskPlan.targetPrice}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="textSecondary">Reward/Risk</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{lookupResult.riskPlan.rewardRiskRatio}</Typography>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>Invalidation Rules:</Typography>
                        {lookupResult.riskPlan.invalidationRules?.map((rule, i) => (
                          <Typography key={i} variant="caption" display="block">- {rule}</Typography>
                        ))}
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>Exit Rules:</Typography>
                        {lookupResult.riskPlan.exitRules?.map((rule, i) => (
                          <Typography key={i} variant="caption" display="block">- {rule}</Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                  {lookupResult.dataGaps.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" color="warning.main">Data Gaps Identified:</Typography>
                      <Typography variant="caption" display="block">{lookupResult.dataGaps.join(', ')}</Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Paper>
          )}

          {lookupHistory.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Decision History</Typography>
              <DataTable<StrategyDecisionDto>
                columns={[
                  { id: 'generatedAt', label: 'Date', render: (d) => new Date(d.generatedAt).toLocaleDateString() },
                  { id: 'strategy', label: 'Strategy', render: (d) => d.strategy },
                  { id: 'decision', label: 'Decision', render: (d) => <StatusBadge label={formatDecision(d.decision)} /> },
                  { id: 'decisionScore', label: 'Score', align: 'right', render: (d) => d.decisionScore },
                  { id: 'confidence', label: 'Confidence', render: (d) => d.confidence },
                ]}
                rows={lookupHistory}
                getRowId={(row) => row.id || row.generatedAt}
                page={0}
                pageSize={5}
                totalCount={lookupHistory.length}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
              />
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default StrategyDecisionDashboard;
