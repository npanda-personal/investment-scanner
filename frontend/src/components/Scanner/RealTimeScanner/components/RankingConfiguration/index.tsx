import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  Timeline,
  BarChart,
  FilterList,
  Settings,
  Restore,
  Lightbulb,
  Psychology,
} from '@mui/icons-material';
import { RankingConfigurationProps, RankingConfig } from '../../../../../types/real-time-scanner';

// Preset ranking configurations
const RANKING_PRESETS = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Equal weight across all factors',
    config: {
      signalWeight: 40,
      volumeWeight: 20,
      changeWeight: 20,
      recencyWeight: 20,
      confidenceThreshold: 60,
      maxResults: 50,
    },
  },
  {
    id: 'momentum',
    name: 'Momentum Focus',
    description: 'Emphasizes recent price changes and volume',
    config: {
      signalWeight: 30,
      volumeWeight: 30,
      changeWeight: 30,
      recencyWeight: 10,
      confidenceThreshold: 65,
      maxResults: 30,
    },
  },
  {
    id: 'technical',
    name: 'Technical Signals',
    description: 'Focuses on technical indicator signals',
    config: {
      signalWeight: 60,
      volumeWeight: 15,
      changeWeight: 15,
      recencyWeight: 10,
      confidenceThreshold: 70,
      maxResults: 40,
    },
  },
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'High confidence threshold, fewer results',
    config: {
      signalWeight: 35,
      volumeWeight: 25,
      changeWeight: 20,
      recencyWeight: 20,
      confidenceThreshold: 75,
      maxResults: 20,
    },
  },
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'Lower threshold, more opportunities',
    config: {
      signalWeight: 25,
      volumeWeight: 25,
      changeWeight: 25,
      recencyWeight: 25,
      confidenceThreshold: 50,
      maxResults: 100,
    },
  },
];

const RankingConfiguration: React.FC<RankingConfigurationProps> = ({
  initialWeights,
  onChange,
  showPresets = true,
}) => {
  const [weights, setWeights] = useState<RankingConfig>(initialWeights);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [totalWeight, setTotalWeight] = useState<number>(0);

  // Calculate total weight whenever weights change
  useEffect(() => {
    const total = weights.signalWeight + weights.volumeWeight + 
                  weights.changeWeight + weights.recencyWeight;
    setTotalWeight(total);
  }, [weights]);

  // Normalize weights to sum to 100
  const normalizeWeights = () => {
    if (totalWeight === 100) return;

    const scale = 100 / totalWeight;
    const normalized: RankingConfig = {
      ...weights,
      signalWeight: Math.round(weights.signalWeight * scale),
      volumeWeight: Math.round(weights.volumeWeight * scale),
      changeWeight: Math.round(weights.changeWeight * scale),
      recencyWeight: Math.round(weights.recencyWeight * scale),
    };

    // Adjust to ensure exact sum of 100
    const adjustedTotal = normalized.signalWeight + normalized.volumeWeight + 
                         normalized.changeWeight + normalized.recencyWeight;
    const diff = 100 - adjustedTotal;
    
    if (diff !== 0) {
      // Add the difference to the largest weight
      const weightsArray = [
        { key: 'signalWeight', value: normalized.signalWeight },
        { key: 'volumeWeight', value: normalized.volumeWeight },
        { key: 'changeWeight', value: normalized.changeWeight },
        { key: 'recencyWeight', value: normalized.recencyWeight },
      ];
      
      const maxWeight = weightsArray.reduce((max, curr) => 
        curr.value > max.value ? curr : max
      );
      
      normalized[maxWeight.key as keyof RankingConfig] = 
        (normalized[maxWeight.key as keyof RankingConfig] as number) + diff;
    }

    setWeights(normalized);
    onChange(normalized);
  };

  const handleWeightChange = (key: keyof RankingConfig, value: number) => {
    const newWeights = { ...weights, [key]: value };
    setWeights(newWeights);
    onChange(newWeights);
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = RANKING_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setWeights(preset.config);
      setSelectedPreset(presetId);
      onChange(preset.config);
    }
  };

  const handleReset = () => {
    setWeights(initialWeights);
    setSelectedPreset('');
    onChange(initialWeights);
  };

  const getWeightColor = (value: number) => {
    if (value < 15) return 'info';
    if (value < 25) return 'success';
    if (value < 35) return 'warning';
    return 'error';
  };

  const getWeightDescription = (key: keyof RankingConfig) => {
    switch (key) {
      case 'signalWeight':
        return 'Technical signal strength and confidence';
      case 'volumeWeight':
        return 'Trading volume and liquidity indicators';
      case 'changeWeight':
        return 'Recent price movement and momentum';
      case 'recencyWeight':
        return 'How recent the signal was detected';
      case 'confidenceThreshold':
        return 'Minimum confidence score to include results';
      case 'maxResults':
        return 'Maximum number of opportunities to return';
      default:
        return '';
    }
  };

  const getWeightIcon = (key: keyof RankingConfig) => {
    switch (key) {
      case 'signalWeight':
        return <Psychology />;
      case 'volumeWeight':
        return <BarChart />;
      case 'changeWeight':
        return <TrendingUp />;
      case 'recencyWeight':
        return <Timeline />;
      case 'confidenceThreshold':
        return <Lightbulb />;
      case 'maxResults':
        return <FilterList />;
      default:
        return <Settings />;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {showPresets && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="medium">
              Ranking Presets
            </Typography>
            <Tooltip title="Reset to initial weights">
              <IconButton onClick={handleReset} size="small">
                <Restore />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Grid container spacing={2}>
            {RANKING_PRESETS.map((preset) => (
              <Grid item xs={12} sm={6} md={4} key={preset.id}>
                <Card
                  variant={selectedPreset === preset.id ? 'elevation' : 'outlined'}
                  elevation={selectedPreset === preset.id ? 2 : 0}
                  sx={{
                    cursor: 'pointer',
                    borderColor: selectedPreset === preset.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'primary.light',
                      boxShadow: 1,
                    },
                  }}
                  onClick={() => handlePresetSelect(preset.id)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {preset.name}
                      </Typography>
                      {selectedPreset === preset.id && (
                        <Chip label="Selected" size="small" color="primary" />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                      {preset.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        label={`Sig: ${preset.config.signalWeight}%`}
                        variant="outlined"
                        color={getWeightColor(preset.config.signalWeight)}
                      />
                      <Chip
                        size="small"
                        label={`Vol: ${preset.config.volumeWeight}%`}
                        variant="outlined"
                        color={getWeightColor(preset.config.volumeWeight)}
                      />
                      <Chip
                        size="small"
                        label={`Chg: ${preset.config.changeWeight}%`}
                        variant="outlined"
                        color={getWeightColor(preset.config.changeWeight)}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="medium" sx={{ mb: 3 }}>
          Custom Ranking Configuration
        </Typography>

        {/* Weight distribution section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              Weight Distribution
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color={totalWeight === 100 ? 'success.main' : 'error.main'}>
                Total: {totalWeight}%
              </Typography>
              {totalWeight !== 100 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={normalizeWeights}
                  sx={{ ml: 1 }}
                >
                  Normalize to 100%
                </Button>
              )}
            </Box>
          </Box>

          <Grid container spacing={3}>
            {(['signalWeight', 'volumeWeight', 'changeWeight', 'recencyWeight'] as const).map((key) => (
              <Grid item xs={12} sm={6} key={key}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    {getWeightIcon(key)}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {key.replace('Weight', ' Weight')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getWeightDescription(key)}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${weights[key]}%`}
                      color={getWeightColor(weights[key])}
                      size="small"
                    />
                  </Box>
                  <Slider
                    value={weights[key]}
                    onChange={(_, value) => handleWeightChange(key, value as number)}
                    min={0}
                    max={100}
                    step={1}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 25, label: '25%' },
                      { value: 50, label: '50%' },
                      { value: 75, label: '75%' },
                      { value: 100, label: '100%' },
                    ]}
                    valueLabelDisplay="auto"
                    sx={{ mt: 2 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Threshold and results section */}
        <Box>
          <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
            Filtering & Results
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Lightbulb />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      Confidence Threshold
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Minimum confidence score to include results
                    </Typography>
                  </Box>
                  <Chip
                    label={`${weights.confidenceThreshold}%`}
                    color={weights.confidenceThreshold > 70 ? 'success' : 
                           weights.confidenceThreshold > 60 ? 'warning' : 'error'}
                    size="small"
                  />
                </Box>
                <Slider
                  value={weights.confidenceThreshold}
                  onChange={(_, value) => handleWeightChange('confidenceThreshold', value as number)}
                  min={0}
                  max={100}
                  step={5}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                  ]}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Low (more results)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    High (fewer, higher quality)
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <FilterList />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      Maximum Results
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Limit number of opportunities returned
                    </Typography>
                  </Box>
                  <Chip
                    label={`${weights.maxResults}`}
                    color="default"
                    size="small"
                  />
                </Box>
                <Slider
                  value={weights.maxResults}
                  onChange={(_, value) => handleWeightChange('maxResults', value as number)}
                  min={10}
                  max={200}
                  step={10}
                  marks={[
                    { value: 10, label: '10' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' },
                    { value: 150, label: '150' },
                    { value: 200, label: '200' },
                  ]}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Few (top picks)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Many (comprehensive)
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Summary section */}
        <Paper variant="outlined" sx={{ p: 3, mt: 3, bgcolor: 'action.hover' }}>
          <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
            Configuration Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Signal Weight
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {weights.signalWeight}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Volume Weight
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  {weights.volumeWeight}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Change Weight
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="warning.main">
                  {weights.changeWeight}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Recency Weight
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="info.main">
                  {weights.recencyWeight}%
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Confidence Threshold
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {weights.confidenceThreshold}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Max Results
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {weights.maxResults}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Weight
              </Typography>
              <Typography
                variant="body2"
                fontWeight="medium"
                color={totalWeight === 100 ? 'success.main' : 'error.main'}
              >
                {totalWeight}%
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Paper>
    </Box>
  );
};

export default RankingConfiguration;