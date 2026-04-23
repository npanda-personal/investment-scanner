import React from 'react';
import {
  Box,
  LinearProgress,
  CircularProgress,
  Typography,
  Paper,
  Grid,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Schedule,
  PlayCircle,
  Cancel,
  TrendingUp,
  Speed,
  Timer,
} from '@mui/icons-material';
import { ProgressTrackingProps } from '../../../../../types/real-time-scanner';

const ProgressTracking: React.FC<ProgressTrackingProps> = ({
  progress,
  showChunkDetails = true,
  showTimeEstimate = true,
  showMetrics = true,
  size = 'medium',
  variant = 'linear',
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PROCESSING':
        return 'primary';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle />;
      case 'PROCESSING':
        return <PlayCircle />;
      case 'PENDING':
        return <Schedule />;
      case 'FAILED':
        return <Error />;
      case 'CANCELLED':
        return <Cancel />;
      default:
        return <Schedule />;
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const calculateTimeRemaining = () => {
    if (progress.processingRate <= 0 || progress.progress >= 100) return 0;
    const remainingSymbols = progress.totalSymbols - progress.symbolsProcessed;
    return remainingSymbols / progress.processingRate;
  };

  const getProgressVariant = (): 'determinate' | 'indeterminate' | 'buffer' | 'query' => {
    if (progress.status === 'COMPLETED') return 'determinate';
    if (progress.status === 'FAILED' || progress.status === 'CANCELLED') return 'determinate';
    return 'determinate';
  };

  const getProgressValue = () => {
    if (progress.status === 'COMPLETED') return 100;
    if (progress.status === 'FAILED' || progress.status === 'CANCELLED') return progress.progress;
    return progress.progress;
  };

  const timeRemaining = calculateTimeRemaining();

  // Size-based styling
  const sizeConfig = {
    small: {
      spacing: 1,
      fontSize: '0.75rem',
      iconSize: 16,
      progressHeight: 4,
    },
    medium: {
      spacing: 2,
      fontSize: '0.875rem',
      iconSize: 20,
      progressHeight: 6,
    },
    large: {
      spacing: 3,
      fontSize: '1rem',
      iconSize: 24,
      progressHeight: 8,
    },
  };

  const config = sizeConfig[size];

  if (variant === 'circular') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: config.spacing }}>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant="determinate"
            value={getProgressValue()}
            size={config.iconSize * 4}
            thickness={4}
            color={getStatusColor(progress.status) as any}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="caption" component="div" color="text.secondary">
              {`${Math.round(getProgressValue())}%`}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Chip
            icon={getStatusIcon(progress.status)}
            label={progress.status}
            size="small"
            color={getStatusColor(progress.status) as any}
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {progress.symbolsProcessed} / {progress.totalSymbols} symbols
          </Typography>
        </Box>
      </Box>
    );
  }

  if (variant === 'stepper') {
    const steps = [
      { label: 'Pending', status: 'PENDING' },
      { label: 'Processing', status: 'PROCESSING' },
      { label: 'Completed', status: 'COMPLETED' },
    ];

    const activeStep = steps.findIndex(step => step.status === progress.status);
    
    return (
      <Box sx={{ maxWidth: 400 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label} completed={index < activeStep}>
              <StepLabel
                StepIconProps={{
                  icon: getStatusIcon(step.status),
                }}
              >
                {step.label}
              </StepLabel>
              <StepContent>
                {index === 1 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Processing {progress.symbolsProcessed} of {progress.totalSymbols} symbols
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getProgressValue()}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                )}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Box>
    );
  }

  // Default linear variant
  return (
    <Paper variant="outlined" sx={{ p: config.spacing }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: config.spacing }}>
        {/* Header with status and progress */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon(progress.status)}
            <Typography variant="subtitle2" fontWeight="medium">
              Scan Progress
            </Typography>
          </Box>
          <Chip
            label={progress.status}
            size="small"
            color={getStatusColor(progress.status) as any}
            variant="outlined"
          />
        </Box>

        {/* Main progress bar */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {progress.symbolsProcessed} / {progress.totalSymbols} symbols
            </Typography>
            <Typography variant="caption" fontWeight="medium">
              {getProgressValue().toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant={getProgressVariant()}
            value={getProgressValue()}
            color={getStatusColor(progress.status) as any}
            sx={{ height: config.progressHeight, borderRadius: 1 }}
          />
        </Box>

        {/* Metrics row */}
        {showMetrics && (
          <Grid container spacing={1}>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                  <TrendingUp sx={{ fontSize: config.iconSize }} />
                  <Typography variant="caption" fontWeight="medium">
                    Rate
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {progress.processingRate.toFixed(1)}/s
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                  <Speed sx={{ fontSize: config.iconSize }} />
                  <Typography variant="caption" fontWeight="medium">
                    Found
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {progress.opportunitiesFound}
                </Typography>
              </Paper>
            </Grid>
            {showTimeEstimate && timeRemaining > 0 && (
              <Grid item xs={6} sm={3}>
                <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                    <Timer sx={{ fontSize: config.iconSize }} />
                    <Typography variant="caption" fontWeight="medium">
                      ETA
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="bold">
                    {formatTime(timeRemaining)}
                  </Typography>
                </Paper>
              </Grid>
            )}
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                  <CheckCircle sx={{ fontSize: config.iconSize }} />
                  <Typography variant="caption" fontWeight="medium">
                    Progress
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {getProgressValue().toFixed(0)}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Chunk details */}
        {showChunkDetails && progress.chunks && progress.chunks.length > 0 && (
          <>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Parallel Processing Chunks
              </Typography>
              <Grid container spacing={1}>
                {progress.chunks.map((chunk) => (
                  <Grid item xs={12} sm={6} md={4} key={chunk.index}>
                    <Card variant="outlined" sx={{ p: 1 }}>
                      <CardContent sx={{ p: '0 !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" fontWeight="medium">
                            Chunk {chunk.index + 1}
                          </Typography>
                          <Chip
                            label={chunk.status}
                            size="small"
                            color={getStatusColor(chunk.status) as any}
                            variant="outlined"
                          />
                        </Box>
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {chunk.processed} / {chunk.total}
                            </Typography>
                            <Typography variant="caption" fontWeight="medium">
                              {chunk.total > 0 ? ((chunk.processed / chunk.total) * 100).toFixed(0) : 0}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={chunk.total > 0 ? (chunk.processed / chunk.total) * 100 : 0}
                            color={getStatusColor(chunk.status) as any}
                            sx={{ height: 4, borderRadius: 1 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {chunk.symbols.slice(0, 3).join(', ')}
                          {chunk.symbols.length > 3 && '...'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </>
        )}

        {/* Estimated completion */}
        {showTimeEstimate && progress.estimatedCompletion && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule sx={{ fontSize: config.iconSize, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Estimated completion: {new Date(progress.estimatedCompletion).toLocaleTimeString()}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ProgressTracking;
