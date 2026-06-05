import React from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Alert, Box, Button, Chip, CircularProgress, LinearProgress, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { humanizeCode } from '@/shared/format/enumLabels';
import { useMarketContext } from '../hooks';

const pct = (value: number | null) => value === null ? 'N/A' : `${(value * 100).toFixed(1)}%`;
const colorFor = (value?: string) => value === 'RISK_ON' || value === 'LEADING' || value === 'SUPPORTIVE' ? 'success' : value === 'RISK_OFF' || value === 'LAGGING' || value === 'HEADWIND' ? 'error' : 'warning';

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Paper variant="outlined" sx={{ p: 1.5 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography fontWeight={700}>{value}</Typography>
  </Paper>
);

const breadthSmaSamples = (summary: { breadth: { instrumentCount: number; sma50SampleCount?: number; sma200SampleCount?: number } }) => {
  const sma50 = summary.breadth.sma50SampleCount ?? summary.breadth.instrumentCount;
  const sma200 = summary.breadth.sma200SampleCount ?? summary.breadth.instrumentCount;
  return `${sma50} / ${sma200}`;
};

function formatDateTime(value?: string | null) {
  if (!value) return 'Unavailable';
  return new Date(value).toLocaleString();
}

export const MarketContextPage: React.FC = () => {
  const { summary, loading, error, reload } = useMarketContext();
  const navigate = useNavigate();
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error || !summary) return <Alert severity="error">{error || 'Market context unavailable'}</Alert>;

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h4">Market Context Intelligence</Typography>
          <Typography color="text.secondary">Broader market regime, sector rotation, breadth, country strength, and macro context.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {summary.updatedAt && (
            <Tooltip title={`Last updated: ${formatDateTime(summary.updatedAt)}`} arrow>
              <Chip size="small" variant="outlined" label={`Updated: ${formatDateTime(summary.updatedAt)}`} />
            </Tooltip>
          )}
          <Button startIcon={<RefreshIcon />} variant="outlined" size="small" onClick={() => void reload()}>Refresh</Button>
        </Stack>
      </Stack>

      {summary.dataStatus === 'PARTIAL' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Market context data is partial. Some indicators may be incomplete or missing. Results should be interpreted cautiously.
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h6">Market Regime</Typography>
            <Typography color="text.secondary">{summary.regime.explanation}</Typography>
          </Box>
          <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
            <Typography variant="h3">{summary.regime.score}</Typography>
            <Chip color={colorFor(summary.regime.regime)} label={summary.regime.regime} />
            <Chip size="small" variant="outlined" label={summary.dataStatus} />
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Sector Rotation</Typography>
          {summary.topSectors.length === 0 ? (
            <Typography color="text.secondary">No named-sector leadership available.</Typography>
          ) : (
          <Stack spacing={1.5}>
            {summary.topSectors.map((sector) => (
              <Box
                key={sector.sector}
                onClick={() => navigate(`/signals?sector=${encodeURIComponent(sector.sector)}`)}
                sx={{ cursor: 'pointer', borderRadius: 1, p: 0.75, mx: -0.75, '&:hover': { bgcolor: 'action.hover' } }}
                role="button"
                aria-label={`View ${humanizeCode(sector.sector)} signals`}
              >
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={700}>{humanizeCode(sector.sector)}</Typography>
                  <Chip size="small" color={colorFor(sector.leadershipStatus)} label={humanizeCode(sector.leadershipStatus)} />
                </Stack>
                <Typography variant="body2" color="text.secondary">1M {pct(sector.return1M)} · 3M {pct(sector.return3M)} · 6M {pct(sector.return6M)} · Signals {sector.bullishSignalCount}/{sector.bearishSignalCount}</Typography>
                <LinearProgress variant="determinate" value={sector.relativeStrengthScore} sx={{ mt: 0.75, height: 7, borderRadius: 1 }} />
              </Box>
            ))}
          </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Breadth Indicators</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            <Metric label="Above SMA50" value={pct(summary.breadth.percentAboveSma50)} />
            <Metric label="Above SMA200" value={pct(summary.breadth.percentAboveSma200)} />
            <Metric label="Advance/Decline" value={summary.breadth.advanceDeclineRatio?.toFixed(2) ?? 'N/A'} />
            <Metric label="52W High / Low" value={`${summary.breadth.newHigh52WeekCount} / ${summary.breadth.newLow52WeekCount}`} />
            <Metric label="Bullish / Bearish" value={`${summary.breadth.bullishSignalCount} / ${summary.breadth.bearishSignalCount}`} />
            <Metric label="Price Sample" value={String(summary.breadth.instrumentCount)} />
            <Metric label="SMA Samples" value={breadthSmaSamples(summary)} />
          </Box>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Country / Region Strength</Typography>
          <Stack spacing={1}>
            {summary.countryStrength.map((country) => (
              <Stack key={country.country} direction="row" justifyContent="space-between">
                <Typography>{country.country}</Typography>
                <Typography color="text.secondary">3M {pct(country.return3M)} · Score {country.relativeStrengthScore}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Macro Snapshot</Typography>
          <Chip color={colorFor(summary.macro.macroStatus)} label={summary.macro.macroStatus} sx={{ mb: 1 }} />
          <Typography color="text.secondary">{summary.macro.explanation}</Typography>
          <Typography variant="caption" color="text.secondary">{summary.macro.dataStatus}</Typography>
        </Paper>
      </Box>

      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Key Takeaways</Typography>
        <Box component="ul" sx={{ pl: 2, my: 0 }}>
          {summary.explanation.map((item) => <Typography component="li" key={item}>{item}</Typography>)}
        </Box>
      </Paper>
    </Box>
  );
};

export default MarketContextPage;
