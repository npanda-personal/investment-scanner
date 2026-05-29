import { Alert, Box, Chip, Grid, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import InstrumentDetailPage from './InstrumentDetailPage';
import StockResearchWorkbenchPage from '@/features/stock-research-workbench';
import { PageHeader } from '@/shared/components';

const tabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'research', label: 'Research' },
  { value: 'prices', label: 'Prices' },
  { value: 'fundamentals', label: 'Fundamentals' },
  { value: 'signals', label: 'Signals' },
  { value: 'quality', label: 'Signal Quality' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'smart-money', label: 'Smart Money' },
];

export default function UnifiedStockPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Instrument Workspace"
        subtitle="Read-only instrument evidence, market context gaps, personal research workflow links, and source freshness."
        backTo="/market-map"
        backLabel="Back to market map"
      />
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_event, value) => setSearchParams(value === 'overview' ? {} : { tab: value })}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab) => <Tab key={tab.value} value={tab.value} label={tab.label} />)}
        </Tabs>
      </Paper>
      {activeTab === 'research' ? (
        <StockResearchWorkbenchPage />
      ) : activeTab === 'overview' || activeTab === 'prices' || activeTab === 'fundamentals' ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <InstrumentDetailPage />
          </Grid>
          <Grid item xs={12} lg={4}>
            <MarketContextRail />
          </Grid>
        </Grid>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">{tabs.find((tab) => tab.value === activeTab)?.label}</Typography>
          <Typography color="text.secondary">
            This stock tab is reserved for the module-owned view. Use the main module dashboards for full analysis while this unified page is expanded.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

function MarketContextRail() {
  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6">Market Context Rail</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Context here must come from persisted read models only. Missing evidence is shown instead of triggering data-production work.
        </Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={800}>Index and sector context</Typography>
          <Chip label="Index membership: missing" variant="outlined" />
          <Chip label="Stock vs index strength: missing" variant="outlined" />
          <Chip label="Sector breadth: missing" variant="outlined" />
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={800}>Institutional and derivatives backdrop</Typography>
          <Chip label="FII/DII backdrop: missing" variant="outlined" />
          <Chip label="F&O context: approval required" color="warning" variant="outlined" />
        </Stack>
      </Paper>
      <Alert severity="info">
        Personal actions remain available through Watchlists, Alerts, and Portfolios. Shared market data sync, repair, and generation actions are Admin / Data Ops workflows.
      </Alert>
    </Stack>
  );
}
