import Chip from '@mui/material/Chip';
import { alpha } from '@mui/material/styles';

type StatusBadgeProps = {
  label: string | number | null | undefined;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
};

const success = new Set(['GOOD', 'READY', 'LIQUID', 'BULLISH', 'HEALTHY', 'SENT', 'ACTIVE', 'COMPLETE', 'HIGH', 'ACCUMULATION']);
const warning = new Set(['PARTIAL', 'LIMITED', 'THIN', 'UNKNOWN', 'NEUTRAL', 'WATCH', 'PENDING', 'TRIAL', 'MEDIUM']);
const error = new Set(['POOR', 'UNUSABLE', 'NOT_READY', 'ILLIQUID', 'BEARISH', 'AT_RISK', 'FAILED', 'ERROR', 'LOW', 'DISTRIBUTION', 'CRITICAL']);

export function statusColor(value: string | number | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  const normalized = String(value ?? '').toUpperCase();
  if (success.has(normalized)) return 'success';
  if (warning.has(normalized)) return 'warning';
  if (error.has(normalized)) return 'error';
  return 'default';
}

export function StatusBadge({ label, size = 'small', variant = 'outlined' }: StatusBadgeProps) {
  const text = label === null || label === undefined || label === '' ? 'N/A' : String(label);
  const color = statusColor(text);
  const resolvedVariant = variant === 'outlined' && color === 'error' ? 'filled' : variant;

  return (
    <Chip
      size={size}
      variant={resolvedVariant}
      label={text}
      color={resolvedVariant === 'filled' ? color : 'default'}
      sx={(theme) => {
        if (resolvedVariant === 'filled') return {};

        if (color === 'success') {
          return {
            color: theme.palette.success.dark,
            borderColor: alpha(theme.palette.success.main, 0.55),
            backgroundColor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.2 : 0.1),
          };
        }
        if (color === 'warning') {
          return {
            color: theme.palette.warning.dark,
            borderColor: alpha(theme.palette.warning.main, 0.6),
            backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
          };
        }
        if (color === 'error') {
          return {
            color: theme.palette.error.dark,
            borderColor: alpha(theme.palette.error.main, 0.6),
            backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.24 : 0.1),
          };
        }
        return {
          color: theme.palette.text.secondary,
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.common.white, 0.04)
            : alpha(theme.palette.common.black, 0.02),
        };
      }}
    />
  );
}
