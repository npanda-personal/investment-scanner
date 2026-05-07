import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Alert, Tab, Tabs } from '@mui/material';
import { TradePlanApi } from '../api';
import { TradePlanTable } from './TradePlanTable';
import { TradePlanResultDto } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { SortDirection } from '@/shared/components/DataTable';

export const TradePlanDashboard: React.FC = () => {
  const [plans, setPlans] = useState<TradePlanResultDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [tab, setTab] = useState(0);
  
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<string | undefined>('generatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { scope } = useMarketScope();

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { 
        region: scope.region,
        limit: pageSize,
        offset: page * pageSize,
      };
      if (sortBy) params.sortBy = sortBy;
      if (sortDirection) params.sortDirection = sortDirection;

      const data = await TradePlanApi.listCandidates(params);
      setPlans(data.results);
      setTotalCount(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    setBatchGenerating(true);
    try {
      await TradePlanApi.batchGenerate({ region: scope.region, batchSize: 25 });
      setPage(0);
      await fetchPlans();
    } catch (err: any) {
      setError(err.message || 'Failed to batch generate plans');
    } finally {
      setBatchGenerating(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [scope.region, page, pageSize, sortBy, sortDirection]);

  return (
    <Box sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Trade Plans</Typography>
        <Button variant="contained" onClick={handleBatchGenerate} disabled={batchGenerating}>
          {batchGenerating ? 'Generating...' : 'Batch Generate Plans'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label="Latest Plans" />
        </Tabs>
      </Box>

      {tab === 0 && (
         <Box>
            <TradePlanTable 
              plans={plans} 
              loading={loading}
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(0);
              }}
              onSortChange={(newSortBy, newSortDir) => {
                setSortBy(newSortBy);
                setSortDirection(newSortDir);
                setPage(0);
              }}
            />
         </Box>
      )}
    </Box>
  );
};
