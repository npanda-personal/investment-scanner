import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { useAiInvestmentCopilot } from '../hooks';
import type { CopilotSummaryResponse } from '../types';
import { InstrumentSearchSelect, PageHeader } from '@/shared/components';
import type { V1Instrument } from '@/features/market-data-foundation';
import { fetchPortfolios, type Portfolio } from '@/features/portfolio-management';
import { fetchWatchlists, type Watchlist } from '@/features/watchlist-management';

type CopilotTab = 'market' | 'stock' | 'portfolio' | 'watchlist' | 'alerts';

const statusColor = (status: string) => {
  if (status === 'COMPLETE') return 'success';
  if (status === 'ERROR' || status === 'MISSING') return 'error';
  return 'warning';
};

export default function AiInvestmentCopilotPage() {
  const {
    activeSummary,
    loading,
    running,
    error,
    setError,
    loadMarketBrief,
    loadAlertDigest,
    runSummary,
  } = useAiInvestmentCopilot();
  const [activeTab, setActiveTab] = useState<CopilotTab>('market');
  const [instrument, setInstrument] = useState<V1Instrument | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [watchlist, setWatchlist] = useState<Watchlist | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);

  useEffect(() => {
    fetchPortfolios().then(setPortfolios).catch(() => setPortfolios([]));
    fetchWatchlists().then(setWatchlists).catch(() => setWatchlists([]));
  }, []);

  if (loading) {
    return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="AI Investment Copilot"
        badges={<PsychologyIcon color="primary" />}
        subtitle="Deterministic research summaries from your existing modules. For research support only, not financial advice."
      />

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_event, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab value="market" label="Market Brief" />
          <Tab value="stock" label="Stock Summary" />
          <Tab value="portfolio" label="Portfolio Summary" />
          <Tab value="watchlist" label="Watchlist Summary" />
          <Tab value="alerts" label="Alert Digest" />
        </Tabs>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '380px 1fr' }, gap: 2 }}>
        <Stack spacing={2}>
          {activeTab === 'market' && <ActionCard title="Market Brief" loading={running} onRun={() => void loadMarketBrief()} />}
          {activeTab === 'alerts' && <ActionCard title="Alert Digest" loading={running} onRun={() => void loadAlertDigest()} />}
          {activeTab === 'stock' && (
            <RequestCard title="Stock Summary" loading={running} disabled={!instrument} onRun={() => instrument && void runSummary('stock', instrument.id)}>
              <InstrumentSearchSelect value={instrument} onChange={setInstrument} />
            </RequestCard>
          )}
          {activeTab === 'portfolio' && (
            <RequestCard title="Portfolio Review" loading={running} disabled={!portfolio} onRun={() => portfolio && void runSummary('portfolio', portfolio.id)}>
              <Autocomplete
                options={portfolios}
                value={portfolio}
                onChange={(_event, value) => setPortfolio(value)}
                getOptionLabel={(option) => `${option.name} (${option.baseCurrency})`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => <TextField {...params} label="Portfolio" size="small" />}
              />
            </RequestCard>
          )}
          {activeTab === 'watchlist' && (
            <RequestCard title="Watchlist Review" loading={running} disabled={!watchlist} onRun={() => watchlist && void runSummary('watchlist', watchlist.id)}>
              <Autocomplete
                options={watchlists}
                value={watchlist}
                onChange={(_event, value) => setWatchlist(value)}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => <TextField {...params} label="Watchlist" size="small" />}
              />
            </RequestCard>
          )}
        </Stack>

        <SummaryPanel summary={activeSummary} />
      </Box>
    </Box>
  );
}

function ActionCard({ title, onRun, loading }: { title: string; onRun: () => void; loading: boolean }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
      <Button variant="contained" disabled={loading} onClick={onRun}>
        {loading ? 'Loading...' : 'Generate Report'}
      </Button>
    </Paper>
  );
}

function RequestCard({ title, children, onRun, loading, disabled }: {
  title: string;
  children: React.ReactNode;
  onRun: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
      <Stack spacing={1.5}>
        {children}
        <Button variant="contained" disabled={loading || disabled} onClick={onRun}>
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
        <Typography color="text.secondary">Select an entity to generate a focused summary.</Typography>
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
