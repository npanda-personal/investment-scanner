import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  fetchBacktestConfigs,
  createBacktestConfig,
  updateBacktestConfig,
  deleteBacktestConfig,
  runBacktest,
  fetchBacktestResults,
  BacktestConfig,
  BacktestResult,
  CreateBacktestConfigRequest,
} from '../../services/backtestService';
import { fetchWatchlists, Watchlist } from '../../services/watchlistService';
import BacktestWizardDialog, { WizardData } from './BacktestWizardDialog';
import BacktestResultsView from './BacktestResultsView';

const Backtester: React.FC = () => {
  const [configs, setConfigs] = useState<BacktestConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [results, setResults] = useState<Record<string, BacktestResult[]>>({}); // configId -> results
  const [runningConfigId, setRunningConfigId] = useState<string | null>(null);

  // New config dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<BacktestConfig | null>(null);

  // Results visualization dialog
  const [selectedResult, setSelectedResult] = useState<BacktestResult | null>(null);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsData, watchlistsData] = await Promise.all([
        fetchBacktestConfigs(),
        fetchWatchlists(),
      ]);
      setConfigs(configsData);
      console.log('Loaded configs:', configsData);
      setWatchlists(watchlistsData);
      setError(null);
    } catch (err: any) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadResultsForConfig = async (configId: string) => {
    try {
      const resultsData = await fetchBacktestResults(configId, 5);
      setResults(prev => ({ ...prev, [configId]: resultsData }));
    } catch (err) {
      console.error('Failed to load results for config', configId, err);
    }
  };

  const handleOpenDialog = (config?: BacktestConfig) => {
    setEditingConfig(config || null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSaveConfig = async (wizardData: WizardData) => {
    try {
      const strategyConfig = {
        entry: wizardData.entryCondition,
        exit: wizardData.exitCondition,
      };
      const data: CreateBacktestConfigRequest = {
        name: wizardData.name,
        description: wizardData.description,
        watchlistIds: wizardData.watchlistIds,
        startDate: new Date(wizardData.startDate),
        endDate: new Date(wizardData.endDate),
        strategyConfig,
        positionSizing: wizardData.positionSizing,
        stopLoss: wizardData.stopLoss ?? undefined,
        takeProfit: wizardData.takeProfit ?? undefined,
      };
      if (editingConfig) {
        await updateBacktestConfig(editingConfig.id, data);
      } else {
        await createBacktestConfig(data);
      }
      await loadData();
      handleCloseDialog();
    } catch (err: any) {
      setError('Failed to save configuration: ' + err.message);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this backtest configuration?')) return;
    try {
      await deleteBacktestConfig(id);
      await loadData();
    } catch (err: any) {
      setError('Failed to delete configuration: ' + err.message);
    }
  };

  const handleRunBacktest = async (id: string) => {
    setRunningConfigId(id);
    try {
      await runBacktest(id);
      // Refresh results
      await loadResultsForConfig(id);
    } catch (err: any) {
      setError('Failed to run backtest: ' + err.message);
    } finally {
      setRunningConfigId(null);
    }
  };

  const handleOpenResults = (result: BacktestResult) => {
    setSelectedResult(result);
    setResultsDialogOpen(true);
  };

  const handleCloseResults = () => {
    setResultsDialogOpen(false);
    setSelectedResult(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  console.log('Rendering Backtester with configs:', configs);
  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Strategy Backtester
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Configure and run quantitative strategy backtests on historical data.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Backtest Configurations</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            New Configuration
          </Button>
        </Box>
      </Box>

      {configs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No backtest configurations yet. Create your first configuration to start backtesting.
          </Typography>
        </Paper>
      ) : (
        <List sx={{ bgcolor: 'background.paper' }}>
          {configs.map((config) => (
            <React.Fragment key={config.id}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{config.name}</Typography>
                      <Chip label={`${config.watchlistIds.length} watchlists`} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {config.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Period: {new Date(config.startDate).toLocaleDateString()} – {new Date(config.endDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Created {new Date(config.createdAt).toLocaleDateString()}
                      </Typography>
                      {/* Results preview */}
                      {results[config.id] && results[config.id].length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2">Latest Results:</Typography>
                          <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Run Date</TableCell>
                                  <TableCell>Sharpe Ratio</TableCell>
                                  <TableCell>Max Drawdown</TableCell>
                                  <TableCell>Win Rate</TableCell>
                                  <TableCell>Total Return</TableCell>
                                  <TableCell>Status</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {results[config.id].map((result) => (
                                  <TableRow
                                    key={result.id}
                                    onClick={() => handleOpenResults(result)}
                                    sx={{
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                  >
                                    <TableCell>{new Date(result.completedAt).toLocaleString()}</TableCell>
                                    <TableCell>{result.sharpeRatio !== null ? Number(result.sharpeRatio).toFixed(3) : '-'}</TableCell>
                                    <TableCell>{result.maxDrawdown !== null ? Number(result.maxDrawdown).toFixed(3) : '-'}</TableCell>
                                    <TableCell>{result.winRate !== null ? `${(Number(result.winRate) * 100).toFixed(1)}%` : '-'}</TableCell>
                                    <TableCell>{result.totalReturn !== null ? `${(Number(result.totalReturn) * 100).toFixed(2)}%` : '-'}</TableCell>
                                    <TableCell>
                                      <Chip
                                        label={result.status}
                                        size="small"
                                        color={result.status === 'completed' ? 'success' : result.status === 'failed' ? 'error' : 'warning'}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="run"
                    onClick={() => handleRunBacktest(config.id)}
                    disabled={runningConfigId === config.id}
                  >
                    {runningConfigId === config.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <PlayArrowIcon />
                    )}
                  </IconButton>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenDialog(config)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteConfig(config.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      <BacktestWizardDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSave={handleSaveConfig}
        watchlists={watchlists}
        editingConfig={editingConfig}
      />
      {/* Results detail dialog */}
      <Dialog
        open={resultsDialogOpen}
        onClose={handleCloseResults}
        maxWidth="lg"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>Backtest Result Details</DialogTitle>
        <DialogContent dividers>
          {selectedResult && <BacktestResultsView result={selectedResult} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResults}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Backtester;