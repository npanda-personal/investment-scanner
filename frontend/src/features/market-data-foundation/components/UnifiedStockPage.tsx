import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import InstrumentDetailPage from './InstrumentDetailPage';
import StockResearchWorkbenchPage from '@/features/stock-research-workbench';

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
        <InstrumentDetailPage />
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
