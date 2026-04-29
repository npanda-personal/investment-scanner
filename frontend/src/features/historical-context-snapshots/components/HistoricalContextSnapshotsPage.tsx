import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { generateSnapshots, lookupSnapshots } from '../api/historicalContextSnapshotsService';
import { useHistoricalContextSnapshots } from '../hooks';
import type { SnapshotLookupResult } from '../types';

const today = () => new Date().toISOString().slice(0, 10);
const pct = (value: number | null | undefined) => value === null || value === undefined ? 'N/A' : `${(value * 100).toFixed(1)}%`;

const CoverageCard: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <Paper sx={{ p: 2 }}>
    <Typography color="text.secondary" variant="body2">{label}</Typography>
    <Typography variant="h5">{value}</Typography>
  </Paper>
);

const HistoricalContextSnapshotsPage: React.FC = () => {
  const { coverage, market, sectors, countries, loading, error, reload } = useHistoricalContextSnapshots();
  const [snapshotDate, setSnapshotDate] = useState(today());
  const [limit, setLimit] = useState('50');
  const [lookupDate, setLookupDate] = useState(today());
  const [instrumentId, setInstrumentId] = useState('');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('');
  const [lookup, setLookup] = useState<SnapshotLookupResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const runGenerate = async () => {
    setMessage(null);
    setFormError(null);
    try {
      const result = await generateSnapshots({ snapshotDate, limit: Number(limit) || 50 });
      setMessage(`Generated ${result.snapshotDate}: market ${result.market.inserted + result.market.updated}, sectors ${result.sectors.inserted + result.sectors.updated}, countries ${result.countries.inserted + result.countries.updated}, smart money ${result.smartMoney.inserted + result.smartMoney.updated}. ${result.warnings.length ? `Warnings: ${result.warnings.slice(0, 3).join('; ')}` : ''}`);
      await reload();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to generate snapshots');
    }
  };

  const runLookup = async () => {
    setFormError(null);
    try {
      setLookup(await lookupSnapshots({
        date: lookupDate,
        instrumentId: instrumentId || undefined,
        sector: sector || undefined,
        country: country || undefined,
      }));
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to lookup snapshots');
    }
  };

  if (loading && !coverage) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1500, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">Historical Context Snapshots</Typography>
          <Typography color="text.secondary">Persist market regime, breadth, sector, country, smart-money, and data-quality context for historical signal evaluation.</Typography>
        </Box>
        <Button component={Link} to="/signals/quality" variant="outlined">Open Signal Quality Lab</Button>
      </Stack>

      {(error || formError) && <Alert severity="error" sx={{ mb: 2 }}>{error || formError}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {coverage?.warnings?.map((warning) => <Alert key={warning} severity="warning" sx={{ mb: 2 }}>{warning}</Alert>)}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, gap: 2, mb: 3 }}>
        <CoverageCard label="Market Snapshots" value={coverage?.marketSnapshots ?? 0} />
        <CoverageCard label="Sector Snapshots" value={coverage?.sectorSnapshots ?? 0} />
        <CoverageCard label="Country Snapshots" value={coverage?.countrySnapshots ?? 0} />
        <CoverageCard label="Smart Money" value={coverage?.smartMoneySnapshots ?? 0} />
        <CoverageCard label="Latest Date" value={coverage?.latestSnapshotDate ? new Date(coverage.latestSnapshotDate).toLocaleDateString() : 'None'} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Generate Snapshot</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField label="Snapshot date" type="date" value={snapshotDate} onChange={(event) => setSnapshotDate(event.target.value)} size="small" />
            <TextField label="Smart-money limit" value={limit} onChange={(event) => setLimit(event.target.value)} size="small" />
            <Button variant="contained" onClick={runGenerate}>Generate</Button>
          </Stack>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>Generation is manual in MVP. No scheduler or paid data provider is required.</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Lookup Tool</Typography>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField label="Date" type="date" value={lookupDate} onChange={(event) => setLookupDate(event.target.value)} size="small" />
              <TextField label="Instrument ID" value={instrumentId} onChange={(event) => setInstrumentId(event.target.value)} size="small" />
              <TextField label="Sector" value={sector} onChange={(event) => setSector(event.target.value)} size="small" />
              <TextField label="Country" value={country} onChange={(event) => setCountry(event.target.value)} size="small" />
              <Button variant="outlined" onClick={runLookup}>Lookup</Button>
            </Stack>
            {lookup && (
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Chip label={lookup.dataStatus} color={lookup.dataStatus === 'COMPLETE' ? 'success' : lookup.dataStatus === 'PARTIAL' ? 'warning' : 'default'} />
                  {lookup.market && <Chip label={`Regime: ${lookup.market.regime}`} />}
                </Stack>
                <Typography variant="body2">Market: {lookup.market ? `${lookup.market.regime} (${lookup.market.regimeScore})` : 'Missing'}</Typography>
                <Typography variant="body2">Sector: {lookup.sector ? `${lookup.sector.sector} ${lookup.sector.leadershipStatus}` : 'Missing or not requested'}</Typography>
                <Typography variant="body2">Country: {lookup.country ? lookup.country.country : 'Missing or not requested'}</Typography>
                <Typography variant="body2">Smart Money: {lookup.smartMoney ? `${lookup.smartMoney.symbol} ${lookup.smartMoney.status}` : 'Missing or not requested'}</Typography>
                {lookup.gaps.length > 0 && <Typography color="text.secondary" variant="body2">Gaps: {lookup.gaps.join(', ')}</Typography>}
              </Paper>
            )}
          </Stack>
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, 1fr)' }, gap: 3 }}>
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Market Regime Snapshots</Typography>
          {market.length === 0 ? <Typography color="text.secondary">No market snapshots yet.</Typography> : (
            <Table size="small">
              <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Regime</TableCell><TableCell>Score</TableCell><TableCell>SMA50</TableCell></TableRow></TableHead>
              <TableBody>{market.map((item) => <TableRow key={item.id}><TableCell>{new Date(item.snapshotDate).toLocaleDateString()}</TableCell><TableCell>{item.regime}</TableCell><TableCell>{item.regimeScore}</TableCell><TableCell>{pct(item.breadthPercentAboveSma50)}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </Paper>
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Sector Snapshots</Typography>
          {sectors.length === 0 ? <Typography color="text.secondary">No sector snapshots yet.</Typography> : (
            <Table size="small">
              <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Sector</TableCell><TableCell>Status</TableCell><TableCell>Score</TableCell></TableRow></TableHead>
              <TableBody>{sectors.slice(0, 12).map((item) => <TableRow key={item.id}><TableCell>{new Date(item.snapshotDate).toLocaleDateString()}</TableCell><TableCell>{item.sector}</TableCell><TableCell>{item.leadershipStatus}</TableCell><TableCell>{item.relativeStrengthScore}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </Paper>
        <Paper sx={{ p: 2, overflowX: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Country Snapshots</Typography>
          {countries.length === 0 ? <Typography color="text.secondary">No country snapshots yet.</Typography> : (
            <Table size="small">
              <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Country</TableCell><TableCell>Score</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
              <TableBody>{countries.slice(0, 12).map((item) => <TableRow key={item.id}><TableCell>{new Date(item.snapshotDate).toLocaleDateString()}</TableCell><TableCell>{item.country}</TableCell><TableCell>{item.relativeStrengthScore}</TableCell><TableCell>{item.dataStatus}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default HistoricalContextSnapshotsPage;
