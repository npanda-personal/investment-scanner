import Chip from '@mui/material/Chip';

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
  return <Chip size={size} variant={variant} label={text} color={statusColor(text)} />;
}
