/**
 * ScreenerCells — row-cell renderers for the Screener results table.
 *
 * Extracted from ScreenerPage.tsx so the page stays under the 500-line cap and so the
 * relative-strength presentation (RS Rating badge, score-movement arrow, factor breakdown,
 * inline price sparkline) lives in one cohesive place. All cells are pure/presentational and
 * render only from already-persisted row fields — no fetching, research-support language only.
 */
import { Box, Chip, TableCell, Tooltip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { ScreenerCapBand, FnoReadinessComponents, ScreenerRow } from '../../types';

// ---------------------------------------------------------------------------
// Base cells (moved verbatim from ScreenerPage)
// ---------------------------------------------------------------------------

export function SymbolLink({ instrumentId, symbol }: { instrumentId: string; symbol: string }) {
  return (
    <Typography
      component={RouterLink}
      to={`/stocks/${instrumentId}`}
      variant="body2"
      sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
      color="primary"
    >
      {symbol}
    </Typography>
  );
}

export function SignalChip({ direction, score }: { direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | null; score: number | null }) {
  if (!direction) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const color = direction === 'BULLISH' ? 'success' : direction === 'BEARISH' ? 'error' : 'default';
  const label = score != null ? `${direction} ${Math.round(score)}` : direction;
  return (
    <Tooltip title={`Signal: ${direction}${score != null ? ` (score ${Math.round(score)})` : ''}`}>
      <Chip label={label} size="small" color={color} sx={{ fontSize: '0.7rem', fontWeight: 600 }} />
    </Tooltip>
  );
}

export function CapBandChip({ capBand }: { capBand: ScreenerCapBand | null }) {
  if (!capBand) return <Typography variant="body2" color="text.disabled">—</Typography>;
  const color: Record<ScreenerCapBand, 'primary' | 'secondary' | 'default'> = {
    LARGE: 'primary',
    MID: 'secondary',
    SMALL: 'default',
  };
  return <Chip label={capBand} size="small" color={color[capBand]} variant="outlined" sx={{ fontSize: '0.7rem' }} />;
}

export function NullableNum({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  if (value == null) return <Typography variant="body2" color="text.disabled">—</Typography>;
  return <Typography variant="body2">{value.toFixed(1)}{suffix}</Typography>;
}

const Dash = () => <Typography variant="body2" color="text.disabled">—</Typography>;

// ---------------------------------------------------------------------------
// RS Rating (1–99) — reframes the page-relative percentile as a recognizable rating badge
// ---------------------------------------------------------------------------

export function RsRatingCell({ percentile }: { percentile: number | null }) {
  if (percentile == null) return <Dash />;
  const rating = Math.min(99, Math.max(1, Math.round(percentile)));
  // Strong / firm / soft bands — colour communicates leadership at a glance.
  const band = rating >= 90 ? 'strong' : rating >= 70 ? 'firm' : 'soft';
  const bg = band === 'strong' ? 'success.main' : band === 'firm' ? 'info.main' : 'action.selected';
  const fg = band === 'soft' ? 'text.secondary' : 'common.white';
  return (
    <Tooltip title="RS Rating (1–99): relative strength rank within the current screened set. Higher = stronger.">
      <Box
        component="span"
        sx={{
          display: 'inline-block', minWidth: 30, textAlign: 'center', px: 0.75, py: 0.25,
          borderRadius: 1, bgcolor: bg, color: fg, fontSize: '0.72rem', fontWeight: 700,
        }}
      >
        {rating}
      </Box>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Score movement vs prior run — ▲ / ▼ / NEW
// ---------------------------------------------------------------------------

export function ScoreDeltaCell({ delta, isNew }: { delta: number | null; isNew: boolean }) {
  if (isNew) {
    return (
      <Tooltip title="No prior run on record — first appearance in signal history.">
        <Chip label="NEW" size="small" color="info" variant="outlined" sx={{ fontSize: '0.62rem', fontWeight: 700, height: 18 }} />
      </Tooltip>
    );
  }
  if (delta == null) return <Dash />;
  if (Math.abs(delta) < 0.05) {
    return <Tooltip title="No change vs prior run"><Typography variant="body2" color="text.disabled">±0</Typography></Tooltip>;
  }
  const up = delta > 0;
  return (
    <Tooltip title={`Score ${up ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)} vs prior run`}>
      <Typography variant="body2" sx={{ fontWeight: 600 }} color={up ? 'success.main' : 'error.main'}>
        {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
      </Typography>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Factor-family breakdown — compact chips showing WHICH evidence families fired
// ---------------------------------------------------------------------------

const FAMILY_LABEL: Record<string, { short: string; full: string }> = {
  TREND: { short: 'T', full: 'Trend' },
  MOMENTUM: { short: 'M', full: 'Momentum' },
  VOLUME: { short: 'V', full: 'Volume' },
  RELATIVE_STRENGTH: { short: 'RS', full: 'Relative strength' },
  BREAKOUT_LEVEL: { short: 'BO', full: 'Breakout level' },
  MEAN_REVERSION: { short: 'MR', full: 'Mean reversion' },
  OVEREXTENSION: { short: 'OX', full: 'Overextension' },
  PROFITABILITY: { short: 'P', full: 'Profitability' },
  VALUATION: { short: 'Val', full: 'Valuation' },
  INCOME: { short: 'Inc', full: 'Income' },
};

// Families surfaced as chips, in priority order; others are summarised in the tooltip only.
const PRIMARY_FAMILIES = ['TREND', 'MOMENTUM', 'VOLUME', 'RELATIVE_STRENGTH'];

export function FactorBreakdownCell({ families }: { families: Record<string, number> | null }) {
  if (!families || Object.keys(families).length === 0) return <Dash />;
  const shown = PRIMARY_FAMILIES.filter((f) => (families[f] ?? 0) > 0);
  const fullSummary = Object.entries(families)
    .map(([fam, n]) => `${FAMILY_LABEL[fam]?.full ?? fam}: ${n}`)
    .join(' · ');
  if (shown.length === 0) {
    // Evidence exists but only in secondary families — show a neutral count.
    const total = Object.values(families).reduce((a, b) => a + b, 0);
    return (
      <Tooltip title={fullSummary}>
        <Chip label={`${total}`} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
      </Tooltip>
    );
  }
  return (
    <Tooltip title={fullSummary}>
      <Box sx={{ display: 'inline-flex', gap: 0.4 }}>
        {shown.map((fam) => (
          <Box
            key={fam}
            component="span"
            sx={{
              px: 0.5, py: 0.1, borderRadius: 0.75, bgcolor: 'action.selected',
              fontSize: '0.62rem', fontWeight: 700, lineHeight: 1.5,
            }}
          >
            {FAMILY_LABEL[fam]?.short ?? fam}
            {families[fam] > 1 ? <Box component="span" sx={{ ml: 0.2, opacity: 0.7 }}>{families[fam]}</Box> : null}
          </Box>
        ))}
      </Box>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Inline price sparkline — recent closes, coloured by net direction
// ---------------------------------------------------------------------------

export function PriceSparklineCell({ closes }: { closes: number[] | null }) {
  if (!closes || closes.length < 2) return <Dash />;
  const w = 64;
  const h = 20;
  const pad = 2;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (closes.length - 1);
  const points = closes
    .map((c, i) => {
      const x = pad + i * stepX;
      const y = pad + (h - pad * 2) * (1 - (c - min) / span);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const up = closes[closes.length - 1] >= closes[0];
  const stroke = up ? '#2e7d32' : '#c62828';
  return (
    <Tooltip title={`${closes.length}-bar price trend (${up ? 'up' : 'down'} over window)`}>
      <Box component="svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} sx={{ display: 'block' }}>
        <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.25} strokeLinejoin="round" strokeLinecap="round" />
      </Box>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// F&O Readiness — composite score (0–99) + A/B/C grade, with a component tooltip
// ---------------------------------------------------------------------------

function gradeColor(grade: string | null): 'success' | 'info' | 'default' {
  if (grade === 'A') return 'success';
  if (grade === 'B') return 'info';
  return 'default';
}

export function FnoReadinessCell({
  score, grade, components,
}: { score: number | null; grade: string | null; components: FnoReadinessComponents | null }) {
  if (score == null) return <Dash />;
  const tip = components ? (
    <Box sx={{ fontSize: '0.7rem', lineHeight: 1.6 }}>
      <div>Signal: {Math.round(components.signal)}</div>
      <div>Relative strength: {Math.round(components.relativeStrength)}</div>
      <div>Derivatives positioning: {Math.round(components.derivativesPositioning)}</div>
      <div>Delivery: {Math.round(components.delivery)}</div>
      <div>52-week trend: {Math.round(components.trend)}</div>
      <Box sx={{ mt: 0.5, opacity: 0.8 }}>Blended signal quality — research support, not advice.</Box>
    </Box>
  ) : 'Composite readiness';
  return (
    <Tooltip title={tip}>
      <Box sx={{ display: 'inline-flex', gap: 0.6, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Typography variant="body2" fontWeight={700}>{Math.round(score)}</Typography>
        <Chip label={grade ?? '—'} size="small" color={gradeColor(grade)} sx={{ fontSize: '0.62rem', height: 18, fontWeight: 700 }} />
      </Box>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// OI build-up label — semantic colour (confirming vs contradicting a long bias)
// ---------------------------------------------------------------------------

const BUILDUP_META: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'default' }> = {
  LONG_BUILDUP: { label: 'Long buildup', color: 'success' },
  SHORT_COVERING: { label: 'Short covering', color: 'success' },
  SHORT_BUILDUP: { label: 'Short buildup', color: 'error' },
  LONG_UNWINDING: { label: 'Long unwinding', color: 'warning' },
  NEUTRAL: { label: 'Neutral', color: 'default' },
};

export function BuildupCell({ label }: { label: string | null }) {
  if (!label) return <Dash />;
  const meta = BUILDUP_META[label.toUpperCase()] ?? { label, color: 'default' as const };
  return (
    <Tooltip title="Futures open-interest build-up (positioning vs price). Research support only.">
      <Chip label={meta.label} size="small" color={meta.color} variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
    </Tooltip>
  );
}

// The three F&O columns (header + body) as fragments, so the Screener page can add
// them with a single gated call each and stay under the source-file line cap.
export function FnoScreenerHeaderCells() {
  return (
    <>
      <TableCell align="right">F&O Readiness</TableCell>
      <TableCell>OI build-up</TableCell>
      <TableCell align="right">PCR</TableCell>
    </>
  );
}

export function FnoScreenerBodyCells({ row }: { row: ScreenerRow }) {
  return (
    <>
      <TableCell align="right">
        <FnoReadinessCell score={row.fnoReadinessScore} grade={row.fnoGrade} components={row.fnoComponents} />
      </TableCell>
      <TableCell><BuildupCell label={row.buildupLabel} /></TableCell>
      <TableCell align="right"><NullableNum value={row.pcrOi} /></TableCell>
    </>
  );
}
