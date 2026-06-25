/**
 * Shared primitive components and local format utilities for market-intelligence views.
 * These are leaf-level — they import nothing from other extracted files in this module.
 */
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Local format utilities
// ---------------------------------------------------------------------------

export function formatOptional(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  if (typeof value === 'number') return new Intl.NumberFormat().format(value);
  return value;
}

export function formatRatioPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unavailable';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
}

export function formatPercentPoints(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unavailable';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function formatEnum(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(value).toLocaleDateString() : value;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unavailable';
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(value).toLocaleString() : value;
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

export function ScoreCard({ label, value }: { label: string; value: ReactNode }) {
  // If value is a Stack/Box already (NR-21 health trend), render it directly;
  // otherwise wrap in the standard h6 typography.
  const isComposite = value !== null && typeof value === 'object';
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {isComposite
        ? value
        : <Typography variant="h6" fontWeight={800}>{value}</Typography>}
    </Paper>
  );
}

export function HealthBadge({ label }: { label: string }) {
  return <Chip label={label} color={label.toLowerCase().includes('risk') ? 'warning' : 'primary'} variant="outlined" />;
}

export function ReasonTags({ tags }: { tags: string[] }) {
  return <TagList values={tags} emptyLabel="No reasons." />;
}

export function RiskTags({ tags }: { tags: string[] }) {
  return <TagList values={tags} emptyLabel="No risks." tone="warning" />;
}

export function TagList({ values, emptyLabel, tone = 'default' }: { values: string[]; emptyLabel: string; tone?: 'default' | 'warning' }) {
  if (values.length === 0) return <Typography variant="body2" color="text.secondary">{emptyLabel}</Typography>;
  return (
    <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
      {values.map((value) => (
        tone === 'warning'
          ? <Chip key={value} label={value} color="warning" variant="outlined" size="small" />
          : <HealthBadge key={value} label={value} />
      ))}
    </Stack>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <Alert severity="info">
      <Stack spacing={0.5}>
        <Typography fontWeight={800}>{title}</Typography>
        {message && <Typography variant="body2">{message}</Typography>}
      </Stack>
    </Alert>
  );
}

export function DataUnavailableState({ title, message, warnings, suggestionLink }: { title: string; message: string; warnings: string[]; suggestionLink?: { to: string; label: string } }) {
  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      <Stack spacing={0.75}>
        <Typography fontWeight={800}>{title}</Typography>
        <Typography variant="body2">{message}</Typography>
        <Typography variant="body2">No placeholder rows are shown.</Typography>
        {suggestionLink && (
          <Button size="small" component={RouterLink} to={suggestionLink.to} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
            {suggestionLink.label}
          </Button>
        )}
        {warnings.map((warning) => <Typography key={warning} variant="caption" color="text.secondary">{warning}</Typography>)}
      </Stack>
    </Alert>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={800}>{title}</Typography>
      {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
    </Box>
  );
}

export function SectionPanel({ title, headerBadge, children }: { title: string; headerBadge?: ReactNode; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.25}>
        {headerBadge ? (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <SectionHeader title={title} />
            {headerBadge}
          </Stack>
        ) : (
          <SectionHeader title={title} />
        )}
        {children}
      </Stack>
    </Paper>
  );
}
