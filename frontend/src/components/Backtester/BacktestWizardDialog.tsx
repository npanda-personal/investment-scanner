import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  FormHelperText,
} from '@mui/material';
import { Watchlist } from '../../services/watchlistService';
import { BacktestConfig } from '../../services/backtestService';
import ConditionInputDualMode from '../ConditionBuilder/ConditionInputDualMode';
import { ConditionNode } from '../../types/scanner';

interface BacktestWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: WizardData) => Promise<void>;
  watchlists: Watchlist[];
  editingConfig: BacktestConfig | null;
}

export interface WizardData {
  name: string;
  description: string;
  watchlistIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string;
  entryCondition: ConditionNode | null;
  exitCondition: ConditionNode | null;
  stopLoss: number | null;
  takeProfit: number | null;
  positionSizing: any; // JSON object
}

const steps = ['General', 'Entry Signals', 'Exit Signals', 'Risk Management', 'Review'];

const BacktestWizardDialog: React.FC<BacktestWizardDialogProps> = ({
  open,
  onClose,
  onSave,
  watchlists,
  editingConfig,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWatchlistIds, setSelectedWatchlistIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entryCondition, setEntryCondition] = useState<ConditionNode | undefined>(undefined);
  const [exitCondition, setExitCondition] = useState<ConditionNode | undefined>(undefined);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [positionSizing, setPositionSizing] = useState<string>('{}');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize form when editingConfig changes
  useEffect(() => {
    if (editingConfig) {
      setName(editingConfig.name);
      setDescription(editingConfig.description || '');
      setSelectedWatchlistIds(editingConfig.watchlistIds);
      setStartDate(editingConfig.startDate.split('T')[0]);
      setEndDate(editingConfig.endDate.split('T')[0]);
      // Parse strategyConfig to extract entry/exit conditions (placeholder)
      // For now, set empty conditions
      setEntryCondition(undefined);
      setExitCondition(undefined);
      setStopLoss(editingConfig.stopLoss?.toString() || '');
      setTakeProfit(editingConfig.takeProfit?.toString() || '');
      setPositionSizing(editingConfig.positionSizing ? JSON.stringify(editingConfig.positionSizing, null, 2) : '{}');
    } else {
      // Reset to defaults
      setName('');
      setDescription('');
      setSelectedWatchlistIds([]);
      setStartDate('');
      setEndDate('');
      setEntryCondition(undefined);
      setExitCondition(undefined);
      setStopLoss('');
      setTakeProfit('');
      setPositionSizing('{}');
    }
    setActiveStep(0);
    setValidationErrors([]);
  }, [editingConfig, open]);

  const handleNext = () => {
    // Validate current step
    const errors = validateStep(activeStep);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const validateStep = (step: number): string[] => {
    const errors: string[] = [];
    switch (step) {
      case 0: // General
        if (!name.trim()) errors.push('Name is required');
        if (selectedWatchlistIds.length === 0) errors.push('At least one watchlist must be selected');
        if (!startDate) errors.push('Start date is required');
        if (!endDate) errors.push('End date is required');
        if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
          errors.push('Start date must be before end date');
        }
        break;
      case 1: // Entry Signals
        if (!entryCondition) errors.push('At least one entry condition must be defined');
        break;
      case 2: // Exit Signals
        // Exit condition optional (could use stop loss/take profit)
        break;
      case 3: // Risk Management
        // Validate numeric fields
        if (stopLoss && isNaN(parseFloat(stopLoss))) errors.push('Stop loss must be a number');
        if (takeProfit && isNaN(parseFloat(takeProfit))) errors.push('Take profit must be a number');
        if (positionSizing.trim()) {
          try {
            JSON.parse(positionSizing);
          } catch {
            errors.push('Position sizing must be valid JSON');
          }
        }
        break;
    }
    return errors;
  };

  const handleSave = async () => {
    const errors = validateStep(activeStep);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    // Also validate all steps
    const allErrors: string[] = [];
    for (let i = 0; i < steps.length - 1; i++) {
      allErrors.push(...validateStep(i));
    }
    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      return;
    }

    // Parse position sizing
    let parsedPositionSizing = {};
    if (positionSizing.trim()) {
      try {
        parsedPositionSizing = JSON.parse(positionSizing);
      } catch {
        setValidationErrors(['Invalid JSON in position sizing']);
        return;
      }
    }

    const data: WizardData = {
      name,
      description,
      watchlistIds: selectedWatchlistIds,
      startDate,
      endDate,
      entryCondition: entryCondition ?? null,
      exitCondition: exitCondition ?? null,
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit) : null,
      positionSizing: parsedPositionSizing,
    };
    await onSave(data);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                margin="dense"
                label="Name"
                helperText="A descriptive name for this backtest configuration."
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
                helperText="Optional description of the strategy."
                fullWidth
                variant="outlined"
                multiline
                rows={2}
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
                <FormHelperText>Select one or more watchlists to run the backtest on.</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                margin="dense"
                label="Start Date"
                helperText="The start date of the backtest period (inclusive)."
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
                helperText="The end date of the backtest period (inclusive)."
                type="date"
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" paragraph>
              Define conditions that trigger a trade entry. Use the visual builder or JSON editor.
            </Typography>
            <ConditionInputDualMode
              value={entryCondition}
              onChange={(node) => setEntryCondition(node ?? undefined)}
            />
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" paragraph>
              Define conditions that trigger a trade exit (optional). If left empty, exit will be based on stop loss / take profit only.
            </Typography>
            <ConditionInputDualMode
              value={exitCondition}
              onChange={(node) => setExitCondition(node ?? undefined)}
            />
          </Box>
        );
      case 3:
        return (
          <Grid container spacing={2}>
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
                helperText="Optional, percent from entry price"
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
                helperText="Optional, percent from entry price"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Position Sizing (JSON, optional)"
                fullWidth
                variant="outlined"
                multiline
                rows={4}
                value={positionSizing}
                onChange={(e) => setPositionSizing(e.target.value)}
                placeholder={`{
  "type": "fixed",
  "amount": 1000
}`}
                helperText="Define position sizing logic as JSON."
              />
            </Grid>
          </Grid>
        );
      case 4:
        return (
          <Box>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>General</Typography>
              <Typography variant="body2"><strong>Name:</strong> {name}</Typography>
              <Typography variant="body2"><strong>Description:</strong> {description || 'None'}</Typography>
              <Typography variant="body2"><strong>Watchlists:</strong> {selectedWatchlistIds.map(id => watchlists.find(w => w.id === id)?.name).join(', ')}</Typography>
              <Typography variant="body2"><strong>Period:</strong> {startDate} to {endDate}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Entry Signals</Typography>
              <Typography variant="body2">{entryCondition ? 'Condition defined' : 'No condition defined'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Exit Signals</Typography>
              <Typography variant="body2">{exitCondition ? 'Condition defined' : 'No condition defined'}</Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Risk Management</Typography>
              <Typography variant="body2"><strong>Stop Loss:</strong> {stopLoss ? `${stopLoss}%` : 'None'}</Typography>
              <Typography variant="body2"><strong>Take Profit:</strong> {takeProfit ? `${takeProfit}%` : 'None'}</Typography>
              <Typography variant="body2"><strong>Position Sizing:</strong> {positionSizing.trim() ? 'Defined' : 'Default'}</Typography>
            </Paper>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingConfig ? 'Edit Backtest Configuration' : 'Create New Backtest Configuration'}
        <Typography variant="body2" color="text.secondary">
          Step {activeStep + 1} of {steps.length}: {steps[activeStep]}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Please fix the following errors:</Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </Alert>
        )}

        {renderStepContent(activeStep)}
      </DialogContent>
      <DialogActions>
        <Box sx={{ flexGrow: 1 }}>
          <Button onClick={onClose}>Cancel</Button>
        </Box>
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button onClick={handleSave} variant="contained">
            {editingConfig ? 'Update' : 'Create'}
          </Button>
        ) : (
          <Button onClick={handleNext} variant="contained">
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BacktestWizardDialog;