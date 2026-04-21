import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Slider,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import {
  SessionCreationWizardProps,
  ScanPreset,
  SignalDefinition,
  SessionConfig,
  TriggerScanRequest,
  SignalType,
} from '../../../../../types/real-time-scanner';

// Mock data for development
const MOCK_PRESETS: ScanPreset[] = [
  { 
    id: 'preset-1', 
    name: 'Quick Technical Scan', 
    description: 'Basic RSI and EMA signals for quick scanning',
    category: 'technical',
    scopeType: 'preset',
    scopeData: { presetId: 'preset-1' },
    signals: [
      { id: 'signal-1', type: 'RSI', name: 'RSI', description: 'Relative Strength Index', enabled: true, parameters: { period: 14 }, weight: 25, threshold: 30 },
      { id: 'signal-2', type: 'EMA', name: 'EMA Crossover', description: 'Exponential Moving Average Crossover', enabled: true, parameters: { shortPeriod: 9, longPeriod: 21 }, weight: 20 },
    ],
    rankingConfig: {
      signalWeight: 60,
      volumeWeight: 20,
      changeWeight: 15,
      recencyWeight: 5,
      confidenceThreshold: 60,
      maxResults: 50,
    },
    isDefault: true,
    usageCount: 142,
    successRate: 87,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  { 
    id: 'preset-2', 
    name: 'Comprehensive Momentum', 
    description: 'Full momentum analysis with volume confirmation',
    category: 'momentum',
    scopeType: 'preset',
    scopeData: { presetId: 'preset-2' },
    signals: [
      { id: 'signal-1', type: 'RSI', name: 'RSI', description: 'Relative Strength Index', enabled: true, parameters: { period: 14 }, weight: 20, threshold: 30 },
      { id: 'signal-2', type: 'EMA', name: 'EMA Crossover', description: 'Exponential Moving Average Crossover', enabled: true, parameters: { shortPeriod: 9, longPeriod: 21 }, weight: 20 },
      { id: 'signal-3', type: 'MACD', name: 'MACD', description: 'Moving Average Convergence Divergence', enabled: true, parameters: {}, weight: 20 },
      { id: 'signal-4', type: 'VOLUME', name: 'Volume Spike', description: 'Volume Spike Detection', enabled: true, parameters: { multiplier: 2.0 }, weight: 15, threshold: 2.0 },
      { id: 'signal-5', type: 'PRICE_CHANGE', name: 'Price Change', description: 'Price Change Percentage', enabled: true, parameters: { period: 1 }, weight: 25, threshold: 5.0 },
    ],
    rankingConfig: {
      signalWeight: 70,
      volumeWeight: 15,
      changeWeight: 10,
      recencyWeight: 5,
      confidenceThreshold: 65,
      maxResults: 100,
    },
    isDefault: false,
    usageCount: 89,
    successRate: 82,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const MOCK_SIGNALS: SignalDefinition[] = [
  { id: 'signal-1', type: 'RSI', name: 'RSI', description: 'Relative Strength Index', enabled: true, parameters: { period: 14 }, weight: 25, threshold: 30 },
  { id: 'signal-2', type: 'EMA', name: 'EMA Crossover', description: 'Exponential Moving Average Crossover', enabled: true, parameters: { shortPeriod: 9, longPeriod: 21 }, weight: 20 },
  { id: 'signal-3', type: 'MACD', name: 'MACD', description: 'Moving Average Convergence Divergence', enabled: true, parameters: {}, weight: 20 },
  { id: 'signal-4', type: 'VOLUME', name: 'Volume Spike', description: 'Volume Spike Detection', enabled: true, parameters: { multiplier: 2.0 }, weight: 15, threshold: 2.0 },
  { id: 'signal-5', type: 'PRICE_CHANGE', name: 'Price Change', description: 'Price Change Percentage', enabled: true, parameters: { period: 1 }, weight: 25, threshold: 5.0 },
];

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  name: '',
  description: '',
  scope: {
    type: 'preset',
    presetId: 'preset-1',
  },
  signals: MOCK_SIGNALS.map(signal => ({ ...signal })),
  rankingConfig: {
    signalWeight: 60,
    volumeWeight: 20,
    changeWeight: 15,
    recencyWeight: 5,
    confidenceThreshold: 60,
    maxResults: 50,
  },
};

const steps = ['Scope Selection', 'Signal Configuration', 'Ranking & Filtering', 'Review & Launch'];

const SessionCreationWizard: React.FC<SessionCreationWizardProps> = ({
  userId,
  onSuccess,
  onCancel,
  initialPresetId,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    ...DEFAULT_SESSION_CONFIG,
    scope: {
      ...DEFAULT_SESSION_CONFIG.scope,
      presetId: initialPresetId || DEFAULT_SESSION_CONFIG.scope.presetId,
    },
  });
  const [availablePresets, setAvailablePresets] = useState<ScanPreset[]>([]);
  const [availableSignals, setAvailableSignals] = useState<SignalDefinition[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load presets and signals
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual API calls
        // For now, use mock data
        setAvailablePresets(MOCK_PRESETS);
        setAvailableSignals(MOCK_SIGNALS);
      } catch (err) {
        console.error('Failed to load presets/signals:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Validate current step
  const validateStep = (step: number): boolean => {
    const errors: string[] = [];

    switch (step) {
      case 0: // Scope Selection
        if (!sessionConfig.name.trim()) {
          errors.push('Session name is required');
        }
        if (sessionConfig.scope.type === 'preset' && !sessionConfig.scope.presetId) {
          errors.push('Please select a scan preset');
        }
        if (sessionConfig.scope.type === 'custom' && (!sessionConfig.scope.symbols || sessionConfig.scope.symbols.length === 0)) {
          errors.push('Please enter at least one symbol for custom scanning');
        }
        break;

      case 1: // Signal Configuration
        const enabledSignals = sessionConfig.signals.filter(s => s.enabled);
        if (enabledSignals.length === 0) {
          errors.push('At least one signal must be enabled');
        }
        break;

      case 2: // Ranking & Filtering
        if (sessionConfig.rankingConfig.confidenceThreshold < 0 || sessionConfig.rankingConfig.confidenceThreshold > 100) {
          errors.push('Confidence threshold must be between 0 and 100');
        }
        if (sessionConfig.rankingConfig.maxResults < 1 || sessionConfig.rankingConfig.maxResults > 1000) {
          errors.push('Maximum results must be between 1 and 1000');
        }
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Replace with actual API call
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockSessionId = `session-${Date.now()}`;
      
      if (onSuccess) {
        onSuccess(mockSessionId);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      setValidationErrors(['Failed to create session. Please try again.']);
    } finally {
      setSubmitting(false);
    }
  };

  const updateSessionConfig = (updates: Partial<SessionConfig>) => {
    setSessionConfig(prev => ({ ...prev, ...updates }));
  };

  const updateSignalConfig = (signalId: string, updates: Partial<SignalDefinition>) => {
    setSessionConfig(prev => ({
      ...prev,
      signals: prev.signals.map(signal => 
        signal.id === signalId ? { ...signal, ...updates } : signal
      ),
    }));
  };

  const updateScopeType = (type: SessionConfig['scope']['type']) => {
    setSessionConfig(prev => ({
      ...prev,
      scope: {
        type,
        presetId: type === 'preset' ? prev.scope.presetId : undefined,
        watchlistId: type === 'watchlist' ? prev.scope.watchlistId : undefined,
        symbols: type === 'custom' ? prev.scope.symbols : undefined,
        filters: prev.scope.filters,
      },
    }));
  };

  // Step 1: Scope Selection
  const renderScopeSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Define Scan Scope
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select what you want to scan and configure basic session parameters.
      </Typography>

      <TextField
        fullWidth
        label="Session Name"
        value={sessionConfig.name}
        onChange={(e) => updateSessionConfig({ name: e.target.value })}
        margin="normal"
        required
        helperText="Give your scan session a descriptive name"
      />

      <TextField
        fullWidth
        label="Description (Optional)"
        value={sessionConfig.description || ''}
        onChange={(e) => updateSessionConfig({ description: e.target.value })}
        margin="normal"
        multiline
        rows={2}
        helperText="Brief description of what this scan session will do"
      />

      <FormControl component="fieldset" sx={{ mt: 3, width: '100%' }}>
        <FormLabel component="legend">Scan Scope Type</FormLabel>
        <RadioGroup
          value={sessionConfig.scope.type}
          onChange={(e) => updateScopeType(e.target.value as SessionConfig['scope']['type'])}
        >
          <FormControlLabel value="preset" control={<Radio />} label="Use Preset" />
          <FormControlLabel value="watchlist" control={<Radio />} label="Scan Watchlist" />
          <FormControlLabel value="custom" control={<Radio />} label="Custom Symbols" />
        </RadioGroup>
      </FormControl>

      {sessionConfig.scope.type === 'preset' && (
        <Box sx={{ mt: 3 }}>
          <FormLabel component="legend">Select Preset</FormLabel>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {availablePresets.map((preset) => (
              <Card
                key={preset.id}
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  borderColor: sessionConfig.scope.presetId === preset.id ? 'primary.main' : 'divider',
                  bgcolor: sessionConfig.scope.presetId === preset.id ? 'primary.50' : 'background.paper',
                }}
                onClick={() => updateSessionConfig({ 
                  scope: { ...sessionConfig.scope, presetId: preset.id },
                  signals: preset.signals,
                  rankingConfig: preset.rankingConfig,
                })}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {preset.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {preset.description}
                      </Typography>
                    </Box>
                    <Chip 
                      label={`${preset.signals.length} signals`} 
                      size="small" 
                      color={preset.isDefault ? 'primary' : 'default'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      Category: {preset.category}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Used {preset.usageCount} times
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Success: {preset.successRate}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {sessionConfig.scope.type === 'custom' && (
        <Box sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Custom Symbols"
            placeholder="AAPL, MSFT, GOOGL, AMZN, TSLA"
            value={sessionConfig.scope.symbols?.join(', ') || ''}
            onChange={(e) => {
              const symbols = e.target.value.split(',').map(s => s.trim()).filter(s => s);
              updateSessionConfig({ 
                scope: { ...sessionConfig.scope, symbols }
              });
            }}
            helperText="Enter symbols separated by commas"
            multiline
            rows={3}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {sessionConfig.scope.symbols?.length || 0} symbols entered
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Step 2: Signal Configuration
  const renderSignalConfiguration = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Signals
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select which signals to scan for and adjust their parameters.
      </Typography>

      <FormGroup>
        {sessionConfig.signals.map((signal) => (
          <Paper key={signal.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={signal.enabled}
                      onChange={(e) => updateSignalConfig(signal.id, { enabled: e.target.checked })}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle2">{signal.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {signal.description}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
              <Tooltip title="Signal weight in ranking">
                <Chip
                  label={`${signal.weight}% weight`}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            </Box>

            {signal.enabled && (
              <Box sx={{ mt: 2, pl: 4 }}>
                <Box sx={{ mb: 2 }}>
                  <FormLabel component="legend">Weight in Ranking</FormLabel>
                  <Slider
                    value={signal.weight}
                    onChange={(_, value) => updateSignalConfig(signal.id, { weight: value as number })}
                    min={0}
                    max={100}
                    step={5}
                    valueLabelDisplay="auto"
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Higher weight means this signal contributes more to the overall score
                  </Typography>
                </Box>

                {signal.threshold !== undefined && (
                  <Box>
                    <FormLabel component="legend">Threshold</FormLabel>
                    <Slider
                      value={signal.threshold}
                      onChange={(_, value) => updateSignalConfig(signal.id, { threshold: value as number })}
                      min={0}
                      max={signal.type === 'RSI' ? 100 : signal.type === 'PRICE_CHANGE' ? 20 : 10}
                      step={0.1}
                      valueLabelDisplay="auto"
                      sx={{ mt: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Current: {signal.threshold.toFixed(1)}
                      {signal.type === 'RSI' ? ' (RSI value)' :
                       signal.type === 'PRICE_CHANGE' ? '% price change' :
                       signal.type === 'VOLUME' ? 'x volume multiplier' : ' signal threshold'}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        ))}
      </FormGroup>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          Signals with higher weights contribute more to the overall opportunity score.
          Adjust thresholds to control sensitivity.
        </Typography>
      </Alert>
    </Box>
  );

  // Step 3: Ranking & Filtering
  const renderRankingFiltering = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Ranking & Filtering
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure how opportunities are ranked and filtered.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Ranking Configuration
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <FormLabel component="legend">Confidence Threshold</FormLabel>
            <Slider
              value={sessionConfig.rankingConfig.confidenceThreshold}
              onChange={(_, value) => updateSessionConfig({
                rankingConfig: { ...sessionConfig.rankingConfig, confidenceThreshold: value as number }
              })}
              min={0}
              max={100}
              step={5}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: '0%' },
                { value: 50, label: '50%' },
                { value: 100, label: '100%' },
              ]}
            />
            <Typography variant="caption" color="text.secondary">
              Only show opportunities with at least {sessionConfig.rankingConfig.confidenceThreshold}% confidence
            </Typography>
          </Box>

          <Box>
            <FormLabel component="legend">Maximum Results</FormLabel>
            <Slider
              value={sessionConfig.rankingConfig.maxResults}
              onChange={(_, value) => updateSessionConfig({
                rankingConfig: { ...sessionConfig.rankingConfig, maxResults: value as number }
              })}
              min={1}
              max={200}
              step={1}
              valueLabelDisplay="auto"
              marks={[
                { value: 1, label: '1' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
                { value: 200, label: '200' },
              ]}
            />
            <Typography variant="caption" color="text.secondary">
              Show up to {sessionConfig.rankingConfig.maxResults} top opportunities
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Ranking Weights
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Adjust how different factors contribute to the overall ranking.
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <FormLabel component="legend">Signal Weight: {sessionConfig.rankingConfig.signalWeight}%</FormLabel>
              <Slider
                value={sessionConfig.rankingConfig.signalWeight}
                onChange={(_, value) => updateSessionConfig({
                  rankingConfig: { ...sessionConfig.rankingConfig, signalWeight: value as number }
                })}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box>
              <FormLabel component="legend">Volume Weight: {sessionConfig.rankingConfig.volumeWeight}%</FormLabel>
              <Slider
                value={sessionConfig.rankingConfig.volumeWeight}
                onChange={(_, value) => updateSessionConfig({
                  rankingConfig: { ...sessionConfig.rankingConfig, volumeWeight: value as number }
                })}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box>
              <FormLabel component="legend">Price Change Weight: {sessionConfig.rankingConfig.changeWeight}%</FormLabel>
              <Slider
                value={sessionConfig.rankingConfig.changeWeight}
                onChange={(_, value) => updateSessionConfig({
                  rankingConfig: { ...sessionConfig.rankingConfig, changeWeight: value as number }
                })}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box>
              <FormLabel component="legend">Recency Weight: {sessionConfig.rankingConfig.recencyWeight}%</FormLabel>
              <Slider
                value={sessionConfig.rankingConfig.recencyWeight}
                onChange={(_, value) => updateSessionConfig({
                  rankingConfig: { ...sessionConfig.rankingConfig, recencyWeight: value as number }
                })}
                min={0}
                max={100}
                step={5}
                valueLabelDisplay="auto"
              />
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );

  // Step 4: Review & Launch
  const renderReviewLaunch = () => {
    const selectedPreset = availablePresets.find(p => p.id === sessionConfig.scope.presetId);
    
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Review & Launch
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Review your configuration and launch the scan session.
        </Typography>

        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Session Summary
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Session Name:</Typography>
              <Typography variant="body2" fontWeight="medium">{sessionConfig.name}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Scope Type:</Typography>
              <Typography variant="body2" fontWeight="medium">{sessionConfig.scope.type}</Typography>
            </Box>
            
            {sessionConfig.scope.type === 'preset' && selectedPreset && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Selected Preset:</Typography>
                <Typography variant="body2" fontWeight="medium">{selectedPreset.name}</Typography>
              </Box>
            )}
            
            {sessionConfig.scope.type === 'custom' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Custom Symbols:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {sessionConfig.scope.symbols?.length || 0} symbols
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Enabled Signals:</Typography>
              <Typography variant="body2" fontWeight="medium">
                {sessionConfig.signals.filter(s => s.enabled).length} of {sessionConfig.signals.length}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Confidence Threshold:</Typography>
              <Typography variant="body2" fontWeight="medium">
                {sessionConfig.rankingConfig.confidenceThreshold}%
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Maximum Results:</Typography>
              <Typography variant="body2" fontWeight="medium">
                {sessionConfig.rankingConfig.maxResults}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Estimated scan time: {selectedPreset ? '2-5 minutes' : 'Varies based on symbol count'}
          </Typography>
        </Alert>
      </Box>
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderScopeSelection();
      case 1:
        return renderSignalConfiguration();
      case 2:
        return renderRankingFiltering();
      case 3:
        return renderReviewLaunch();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Please fix the following errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Card sx={{ mb: 4 }}>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={handleCancel}
          color="inherit"
        >
          Cancel
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep > 0 && (
            <Button
              onClick={handleBack}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
          )}
          
          {activeStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              variant="contained"
              color="success"
              startIcon={<PlayArrowIcon />}
              disabled={submitting}
            >
              {submitting ? 'Creating Session...' : 'Launch Scan Session'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SessionCreationWizard;