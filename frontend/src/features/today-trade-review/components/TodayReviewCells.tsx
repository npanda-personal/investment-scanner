import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { humanizeCode } from '@/shared/format/enumLabels';
import type { TodayReviewCandidate, TodayReviewEarningsProximity } from '../types';
import {
  range52wFromCandidate,
  sectorAlignment,
  sectorLeadershipColor,
  tierColor,
  type SectorLeadershipStatus,
  type TierCellContext,
} from './todayReviewTableFormat';

export const chipNoWrapSx = {
  maxWidth: '100%',
  '& .MuiChip-label': {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

export function EllipsisCell({
  fullText,
  children,
  align,
  strong = false,
}: {
  fullText: string;
  children?: ReactNode;
  align?: 'left' | 'right' | 'center';
  strong?: boolean;
}) {
  const text = fullText || '-';
  const isAbsent = text === '—';
  const tooltipTitle = isAbsent ? 'not available' : text !== '-' ? text : '';
  return (
    <Tooltip title={tooltipTitle} arrow enterDelay={350}>
      <Typography
        component="span"
        color={isAbsent ? 'text.disabled' : 'inherit'}
        sx={{
          display: 'block',
          maxWidth: '100%',
          overflow: 'hidden',
          textAlign: align,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: strong ? 700 : 400,
        }}
      >
        {children ?? text}
      </Typography>
    </Tooltip>
  );
}

export function TierChip({ tier }: { tier: TierCellContext }) {
  const isAbsent = tier.label === '—';
  const title = isAbsent
    ? 'not available'
    : tier.reason
      ? `${tier.label} - ${tier.reason}`
      : tier.label;
  return (
    <Tooltip title={title} arrow enterDelay={350}>
      <span>
        <Chip
          size="small"
          label={tier.label}
          color={isAbsent ? 'default' : tierColor(tier.status)}
          variant={tier.status === 'READY' ? 'outlined' : 'filled'}
          sx={chipNoWrapSx}
        />
      </span>
    </Tooltip>
  );
}

/**
 * Small amber chip shown on candidate list rows when results are within the
 * earnings-blackout window. Only renders when structured earningsProximity is present.
 */
export function EarningsProximityChip({ earningsProximity }: { earningsProximity?: TodayReviewEarningsProximity | null }) {
  if (!earningsProximity || earningsProximity.daysToResult === null) return null;
  const days = earningsProximity.daysToResult;
  const label = days === 0 ? 'Earnings today' : days === 1 ? 'Earnings in 1d' : `Earnings in ${days}d`;
  const dateStr = earningsProximity.resultDate ? earningsProximity.resultDate.slice(0, 10) : null;
  const sourceLabel = earningsProximity.resultDateLabel ?? (earningsProximity.resultDateSource === 'OFFICIAL_CALENDAR' ? 'Official' : 'Estimated');
  const tooltip = dateStr
    ? `${label} (${dateStr}) [${sourceLabel}] — earnings reaction window. Consider waiting for post-result price discovery.`
    : `${label} [${sourceLabel}] — earnings reaction window. Consider waiting for post-result price discovery.`;
  return (
    <Tooltip title={tooltip} arrow enterDelay={200}>
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor: 'warning.light',
          color: 'warning.contrastText',
          fontWeight: 700,
          fontSize: 10,
          height: 18,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    </Tooltip>
  );
}

/**
 * NR-100: Small amber "F&O Ban" chip — shown only when inFnoBan is true.
 * Derivatives trading is restricted for this symbol (OI > 95% MWPL).
 */
export function FnoBanChip({ inFnoBan }: { inFnoBan?: boolean }) {
  if (!inFnoBan) return null;
  return (
    <Tooltip
      title="F&O ban: this symbol's derivatives open-interest has crossed 95% of the market-wide position limit. New F&O positions are restricted until OI drops below the threshold — elevated derivatives risk."
      arrow
      enterDelay={200}
    >
      <Chip
        label="F&O Ban"
        size="small"
        sx={{
          bgcolor: 'warning.main',
          color: 'warning.contrastText',
          fontWeight: 700,
          fontSize: 10,
          height: 18,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    </Tooltip>
  );
}

/**
 * NR-101: Small chip showing the smart-money accumulation/distribution status.
 * Green for ACCUMULATION, red for DISTRIBUTION.
 */
export function SmartMoneyChip({ status, score }: { status?: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' | null; score?: number | null }) {
  if (!status) return null;
  const label = status === 'ACCUMULATION' ? 'Accumulation' : status === 'DISTRIBUTION' ? 'Distribution' : 'Neutral';
  const scoreText = typeof score === 'number' ? ` (${score})` : '';
  const tooltipText = `Smart-money: ${label}${scoreText} — derived from price-volume analysis of the latest 3-month snapshot. Research-support context only.`;
  const bgColor = status === 'ACCUMULATION' ? 'success.main' : status === 'DISTRIBUTION' ? 'error.main' : 'text.secondary';
  return (
    <Tooltip title={tooltipText} arrow enterDelay={200}>
      <Chip
        label={`SM: ${label}${scoreText}`}
        size="small"
        sx={{
          bgcolor: bgColor,
          color: '#fff',
          fontWeight: 700,
          fontSize: 10,
          height: 18,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />
    </Tooltip>
  );
}

/**
 * NR-85: Inline 52-week range position indicator (single-line bar + percent).
 */
export function RangePositionIndicator({ candidate }: { candidate: TodayReviewCandidate }) {
  const range = range52wFromCandidate(candidate);
  if (!range) {
    return (
      <Typography component="span" variant="caption" color="text.disabled" sx={{ fontSize: 10, lineHeight: 1 }}>
        52w —
      </Typography>
    );
  }
  const pct = Math.max(0, Math.min(100, range.positionPct));
  const barColor = pct >= 70 ? '#2e7d32' : pct >= 35 ? '#ed6c02' : '#d32f2f';
  const tooltipText = `52w range: low ${range.low.toFixed(2)} – high ${range.high.toFixed(2)} · current ${range.current.toFixed(2)} · ${pct.toFixed(1)}% above 52w low`;
  return (
    <Tooltip title={tooltipText} arrow enterDelay={200}>
      <Box sx={{ width: 110, userSelect: 'none' }}>
        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1, display: 'block' }}>
          {pct.toFixed(1)}% of 52w range
        </Typography>
        <Box sx={{ height: 3, borderRadius: 1.5, bgcolor: 'action.disabledBackground', mt: 0.25, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, bgcolor: barColor, borderRadius: 1.5, transition: 'width 0.2s' }} />
        </Box>
      </Box>
    </Tooltip>
  );
}

export function SectorCell({ candidate }: { candidate: TodayReviewCandidate }) {
  const sector = sectorAlignment(candidate);
  const market = candidate.marketContextSnapshot as any;
  const leadership: SectorLeadershipStatus | null = market?.sectorLeadershipStatus ?? null;
  if (sector === '—') {
    return <EllipsisCell fullText="—" />;
  }
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'nowrap', overflow: 'hidden' }}>
      <Tooltip title={sector} arrow enterDelay={350}>
        <Typography
          component="span"
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'inherit', flexShrink: 1 }}
        >
          {sector}
        </Typography>
      </Tooltip>
      {leadership ? (
        <Tooltip title={`Sector leadership: ${humanizeCode(leadership)}`} arrow enterDelay={200}>
          <Chip
            label={humanizeCode(leadership)}
            size="small"
            color={sectorLeadershipColor(leadership)}
            variant="outlined"
            sx={{ ...chipNoWrapSx, flexShrink: 0, fontSize: 10, height: 18, '& .MuiChip-label': { px: 0.5 } }}
          />
        </Tooltip>
      ) : null}
    </Stack>
  );
}
