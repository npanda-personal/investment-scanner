import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { CalibrationPageSummary } from '@/features/signal-calibration-engine/types';
import type { CalibrationEvidenceSummaryDisplayState, DashboardSectionState } from '../types';

const calibrationHorizonOptions = ['5D', '10D', '20D', '40D'] as const;

type Props = {
  scopeLabel: string;
  horizon: string;
  summary: DashboardSectionState<CalibrationPageSummary>;
  onHorizonChange: (horizon: string) => Promise<void>;
};

export function CalibrationEvidenceSummaryPanel({ scopeLabel, horizon, summary, onHorizonChange }: Props) {
  const data = summary.data;
  const basis = data?.calibrationEvidence.evidenceBasis ?? null;
  const readiness = data?.calibrationReadiness ?? null;
  const displayState = toDisplayState(data);
  const latestMeasurableDate = basis?.latestMeasurablePriceDate ?? null;
  const nextEvaluableDate = basis?.nextEvaluableDate ?? null;
  const reasonSummary = basis?.reasonSummary || readiness?.reasons?.[0] || summary.error || 'Calibration evidence summary is unavailable for this scope and horizon.';

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={1.5}>
          <Typography variant="h6">Calibration Evidence-Through Summary</Typography>
          <Button component={RouterLink} to="/signals/calibration" variant="outlined" endIcon={<OpenInNewIcon fontSize="small" />}>
            Open Signal Calibration
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', lg: 'row' }} gap={1} flexWrap="wrap" useFlexGap>
          <Chip label={`Scope: ${scopeLabel}`} variant="outlined" />
          <Chip label={`Horizon: ${horizon}`} variant="outlined" />
          <Chip label={displayStateLabel(displayState)} color={displayStateColor(displayState)} />
          <Chip label={`Latest measurable evidence: ${formatDate(latestMeasurableDate)}`} variant="outlined" />
        </Stack>

        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
            Horizon basis
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={horizon}
            onChange={(_event, value: string | null) => {
              if (!value) return;
              void onHorizonChange(value);
            }}
            sx={{ flexWrap: 'wrap', gap: 1 }}
          >
            {calibrationHorizonOptions.map((option) => (
              <ToggleButton key={option} value={option}>
                {option}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {summary.loading && <LinearProgress />}

        {displayState === 'WAITING' && nextEvaluableDate ? (
          <Alert severity="info">
            Waiting for maturity for {horizon}. Next evaluable date: {formatDate(nextEvaluableDate)}.
          </Alert>
        ) : null}

        {summary.error ? (
          <Alert severity="warning">
            Calibration evidence summary is unavailable for this scope and horizon: {summary.error}
          </Alert>
        ) : null}

        <Typography color="text.secondary">
          {reasonSummary}
        </Typography>
      </Stack>
    </Paper>
  );
}

function toDisplayState(summary: CalibrationPageSummary | null): CalibrationEvidenceSummaryDisplayState {
  if (!summary) return 'UNAVAILABLE';

  if (summary.calibrationEvidence.evidenceBasis.status === 'MISSING_SIGNAL_QUALITY_EVIDENCE') {
    return 'UNAVAILABLE';
  }
  if (
    summary.calibrationEvidence.evidenceBasis.status === 'HORIZON_LIMITED'
    && Boolean(summary.calibrationEvidence.evidenceBasis.nextEvaluableDate)
  ) {
    return 'WAITING';
  }
  if (summary.calibrationReadiness.status === 'UNAVAILABLE') {
    return 'UNAVAILABLE';
  }
  if (summary.calibrationReadiness.status === 'LIMITED') {
    return 'LIMITED';
  }
  return 'USABLE';
}

function displayStateLabel(state: CalibrationEvidenceSummaryDisplayState) {
  switch (state) {
    case 'WAITING':
      return 'Waiting';
    case 'LIMITED':
      return 'Limited';
    case 'USABLE':
      return 'Usable';
    default:
      return 'Unavailable';
  }
}

function displayStateColor(state: CalibrationEvidenceSummaryDisplayState): 'success' | 'warning' | 'default' {
  switch (state) {
    case 'USABLE':
      return 'success';
    case 'LIMITED':
    case 'WAITING':
      return 'warning';
    default:
      return 'default';
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleDateString();
}
