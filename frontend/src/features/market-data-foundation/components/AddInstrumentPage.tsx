import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { createInstrument, type V1CreateInstrumentRequest } from '../api/marketDataFoundationService';

const initialForm: V1CreateInstrumentRequest = {
  symbol: '',
  company_name: '',
  exchange: '',
  currency: 'USD',
  asset_type: 'EQUITY',
  isin: '',
};

const AddInstrumentPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<V1CreateInstrumentRequest>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredMissing = !form.symbol.trim() || !form.company_name.trim() || !form.exchange.trim() || !form.currency.trim() || !form.asset_type.trim();

  const updateField = (field: keyof V1CreateInstrumentRequest, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (requiredMissing) {
      setError('Symbol, company name, exchange, currency, and asset type are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const instrument = await createInstrument({
        ...form,
        symbol: form.symbol.trim().toUpperCase(),
        exchange: form.exchange.trim().toUpperCase(),
        currency: form.currency.trim().toUpperCase(),
        asset_type: form.asset_type.trim().toUpperCase(),
        isin: form.isin?.trim() || undefined,
      });
      navigate(`/market-data-foundation/${instrument.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create instrument');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>Add Instrument</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create a market instrument with the required identifiers used by the Market Data Foundation APIs.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField
            required
            label="Symbol"
            value={form.symbol}
            onChange={(event) => updateField('symbol', event.target.value.toUpperCase())}
            placeholder="AAPL"
          />
          <TextField
            required
            label="Company Name"
            value={form.company_name}
            onChange={(event) => updateField('company_name', event.target.value)}
            placeholder="Apple Inc."
          />
          <TextField
            required
            label="Exchange"
            value={form.exchange}
            onChange={(event) => updateField('exchange', event.target.value.toUpperCase())}
            placeholder="NASDAQ"
          />
          <TextField
            required
            select
            label="Currency"
            value={form.currency}
            onChange={(event) => updateField('currency', event.target.value)}
          >
            {['USD', 'INR', 'EUR', 'GBP', 'CAD'].map((currency) => (
              <MenuItem key={currency} value={currency}>{currency}</MenuItem>
            ))}
          </TextField>
          <TextField
            required
            select
            label="Asset Type"
            value={form.asset_type}
            onChange={(event) => updateField('asset_type', event.target.value)}
          >
            {['EQUITY', 'ETF', 'INDEX', 'FUND'].map((assetType) => (
              <MenuItem key={assetType} value={assetType}>{assetType}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="ISIN or Unique Identifier"
            value={form.isin || ''}
            onChange={(event) => updateField('isin', event.target.value.toUpperCase())}
            placeholder="Optional"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button variant="outlined" onClick={() => navigate('/market-data-foundation')} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={saving || requiredMissing}>
            {saving ? 'Saving...' : 'Create Instrument'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default AddInstrumentPage;
