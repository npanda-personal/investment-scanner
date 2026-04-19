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
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  fetchScannerRules,
  createScannerRule,
  updateScannerRule,
  deleteScannerRule,
  triggerScan,
  fetchScanLogs,
  scanAllActiveRules,
  ScannerRule,
  ScanLog,
  CreateScannerRuleRequest,
} from '../../services/scannerService';
import { fetchWatchlists, Watchlist } from '../../services/watchlistService';
import ConditionInputDualMode from '../ConditionBuilder/ConditionInputDualMode';
import ScanScopeSelector, { ScanScope } from '../ScanScopeSelector/ScanScopeSelector';
import { ConditionNode } from '../../types/scanner';

const Scanner: React.FC = () => {
  const [rules, setRules] = useState<ScannerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, ScanLog[]>>({}); // ruleId -> logs
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);

  // New rule dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<ScannerRule | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [schedule, setSchedule] = useState('');
  const [scanScope, setScanScope] = useState<ScanScope>('database');
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>('');
  const [customSymbols, setCustomSymbols] = useState<string[]>([]);
  const [conditionNode, setConditionNode] = useState<ConditionNode>({ type: 'indicator', name: 'RSI', parameters: {}, operator: '>', value: 70 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rulesData, watchlistsData] = await Promise.all([
        fetchScannerRules(),
        fetchWatchlists(),
      ]);
      setRules(rulesData);
      setWatchlists(watchlistsData);
      setError(null);
    } catch (err: any) {
      setError('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLogsForRule = async (ruleId: string) => {
    try {
      const logsData = await fetchScanLogs(ruleId, 10);
      setLogs(prev => ({ ...prev, [ruleId]: logsData }));
    } catch (err) {
      console.error('Failed to load logs for rule', ruleId, err);
    }
  };

  const handleOpenDialog = (rule?: ScannerRule) => {
    if (rule) {
      setEditingRule(rule);
      setName(rule.name);
      setDescription(rule.description || '');
      setConditionNode(rule.condition);
      // Determine scan scope
      if (rule.sourceWatchlistId) {
        setScanScope('watchlist');
        setSelectedWatchlistId(rule.sourceWatchlistId);
        setCustomSymbols([]);
      } else if (rule.sourceSymbols && rule.sourceSymbols.length > 0) {
        setScanScope('custom');
        setSelectedWatchlistId('');
        setCustomSymbols(rule.sourceSymbols);
      } else {
        setScanScope('database');
        setSelectedWatchlistId('');
        setCustomSymbols([]);
      }
      setIsActive(rule.isActive);
      setSchedule(rule.schedule || '');
    } else {
      setEditingRule(null);
      setName('');
      setDescription('');
      setConditionNode({ type: 'indicator', name: 'RSI', parameters: {}, operator: '>', value: 70 });
      setScanScope('database');
      setSelectedWatchlistId('');
      setCustomSymbols([]);
      setIsActive(true);
      setSchedule('');
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleSaveRule = async () => {
    try {
      // Determine source watchlist and symbols based on scan scope
      let sourceWatchlistId: string | undefined = undefined;
      let sourceSymbols: string[] | undefined = undefined;
      if (scanScope === 'watchlist') {
        sourceWatchlistId = selectedWatchlistId || undefined;
      } else if (scanScope === 'custom') {
        sourceSymbols = customSymbols.length > 0 ? customSymbols : undefined;
      }

      // Find or create a "Scanner Results" watchlist
      let scannerResultsWatchlist = watchlists.find(wl => wl.name === 'Scanner Results');
      if (!scannerResultsWatchlist) {
        try {
          const { createWatchlist } = await import('../../services/watchlistService');
          scannerResultsWatchlist = await createWatchlist({
            name: 'Scanner Results',
            description: 'Auto-generated watchlist for scanner results (symbols not actually saved)',
            symbols: [],
          });
          // Refresh watchlists
          const updatedWatchlists = await fetchWatchlists();
          setWatchlists(updatedWatchlists);
        } catch (createErr) {
          console.warn('Failed to create Scanner Results watchlist:', createErr);
          // Use first available watchlist as fallback
          scannerResultsWatchlist = watchlists[0];
        }
      }

      if (!scannerResultsWatchlist) {
        setError('No watchlist available for scanner results. Please create a watchlist first.');
        return;
      }

      // Use the scanner results watchlist ID
      const data: CreateScannerRuleRequest = {
        name,
        description,
        condition: conditionNode,
        sourceWatchlistId,
        sourceSymbols,
        targetWatchlistId: scannerResultsWatchlist.id,
        isActive,
        schedule: schedule || undefined,
      };
      if (editingRule) {
        await updateScannerRule(editingRule.id, data);
      } else {
        await createScannerRule(data);
      }
      await loadData();
      handleCloseDialog();
    } catch (err: any) {
      setError('Failed to save rule: ' + err.message);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this scanner rule?')) return;
    try {
      await deleteScannerRule(id);
      await loadData();
    } catch (err: any) {
      setError('Failed to delete rule: ' + err.message);
    }
  };

  const handleTriggerScan = async (id: string) => {
    try {
      await triggerScan(id);
      // Refresh logs
      await loadLogsForRule(id);
    } catch (err: any) {
      setError('Failed to trigger scan: ' + err.message);
    }
  };

  const handleScanAll = async () => {
    try {
      await scanAllActiveRules();
      // Refresh all logs
      rules.forEach(rule => loadLogsForRule(rule.id));
    } catch (err: any) {
      setError('Failed to scan all rules: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Validation errors
  const validationErrors: string[] = [];
  if (!name.trim()) validationErrors.push('Rule name is required.');
  if (!conditionNode) validationErrors.push('At least one condition must be defined.');
  if (scanScope === 'watchlist' && !selectedWatchlistId) validationErrors.push('A source watchlist must be selected.');
  // TODO: add validation for custom symbols if needed

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Real-Time Market Scanner
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Create scanner rules to monitor market conditions and trigger alerts when criteria are met.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Active Scanner Rules</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleScanAll}>
            Scan All Rules
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            New Rule
          </Button>
        </Box>
      </Box>

      {rules.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No scanner rules yet. Create your first rule to start scanning.
          </Typography>
        </Paper>
      ) : (
        <List sx={{ bgcolor: 'background.paper' }}>
          {rules.map((rule) => (
            <React.Fragment key={rule.id}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{rule.name}</Typography>
                      <Chip
                        label={rule.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={rule.isActive ? 'success' : 'default'}
                      />
                      {rule.schedule && <Chip label={`Schedule: ${rule.schedule}`} size="small" variant="outlined" />}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {rule.description}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Target watchlist: {rule.targetWatchlist?.name}
                        {rule.sourceWatchlist && ` • Source watchlist: ${rule.sourceWatchlist.name}`}
                        {rule.sourceSymbols && ` • Source symbols: ${JSON.stringify(rule.sourceSymbols)}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last triggered: {rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).toLocaleString() : 'Never'}
                      </Typography>
                      {/* Logs preview */}
                      {logs[rule.id] && logs[rule.id].length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2">Recent Triggers:</Typography>
                          <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Symbol</TableCell>
                                  <TableCell>Triggered At</TableCell>
                                  <TableCell>Added to Watchlist</TableCell>
                                  <TableCell>Error</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {logs[rule.id].map((log) => (
                                  <TableRow key={log.id}>
                                    <TableCell>{log.symbol}</TableCell>
                                    <TableCell>{new Date(log.triggeredAt).toLocaleString()}</TableCell>
                                    <TableCell>{log.addedToWatchlist ? 'Yes' : 'No'}</TableCell>
                                    <TableCell>{log.error || '-'}</TableCell>
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
                  <IconButton edge="end" aria-label="trigger" onClick={() => handleTriggerScan(rule.id)}>
                    <PlayArrowIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenDialog(rule)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteRule(rule.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Create/Edit Rule Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingRule ? 'Edit Scanner Rule' : 'Create New Scanner Rule'}</DialogTitle>
        <DialogContent>
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
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <ScanScopeSelector
            value={{
              scope: scanScope,
              watchlistId: selectedWatchlistId,
              customSymbols: customSymbols,
            }}
            onChange={(value) => {
              setScanScope(value.scope);
              setSelectedWatchlistId(value.watchlistId || '');
              setCustomSymbols(value.customSymbols || []);
            }}
            watchlists={watchlists}
          />
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Condition</Typography>
            <ConditionInputDualMode
              value={conditionNode}
              onChange={(node) => setConditionNode(node)}
            />
          </Box>
          <TextField
            margin="dense"
            label="Schedule (Cron expression, optional)"
            fullWidth
            variant="outlined"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="0 */5 * * * *"
            helperText="Cron expression for scheduled scanning. Leave empty for real‑time only."
          />
          <FormControlLabel
            control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label="Active"
          />
        </DialogContent>
        <DialogActions>
          <Box sx={{ flexGrow: 1 }}>
            {validationErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Please fix the following errors:</Typography>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </Box>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained" disabled={validationErrors.length > 0}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Scanner;