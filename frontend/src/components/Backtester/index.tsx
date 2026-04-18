import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
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

const Backtester: React.FC = () => {
  const [configs, setConfigs] = useState<BacktestConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [results, setResults] = useState<Record<string, BacktestResult[]>>({}); // configId -> results

  // New config dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<BacktestConfig | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWatchlistIds, setSelectedWatchlistIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [strategyConfig, setStrategyConfig] = useState('{}');
  const [positionSizing, setPositionSizing] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

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
    if (config) {
      setEditingConfig(config);
      setName(config.name);
      setDescription(config.description || '');
      setSelectedWatchlistIds(config.watchlistIds);
      setStartDate(config.startDate.split('T')[0]);
      setEndDate(config.endDate.split('T')[0]);
      setStrategyConfig(JSON.stringify(config.strategyConfig, null, 2));
      setPositionSizing(config.positionSizing ? JSON.stringify(config.positionSizing, null, 2) : '');
      setStopLoss(config.stopLoss?.toString() || '');
      setTakeProfit(config.takeProfit?.toString() || '');
    } else {
      setEditingConfig(null);
      setName('');
      setDescription('');
      setSelectedWatchlistIds([]);
      setStartDate('');
      setEndDate('');
      setStrategyConfig('{}');
      setPositionSizing('');
      setStopLoss('');
      setTakeProfit('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSaveConfig = async () => {
    try {
      let parsedStrategyConfig;
      let parsedPositionSizing;
      try {
        parsedStrategyConfig = JSON.parse(strategyConfig);
      } catch {
        setError('Invalid JSON in strategy config');
        return;
      }
      if (positionSizing.trim()) {
        try {
          parsedPositionSizing = JSON.parse(positionSizing);
        } catch {
          setError('Invalid JSON in position sizing');
          return;
        }
      }
      const data: CreateBacktestConfigRequest = {
        name,
        description,
        watchlistIds: selectedWatchlistIds,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        strategyConfig: parsedStrategyConfig,
        positionSizing: parsedPositionSizing,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
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
    try {
      await runBacktest(id);
      // Refresh results
      await loadResultsForConfig(id);
    } catch (err: any) {
      setError('Failed to run backtest: ' + err.message);
    }
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
                                  <TableRow key={result.id}>
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
                  <IconButton edge="end" aria-label="run" onClick={() => handleRunBacktest(config.id)}>
                    <PlayArrowIcon />
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

      {/* Create/Edit Config Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingConfig ? 'Edit Backtest Configuration' : 'Create New Backtest Configuration'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                margin="dense"
                label="Name"
                fullWidth
                variant="outlined"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Description"
                fullWidth
                variant="outlined"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Watchlists *</InputLabel>
                <Select
                  multiple
                  value={selectedWatchlistIds}
                  label="Watchlists *"
                  onChange={(e) => setSelectedWatchlistIds(e.target.value as string[])}
                  required
                >
                  {watchlists.map((wl) => (
                    <MenuItem key={wl.id} value={wl.id}>
                      {wl.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Start Date"
                type="date"
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="End Date"
                type="date"
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Strategy Config (JSON)"
                fullWidth
                variant="outlined"
                multiline
                rows={6}
                value={strategyConfig}
                onChange={(e) => setStrategyConfig(e.target.value)}
                placeholder={`{
  "entry": {
    "indicator": "SMA",
    "fast": 10,
    "slow": 30,
    "type": "crossover"
  },
  "exit": {
    "indicator": "SMA",
    "fast": 10,
    "slow": 30,
    "type": "crossunder"
  }
}`}
                helperText="Define the trading strategy as a JSON object."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Position Sizing (JSON, optional)"
                fullWidth
                variant="outlined"
                multiline
                rows={3}
                value={positionSizing}
                onChange={(e) => setPositionSizing(e.target.value)}
                placeholder={`{
  "type": "fixed",
  "amount": 1000
}`}
                helperText="Define position sizing logic."
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Stop Loss (%)"
                type="number"
                fullWidth
                variant="outlined"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="5"
                helperText="Optional"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Take Profit (%)"
                type="number"
                fullWidth
                variant="outlined"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="10"
                helperText="Optional"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveConfig} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Backtester;