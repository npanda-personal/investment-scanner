import React, { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { EditOutlined, DeleteOutline } from '@mui/icons-material';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SignalBadge } from '@/features/signal-generation-engine';
import { PortfolioIntelligencePanel } from '@/features/portfolio-intelligence';
import { InstrumentSearchSelect, PageHeader } from '@/shared/components';
import type { V1Instrument } from '@/features/market-data-foundation';
import {
  addHolding,
  createPortfolio,
  createTransaction,
  deletePortfolio,
  removeHolding,
  updateHolding,
} from '../api/portfolioManagementService';
import { usePortfolioManagement } from '../hooks';
import type { CreateHoldingInput, CreateTransactionInput, HoldingValuation, PortfolioHolding, PortfolioTransaction, PortfolioTransactionType } from '../types';
import { useMarketScope } from '@/contexts/MarketScopeContext';

interface CapitalPostureData {
  postureLabel: string;
  suggestedExposureBand: { minPct: number; maxPct: number };
  action: string;
  message: string;
  availability: string;
}

const postureBandColor = (label: string): 'success' | 'warning' | 'error' | 'info' => {
  if (label === 'AGGRESSIVE') return 'success';
  if (label === 'NEUTRAL') return 'info';
  if (label === 'CAUTIOUS') return 'warning';
  if (label === 'DEFENSIVE') return 'error';
  return 'info';
};

/** Resolve instrument symbol from a holdings map, falling back to a short id excerpt. */
const resolveSymbol = (instrumentId: string | null, holdingsMap: Map<string, string>): string => {
  if (!instrumentId) return 'Cash';
  return holdingsMap.get(instrumentId) || instrumentId.slice(0, 12) + (instrumentId.length > 12 ? '…' : '');
};

const money = (value: number | null | undefined, currency = 'INR') =>
  value === null || value === undefined
    ? 'N/A'
    : new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

const percent = (value: number | null | undefined) =>
  value === null || value === undefined ? 'N/A' : `${(value * 100).toFixed(2)}%`;

const numberValue = (value: string) => Number(value || 0);

const defaultHoldingForm = {
  instrumentId: '',
  quantity: '',
  averageCost: '',
  currency: 'INR',
  notes: '',
};

const defaultTransactionForm = {
  type: 'BUY' as PortfolioTransactionType,
  instrumentId: '',
  quantity: '',
  price: '',
  amount: '',
  currency: 'INR',
  transactionDate: new Date().toISOString().slice(0, 10),
  notes: '',
};

const SummaryCard: React.FC<{ label: string; value: string; tone?: 'success' | 'error' }> = ({ label, value, tone }) => (
  <Paper sx={{ p: 2 }}>
    <Typography color="text.secondary" variant="body2">{label}</Typography>
    <Typography variant="h5" color={tone ? `${tone}.main` : 'text.primary'} sx={{ mt: 0.5 }}>{value}</Typography>
  </Paper>
);

const AllocationList: React.FC<{ title: string; buckets: { key: string; value: number; allocationPercent: number }[]; currency: string }> = ({
  title,
  buckets,
  currency,
}) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
    {buckets.length === 0 ? (
      <Typography color="text.secondary">No allocation data yet.</Typography>
    ) : (
      <Stack spacing={1}>
        {buckets.slice(0, 6).map((bucket) => (
          <Box key={bucket.key}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Typography>{bucket.key}</Typography>
              <Typography color="text.secondary">{money(bucket.value, currency)} ({percent(bucket.allocationPercent)})</Typography>
            </Stack>
            <Box sx={{ height: 6, bgcolor: 'action.hover', borderRadius: 1, mt: 0.5 }}>
              <Box sx={{ width: `${Math.min(bucket.allocationPercent * 100, 100)}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 1 }} />
            </Box>
          </Box>
        ))}
      </Stack>
    )}
  </Paper>
);

const PortfolioManagementPage: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const selectedId = params.id;
  const { scope } = useMarketScope();
  const { portfolios, detail, summary, allocation, transactions, loading, error, reload } = usePortfolioManagement(selectedId);
  const selectedPortfolio = summary?.portfolio || detail?.portfolio || portfolios.find((portfolio) => portfolio.id === selectedId) || portfolios[0];
  const [formError, setFormError] = useState<string | null>(null);
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioCurrency, setPortfolioCurrency] = useState('INR');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [holdingForm, setHoldingForm] = useState(defaultHoldingForm);
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);
  const [transactionForm, setTransactionForm] = useState(defaultTransactionForm);
  const [selectedHoldingInstrument, setSelectedHoldingInstrument] = useState<V1Instrument | null>(null);
  const [selectedTransactionInstrument, setSelectedTransactionInstrument] = useState<V1Instrument | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'holdings' | 'allocation' | 'intelligence' | 'transactions'>('overview');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [capitalPosture, setCapitalPosture] = useState<CapitalPostureData | null>(null);
  const [postureLoading, setPostureLoading] = useState(false);
  const [postureError, setPostureError] = useState<string | null>(null);
  const baseCurrency = selectedPortfolio?.baseCurrency || 'INR';

  // Build a map from instrumentId -> symbol from holdings data for transaction display
  const holdingsSymbolMap = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    if (summary?.holdings) {
      for (const h of summary.holdings) map.set(h.instrumentId, h.symbol);
    }
    if (detail?.holdings) {
      for (const h of detail.holdings) map.set(h.instrumentId, h.symbol);
    }
    return map;
  }, [summary, detail]);

  // Fetch capital posture when overview tab is active
  React.useEffect(() => {
    if (activeSection !== 'overview' || !selectedId) return;
    setPostureLoading(true);
    setPostureError(null);
    axios
      .get<CapitalPostureData>(`/api/v1/market-context/capital-posture?region=${scope.region}`)
      .then((res) => setCapitalPosture(res.data))
      .catch((err: any) => setPostureError(err.response?.data?.error || err.message || 'Failed to load market posture'))
      .finally(() => setPostureLoading(false));
  }, [activeSection, selectedId, scope.region]);

  const summaryTone = useMemo(() => {
    if (!summary) return undefined;
    if (summary.totalUnrealizedPnL > 0) return 'success' as const;
    if (summary.totalUnrealizedPnL < 0) return 'error' as const;
    return undefined;
  }, [summary]);

  const reloadOrSelect = async (portfolioId?: string) => {
    await reload();
    if (portfolioId) navigate(`/portfolios/${portfolioId}`);
  };

  const submitPortfolio = async () => {
    setFormError(null);
    try {
      const portfolio = await createPortfolio({
        name: portfolioName,
        baseCurrency: portfolioCurrency,
        description: portfolioDescription || null,
      });
      setPortfolioName('');
      setPortfolioCurrency('INR');
      setPortfolioDescription('');
      await reloadOrSelect(portfolio.id);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to create portfolio');
    }
  };

  const submitHolding = async () => {
    if (!selectedId) return;
    setFormError(null);
    const input: CreateHoldingInput = {
      instrumentId: holdingForm.instrumentId,
      quantity: numberValue(holdingForm.quantity),
      averageCost: numberValue(holdingForm.averageCost),
      currency: holdingForm.currency,
      notes: holdingForm.notes || null,
    };
    try {
      if (editingHolding) {
        await updateHolding(selectedId, editingHolding.id, {
          quantity: input.quantity,
          averageCost: input.averageCost,
          currency: input.currency,
          notes: input.notes,
        });
      } else {
        await addHolding(selectedId, input);
      }
      setHoldingForm(defaultHoldingForm);
      setSelectedHoldingInstrument(null);
      setEditingHolding(null);
      await reload();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to save holding');
    }
  };

  const submitTransaction = async () => {
    if (!selectedId) return;
    setFormError(null);
    const input: CreateTransactionInput = {
      type: transactionForm.type,
      instrumentId: transactionForm.instrumentId || null,
      quantity: transactionForm.quantity ? numberValue(transactionForm.quantity) : null,
      price: transactionForm.price ? numberValue(transactionForm.price) : null,
      amount: transactionForm.amount ? numberValue(transactionForm.amount) : null,
      currency: transactionForm.currency,
      transactionDate: transactionForm.transactionDate,
      notes: transactionForm.notes || null,
    };
    try {
      await createTransaction(selectedId, input);
      setTransactionForm(defaultTransactionForm);
      setSelectedTransactionInstrument(null);
      await reload();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to add transaction');
    }
  };

  const startEditHolding = (holding: PortfolioHolding) => {
    setEditingHolding(holding);
    setHoldingForm({
      instrumentId: holding.instrumentId,
      quantity: String(holding.quantity),
      averageCost: String(holding.averageCost),
      currency: holding.currency,
      notes: holding.notes || '',
    });
  };

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolio) return;
    setDeleteConfirmOpen(false);
    await deletePortfolio(selectedPortfolio.id);
    navigate('/portfolios');
    await reload();
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <PageHeader
        title="Portfolios"
        subtitle="Manual portfolios, holdings, valuation, allocation, and transaction tracking."
        badges={
          <Stack direction="row" spacing={1}>
            <Chip label={`Scope: ${scope.region}`} color="info" variant="outlined" size="small" />
            {summary && <Chip label={`${summary.dataStatus} data`} color={summary.dataStatus === 'COMPLETE' ? 'success' : 'warning'} variant="outlined" size="small" />}
          </Stack>
        }
      />

      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
          <Box sx={{ flex: 1, width: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Portfolio</Typography>
            <Autocomplete
              options={portfolios}
              value={portfolios.find(p => p.id === selectedId) || null}
              onChange={(_event, value) => {
                if (value) navigate(`/portfolios/${value.id}`);
                else navigate('/portfolios');
              }}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Search portfolios..." size="small" />}
            />
          </Box>
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
          <Box sx={{ flex: 1, width: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Create New</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
              <TextField label="Name" value={portfolioName} onChange={(event) => setPortfolioName(event.target.value)} size="small" sx={{ flex: 1, minWidth: 120 }} />
              <TextField label="Currency" value={portfolioCurrency} onChange={(event) => setPortfolioCurrency(event.target.value.toUpperCase())} size="small" sx={{ width: 90 }} />
              <TextField label="Description" value={portfolioDescription} onChange={(event) => setPortfolioDescription(event.target.value)} size="small" sx={{ flex: 2, minWidth: 150 }} />
              <Button variant="contained" onClick={submitPortfolio} disabled={!portfolioName}>Create</Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {!selectedId || !selectedPortfolio ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Select a portfolio</Typography>
          <Typography color="text.secondary">Choose or create a portfolio to view holdings, valuation, allocation, and transactions.</Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="h5">{selectedPortfolio.name}</Typography>
                <Typography color="text.secondary">{selectedPortfolio.description || 'No description'}</Typography>
              </Box>
              <Button color="error" variant="outlined" onClick={() => setDeleteConfirmOpen(true)}>
                Delete Portfolio
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ mb: 1 }}>
            <Tabs value={activeSection} onChange={(_event, value) => setActiveSection(value)} variant="scrollable" scrollButtons="auto">
              <Tab value="overview" label="Overview" />
              <Tab value="holdings" label="Holdings" />
              <Tab value="allocation" label="Allocation" />
              <Tab value="intelligence" label="Intelligence" />
              <Tab value="transactions" label="Transactions" />
            </Tabs>
          </Paper>

          {activeSection === 'overview' && (
            <Stack spacing={2}>
              {/* Capital Posture banner */}
              {postureLoading && (
                <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">Loading market posture…</Typography>
                </Paper>
              )}
              {postureError && (
                <Alert severity="warning">Market posture unavailable: {postureError}</Alert>
              )}
              {capitalPosture && capitalPosture.availability === 'READY' && (
                <Paper sx={{ p: 2, borderLeft: '4px solid', borderColor: `${postureBandColor(capitalPosture.postureLabel)}.main` }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Market Posture</Typography>
                        <Chip size="small" label={capitalPosture.postureLabel} color={postureBandColor(capitalPosture.postureLabel)} />
                        <Chip size="small" label={`Exposure ${capitalPosture.suggestedExposureBand.minPct}–${capitalPosture.suggestedExposureBand.maxPct}%`} variant="outlined" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">{capitalPosture.message}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Research-support context only — not investment advice. Verify signals independently before any trade decision.
                      </Typography>
                    </Box>
                    <Chip size="small" label={`Action: ${capitalPosture.action}`} variant="outlined" />
                  </Stack>
                </Paper>
              )}

              {summary && summary.numberOfHoldings === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary">No holdings yet</Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Add your first holding to start tracking portfolio value, P&amp;L, and signal overlays.
                  </Typography>
                  <Button variant="contained" onClick={() => setActiveSection('holdings')}>Add a Holding</Button>
                </Paper>
              ) : summary ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                  <SummaryCard label="Total Value" value={money(summary.totalValue, baseCurrency)} />
                  <SummaryCard label="Unrealized P&L" value={`${money(summary.totalUnrealizedPnL, baseCurrency)} (${percent(summary.totalUnrealizedPnLPercent)})`} tone={summaryTone} />
                  <SummaryCard label="Daily Change" value={`${money(summary.dailyPnL, baseCurrency)} (${percent(summary.dailyPnLPercent)})`} tone={summary.dailyPnL >= 0 ? 'success' : 'error'} />
                  <SummaryCard label="Holdings" value={String(summary.numberOfHoldings)} />
                </Box>
              ) : null}
            </Stack>
          )}

          {activeSection === 'holdings' && <Paper sx={{ p: 2, overflowX: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Holdings</Typography>
            {!summary || summary.holdings.length === 0 ? (
              <Typography color="text.secondary">No holdings yet. Use the stock selector below to add one.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Avg Cost</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell align="right">Unrealized</TableCell>
                    <TableCell>Signal</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.holdings.map((holding: HoldingValuation) => (
                    <TableRow key={holding.id} hover>
                      <TableCell>
                        <Button component={Link} to={`/stocks/${holding.instrumentId}`} size="small">{holding.symbol}</Button>
                      </TableCell>
                      <TableCell>{holding.companyName || 'N/A'}</TableCell>
                      <TableCell align="right">{holding.quantity}</TableCell>
                      <TableCell align="right">{money(holding.averageCost, holding.currency)}</TableCell>
                      <TableCell align="right">{money(holding.currentPrice, holding.currency)}</TableCell>
                      <TableCell align="right">{money(holding.marketValue, holding.currency)}</TableCell>
                      <TableCell align="right">{money(holding.unrealizedPnL, holding.currency)} ({percent(holding.unrealizedPnLPercent)})</TableCell>
                      <TableCell>{holding.signal ? <SignalBadge direction={holding.signal.direction} label={`${holding.signal.direction} ${holding.signal.score}`} /> : <Chip size="small" label="No signal" variant="outlined" />}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Edit Holding" arrow>
                            <IconButton size="small" onClick={() => startEditHolding(holding)}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove Holding" arrow>
                            <IconButton size="small" color="error" onClick={async () => {
                              await removeHolding(selectedId, holding.id);
                              await reload();
                            }}>
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>}

          {activeSection === 'holdings' && <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{editingHolding ? `Edit ${editingHolding.symbol}` : 'Add Holding'}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr repeat(3, 1fr)' }, gap: 1.5 }}>
              {editingHolding ? (
                <TextField label="Instrument" value={holdingForm.instrumentId} size="small" disabled />
              ) : (
                <InstrumentSearchSelect
                  value={selectedHoldingInstrument}
                  onChange={(instrument) => {
                    setSelectedHoldingInstrument(instrument);
                    setHoldingForm({ ...holdingForm, instrumentId: instrument?.id || '', currency: instrument?.currency || holdingForm.currency });
                  }}
                />
              )}
              <TextField label="Quantity" value={holdingForm.quantity} onChange={(event) => setHoldingForm({ ...holdingForm, quantity: event.target.value })} size="small" />
              <TextField label="Avg cost" value={holdingForm.averageCost} onChange={(event) => setHoldingForm({ ...holdingForm, averageCost: event.target.value })} size="small" />
              <TextField label="Currency" value={holdingForm.currency} onChange={(event) => setHoldingForm({ ...holdingForm, currency: event.target.value.toUpperCase() })} size="small" />
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
              <TextField label="Notes" value={holdingForm.notes} onChange={(event) => setHoldingForm({ ...holdingForm, notes: event.target.value })} size="small" fullWidth />
              <Button variant="contained" onClick={submitHolding}>{editingHolding ? 'Save' : 'Add'}</Button>
              {editingHolding && <Button onClick={() => {
                setEditingHolding(null);
                setHoldingForm(defaultHoldingForm);
              }}>Cancel</Button>}
            </Stack>
          </Paper>}

          {activeSection === 'allocation' && allocation && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
              <AllocationList title="Top Holdings" buckets={allocation.byHolding} currency={baseCurrency} />
              <AllocationList title="Sectors" buckets={allocation.bySector} currency={baseCurrency} />
              <AllocationList title="Countries" buckets={allocation.byCountry} currency={baseCurrency} />
            </Box>
          )}

          {activeSection === 'intelligence' && <PortfolioIntelligencePanel portfolioId={selectedId} />}

          {activeSection === 'transactions' && <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Transactions</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(6, 1fr)' }, gap: 1.5, mb: 2 }}>
              <TextField select label="Type" value={transactionForm.type} onChange={(event) => setTransactionForm({ ...transactionForm, type: event.target.value as PortfolioTransactionType })} size="small">
                <MenuItem value="BUY">BUY</MenuItem>
                <MenuItem value="SELL">SELL</MenuItem>
                <MenuItem value="CASH_IN">CASH_IN</MenuItem>
                <MenuItem value="CASH_OUT">CASH_OUT</MenuItem>
              </TextField>
              <InstrumentSearchSelect
                value={selectedTransactionInstrument}
                onChange={(instrument) => {
                  setSelectedTransactionInstrument(instrument);
                  setTransactionForm({ ...transactionForm, instrumentId: instrument?.id || '', currency: instrument?.currency || transactionForm.currency });
                }}
                disabled={transactionForm.type === 'CASH_IN' || transactionForm.type === 'CASH_OUT'}
              />
              <TextField label="Quantity" value={transactionForm.quantity} onChange={(event) => setTransactionForm({ ...transactionForm, quantity: event.target.value })} size="small" />
              <TextField label="Price" value={transactionForm.price} onChange={(event) => setTransactionForm({ ...transactionForm, price: event.target.value })} size="small" />
              <TextField label="Amount" value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })} size="small" />
              <TextField label="Date" type="date" value={transactionForm.transactionDate} onChange={(event) => setTransactionForm({ ...transactionForm, transactionDate: event.target.value })} size="small" />
            </Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
              <TextField label="Currency" value={transactionForm.currency} onChange={(event) => setTransactionForm({ ...transactionForm, currency: event.target.value.toUpperCase() })} size="small" />
              <TextField label="Notes" value={transactionForm.notes} onChange={(event) => setTransactionForm({ ...transactionForm, notes: event.target.value })} size="small" fullWidth />
              <Button variant="contained" onClick={submitTransaction}>Add Transaction</Button>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {transactions.length === 0 ? (
              <Typography color="text.secondary">No transactions recorded yet.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Instrument</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction: PortfolioTransaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.transactionDate).toLocaleDateString()}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>{resolveSymbol(transaction.instrumentId, holdingsSymbolMap)}</TableCell>
                      <TableCell align="right">{transaction.quantity ?? 'N/A'}</TableCell>
                      <TableCell align="right">{money(transaction.price, transaction.currency)}</TableCell>
                      <TableCell align="right">{money(transaction.amount, transaction.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>}
        </Stack>
      )}

      {/* Delete portfolio confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Portfolio</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &ldquo;{selectedPortfolio?.name}&rdquo;? All holdings and transactions will be permanently removed. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void handleDeletePortfolio()}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PortfolioManagementPage;
