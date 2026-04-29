import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { useAiInvestmentCopilot } from '../hooks';
import type { CopilotSummaryResponse } from '../types';

const statusColor = (status: string) => {
  if (status === 'COMPLETE') return 'success';
  if (status === 'ERROR' || status === 'MISSING') return 'error';
  return 'warning';
};

export default function AiInvestmentCopilotPage() {
  const {
    marketBrief,
    alertDigest,
    activeSummary,
    loading,
    running,
    error,
    setError,
    setActiveSummary,
    runSummary,
  } = useAiInvestmentCopilot();
  const [instrumentId, setInstrumentId] = useState('');
  const [portfolioId, setPortfolioId] = useState('');
  const [watchlistId, setWatchlistId] = useState('');

  if (loading) {
    return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  }

  return (
    <Box sx={{ maxWidth: 1280 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <PsychologyIcon color="primary" />
            <Typography variant="h4" fontWeight={700}>AI Investment Copilot</Typography>
          </Stack>
          <Typography color="text.secondary">Deterministic research summaries from your existing modules. For research support only, not financial advice.</Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '380px 1fr' }, gap: 2 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Copilot Dashboard</Typography>
            <Stack spacing={1}>
              <Button variant="outlined" onClick={() => marketBrief && setActiveSummary(marketBrief)}>Market Brief</Button>
              <Button variant="outlined" onClick={() => alertDigest && setActiveSummary(alertDigest)}>Alerts Digest</Button>
            </Stack>
          </Paper>

          <RequestCard
            title="Stock Summary"
            label="Instrument ID"
            value={instrumentId}
            onChange={setInstrumentId}
            loading={running}
            onRun={() => void runSummary('stock', instrumentId)}
          />
          <RequestCard
            title="Portfolio Review"
            label="Portfolio ID"
            value={portfolioId}
            onChange={setPortfolioId}
            loading={running}
            onRun={() => void runSummary('portfolio', portfolioId)}
          />
          <RequestCard
            title="Watchlist Review"
            label="Watchlist ID"
            value={watchlistId}
            onChange={setWatchlistId}
            loading={running}
            onRun={() => void runSummary('watchlist', watchlistId)}
          />
        </Stack>

        <SummaryPanel summary={activeSummary} />
      </Box>
    </Box>
  );
}

function RequestCard({ title, label, value, onChange, onRun, loading }: {
  title: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  loading: boolean;
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
      <Stack spacing={1}>
        <TextField label={label} value={value} onChange={(event) => onChange(event.target.value)} size="small" />
        <Button variant="contained" disabled={loading || !value.trim()} onClick={onRun}>
          {loading ? 'Summarizing...' : 'Summarize'}
        </Button>
      </Stack>
    </Paper>
  );
}

function SummaryPanel({ summary }: { summary: CopilotSummaryResponse | null }) {
  if (!summary) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Summary</Typography>
        <Typography color="text.secondary">Select a copilot card or enter an ID to generate a focused summary.</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{summary.title}</Typography>
          <Typography variant="body2" color="text.secondary">Generated {new Date(summary.generatedAt).toLocaleString()}</Typography>
        </Box>
        <Chip label={summary.dataStatus} color={statusColor(summary.dataStatus)} />
      </Stack>
      <Alert severity="info" sx={{ mb: 2 }}>For research support only, not financial advice.</Alert>
      <Typography sx={{ mb: 2 }}>{summary.summary}</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
        {summary.sourceModules.map((module) => <Chip key={module} size="small" label={module} variant="outlined" />)}
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
        <ListSection title="Key Takeaways" items={summary.keyTakeaways} />
        <ListSection title="Suggested Next Reviews" items={summary.suggestedNextReviews} />
        <ListSection title="Bullish Factors" items={summary.bullishFactors} empty="No strong bullish factors returned." />
        <ListSection title="Bearish / Risk Factors" items={[...summary.bearishFactors, ...summary.riskFactors]} empty="No major risk factors returned." />
      </Box>
      <Divider sx={{ my: 2 }} />
      <ListSection title="Data Gaps" items={summary.dataGaps} empty="No data gaps reported." />
    </Paper>
  );
}

function ListSection({ title, items, empty = 'No items.' }: { title: string; items: string[]; empty?: string }) {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>{title}</Typography>
      {items.length === 0 ? <Typography variant="body2" color="text.secondary">{empty}</Typography> : (
        <Stack component="ul" sx={{ pl: 2, m: 0 }} spacing={0.5}>
          {items.slice(0, 8).map((item) => (
            <Typography component="li" variant="body2" key={item}>{item}</Typography>
          ))}
        </Stack>
      )}
    </Box>
  );
}
