import { Box, Paper, Stack, Typography } from '@mui/material';
import type { ConvictionFunnel } from '../api/convictionService';
import type { MarketRegion } from '@/contexts/MarketScopeContext';

/**
 * Gating-funnel explanation panel for the Conviction tab.
 *
 * Answers "why only N candidates?" transparently: it walks the supported universe down
 * through the signal-score and smart-money gates using the SAME counts the list query
 * produced, so the small set reads as by-design strict confluence rather than an error or
 * missing data. Research-support language only — no advice wording.
 */

const REGION_LABEL: Record<MarketRegion, string> = {
  IN: 'supported Indian',
  US: 'supported US',
  EU: 'supported European',
  GLOBAL: 'supported',
};

function fmt(n: number): string {
  return n.toLocaleString();
}

function Stage({
  count,
  label,
  emphasize,
}: {
  count: number;
  label: string;
  emphasize?: boolean;
}) {
  return (
    <Box sx={{ minWidth: 96 }}>
      <Typography
        variant="h6"
        sx={{ fontWeight: 700, lineHeight: 1.1, color: emphasize ? 'success.main' : 'text.primary' }}
      >
        {fmt(count)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
    </Box>
  );
}

function Arrow() {
  return (
    <Typography component="span" color="text.disabled" sx={{ fontSize: '1.1rem', px: 0.5 }}>
      &rarr;
    </Typography>
  );
}

export function ConvictionFunnelPanel({
  funnel,
  region,
}: {
  funnel: ConvictionFunnel;
  region: MarketRegion;
}) {
  const { universe, withRecentSignal, signalQualified, smartMoneyQualified, thresholds } = funnel;
  const { minSignalScore, minSmartMoneyScore, ranges, resultLimit } = thresholds;
  const rangeText = ranges.join(', ');
  const universeLabel = REGION_LABEL[region] ?? REGION_LABEL.GLOBAL;

  // Research-support narrative built from the real counts.
  const sentence =
    `Of ${fmt(universe)} ${universeLabel} stocks, ${fmt(signalQualified)} clear a signal score ` +
    `≥ ${minSignalScore}; ${fmt(smartMoneyQualified)} of those also show smart-money ` +
    `accumulation > ${minSmartMoneyScore} across ${rangeText}. Those ${fmt(smartMoneyQualified)} ` +
    `form the conviction set (top ${resultLimit} by signal score).`;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Why this set is small
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {sentence}
      </Typography>

      <Stack
        direction="row"
        alignItems="center"
        flexWrap="wrap"
        rowGap={1}
        sx={{ '& > *': { flexShrink: 0 } }}
      >
        <Stage count={universe} label={`${universeLabel} universe`} />
        <Arrow />
        <Stage count={withRecentSignal} label="with a recent signal" />
        <Arrow />
        <Stage count={signalQualified} label={`signal ≥ ${minSignalScore}`} />
        <Arrow />
        <Stage
          count={smartMoneyQualified}
          label={`+ smart-money > ${minSmartMoneyScore} (${rangeText})`}
          emphasize
        />
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        The thresholds are fixed by design — a deliberately strict confluence bar. A small set
        is expected, not a data error.
      </Typography>
    </Paper>
  );
}
