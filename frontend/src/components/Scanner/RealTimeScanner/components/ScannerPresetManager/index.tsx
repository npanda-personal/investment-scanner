import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ContentCopy,
  Star,
  StarBorder,
  TrendingUp,
  BarChart,
  Psychology,
  Timeline,
  Save,
  Cancel,
  MoreVert,
} from '@mui/icons-material';
import { ScannerPresetManagerProps, ScanPreset } from '../../../../../types/real-time-scanner';
import realTimeScannerService from '../../../../../services/realTimeScannerService';

const ScannerPresetManager: React.FC<ScannerPresetManagerProps> = ({
  userId,
  onPresetSelect,
  onPresetSave,
}) => {
  const [presets, setPresets] = useState<ScanPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ScanPreset | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newPreset, setNewPreset] = useState<Partial<ScanPreset>>({
    name: '',
    description: '',
    category: 'technical',
    isDefault: false,
  });

  useEffect(() => {
    loadPresets();
  }, [userId]);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const data = await realTimeScannerService.fetchScanPresets();
      setPresets(data);
      setError(null);
    } catch (err) {
      setError('Failed to load presets');
      console.error('Error loading presets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (preset: ScanPreset) => {
    setSelectedPreset(preset);
    if (onPresetSelect) {
      onPresetSelect(preset);
    }
  };

  const handleSavePreset = async () => {
    try {
      if (!newPreset.name || !newPreset.description) {
        setError('Name and description are required');
        return;
      }

      const presetToSave: Omit<ScanPreset, 'id' | 'createdAt' | 'updatedAt'> = {
        name: newPreset.name!,
        description: newPreset.description!,
        category: newPreset.category || 'technical',
        scopeType: 'preset',
        scopeData: { presetId: 'new-preset' },
        signals: [],
        rankingConfig: {
          signalWeight: 40,
          volumeWeight: 20,
          changeWeight: 20,
          recencyWeight: 20,
          confidenceThreshold: 60,
          maxResults: 50,
        },
        isDefault: newPreset.isDefault || false,
        usageCount: 0,
        successRate: 0,
      };

      const savedPreset = await realTimeScannerService.createScanPreset(presetToSave);
      setPresets([...presets, savedPreset]);
      setEditDialogOpen(false);
      setNewPreset({
        name: '',
        description: '',
        category: 'technical',
        isDefault: false,
      });

      if (onPresetSave) {
        onPresetSave(savedPreset);
      }
    } catch (err) {
      setError('Failed to save preset');
      console.error('Error saving preset:', err);
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    try {
      await realTimeScannerService.deleteScanPreset(presetId);
      setPresets(presets.filter(p => p.id !== presetId));
      if (selectedPreset?.id === presetId) {
        setSelectedPreset(null);
      }
      setDeleteDialogOpen(false);
    } catch (err) {
      setError('Failed to delete preset');
      console.error('Error deleting preset:', err);
    }
  };

  const handleSetDefault = async (presetId: string) => {
    try {
      // Update all presets to not be default
      const updatedPresets = presets.map(preset => ({
        ...preset,
        isDefault: preset.id === presetId,
      }));
      
      // Update the specific preset
      const presetToUpdate = presets.find(p => p.id === presetId);
      if (presetToUpdate) {
        const updatedPreset = await realTimeScannerService.updateScanPreset(presetId, {
          ...presetToUpdate,
          isDefault: true,
        });
        
        setPresets(updatedPresets.map(p => p.id === presetId ? updatedPreset : p));
      }
    } catch (err) {
      setError('Failed to set default preset');
      console.error('Error setting default preset:', err);
    }
  };

  const handleDuplicatePreset = async (preset: ScanPreset) => {
    try {
      const duplicatedPreset: Omit<ScanPreset, 'id' | 'createdAt' | 'updatedAt'> = {
        ...preset,
        name: `${preset.name} (Copy)`,
        description: `Copy of ${preset.description}`,
        isDefault: false,
        usageCount: 0,
      };

      const savedPreset = await realTimeScannerService.createScanPreset(duplicatedPreset);
      setPresets([...presets, savedPreset]);
    } catch (err) {
      setError('Failed to duplicate preset');
      console.error('Error duplicating preset:', err);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical':
        return 'primary';
      case 'momentum':
        return 'success';
      case 'fundamental':
        return 'warning';
      case 'volatility':
        return 'error';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical':
        return <Psychology />;
      case 'momentum':
        return <TrendingUp />;
      case 'fundamental':
        return <BarChart />;
      case 'volatility':
        return <Timeline />;
      default:
        return <Psychology />;
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography>Loading presets...</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight="medium">
              Scanner Preset Manager
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Manage and organize your scanning configurations
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setEditDialogOpen(true)}
          >
            New Preset
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Total Presets
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {presets.length}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Default Preset
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {presets.find(p => p.isDefault)?.name || 'None'}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Total Usage
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {presets.reduce((sum, preset) => sum + preset.usageCount, 0)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Avg Success Rate
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {presets.length > 0
                  ? `${(presets.reduce((sum, preset) => sum + (preset.successRate || 0), 0) / presets.length).toFixed(1)}%`
                  : '0%'
                }
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Preset Grid */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 3 }}>
          Available Presets
        </Typography>

        {presets.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              No presets found. Create your first preset to get started.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setEditDialogOpen(true)}
            >
              Create First Preset
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {presets.map((preset) => (
              <Grid item xs={12} md={6} lg={4} key={preset.id}>
                <Card
                  variant={selectedPreset?.id === preset.id ? 'elevation' : 'outlined'}
                  elevation={selectedPreset?.id === preset.id ? 2 : 0}
                  sx={{
                    cursor: 'pointer',
                    borderColor: selectedPreset?.id === preset.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'primary.light',
                      boxShadow: 1,
                    },
                  }}
                  onClick={() => handlePresetSelect(preset)}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Preset header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          {getCategoryIcon(preset.category)}
                          <Typography variant="subtitle2" fontWeight="medium">
                            {preset.name}
                          </Typography>
                          {preset.isDefault && (
                            <Tooltip title="Default preset">
                              <Star color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {preset.description}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={(e) => {
                        e.stopPropagation();
                        // Handle menu
                      }}>
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Category and stats */}
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip
                        label={preset.category}
                        size="small"
                        color={getCategoryColor(preset.category)}
                        variant="outlined"
                      />
                      <Chip
                        label={`${preset.signals.length} signals`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${preset.usageCount} uses`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    {/* Success rate */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Success Rate
                        </Typography>
                        <Typography variant="caption" fontWeight="medium">
                          {preset.successRate}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={preset.successRate || 0}
                        color={(preset.successRate || 0) > 80 ? 'success' : (preset.successRate || 0) > 60 ? 'warning' : 'error'}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>

                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Set as default">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(preset.id);
                          }}
                        >
                          {preset.isDefault ? <Star color="warning" /> : <StarBorder />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePreset(preset);
                          }}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPreset(preset);
                            setDeleteDialogOpen(true);
                          }}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Box sx={{ flexGrow: 1 }} />
                      <Button
                        size="small"
                        variant={selectedPreset?.id === preset.id ? 'contained' : 'outlined'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePresetSelect(preset);
                        }}
                      >
                        {selectedPreset?.id === preset.id ? 'Selected' : 'Select'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Create/Edit Preset Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Preset</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Preset Name"
              value={newPreset.name}
              onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newPreset.description}
              onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newPreset.category}
                label="Category"
                onChange={(e) => setNewPreset({ ...newPreset, category: e.target.value })}
              >
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="momentum">Momentum</MenuItem>
                <MenuItem value="fundamental">Fundamental</MenuItem>
                <MenuItem value="volatility">Volatility</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={newPreset.isDefault || false}
                  onChange={(e) => setNewPreset({ ...newPreset, isDefault: e.target.checked })}
                />
              }
              label="Set as default preset"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePreset} variant="contained" startIcon={<Save />}>
            Save Preset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Preset</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedPreset?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => selectedPreset && handleDeletePreset(selectedPreset.id)}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScannerPresetManager;