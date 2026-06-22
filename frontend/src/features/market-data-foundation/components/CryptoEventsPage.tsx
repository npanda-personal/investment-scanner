import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { PageHeader } from '@/shared/components';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';
import { fetchCryptoEvents, type CryptoEventRow, type CryptoEventsResponse } from '../api/cryptoEventsApi';

/**
 * Crypto Events page — persisted-read of upcoming crypto events (token unlocks,
 * mainnet upgrades, listings, etc.). Data is populated by the ingestion pipeline
 * when CRYPTO_COINMARKETCAL_API_KEY is configured. Until then the page renders a
 * clear empty state. For research support only, not advice.
 */
const CryptoEventsPage: React.FC = () => {
  const { profile } = useMarketScope();
  const [data, setData] = useState<CryptoEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.isCrypto) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCryptoEvents({ upcoming: true, limit: 100 })
      .then((resp) => { if (!cancelled) setData(resp); })
      .catch(() => { if (!cancelled) setError('Failed to load crypto events.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile.isCrypto]);

  if (!profile.isCrypto) {
    return (
      <Box sx={{ p: 3 }}>
        <PageHeader title="Crypto Events" subtitle="Switch the market scope to Crypto to view this page." />
        <NotApplicableForAssetClass
          feature="Crypto Events"
          detail="This page is only available under the Crypto asset class."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Crypto Events"
        subtitle="Upcoming token unlocks, upgrades, listings, and other scheduled events (research context only)."
      />

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Paper>
      ) : data?.api_key_required ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Events not yet available</Typography>
          <Typography color="text.secondary">
            Upcoming crypto events require a CoinMarketCal API key to be configured on the server.
            Once the key is set and the ingestion pipeline runs, upcoming token unlocks, protocol upgrades,
            and exchange listings will appear here.
          </Typography>
        </Paper>
      ) : data?.count === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No upcoming crypto events found in the latest snapshot. The pipeline populates this daily.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Coin</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Event</TableCell>
                <TableCell align="center">Hot</TableCell>
                <TableCell align="right">Votes</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Source</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.rows ?? []).map((row: CryptoEventRow) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {new Date(row.eventDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{row.symbol ?? '—'}</TableCell>
                  <TableCell>{row.category ?? '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.title}</Typography>
                    {row.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                        {row.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {row.isHot
                      ? <Chip label="Hot" size="small" color="warning" sx={{ fontSize: '0.65rem' }} />
                      : <Typography variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell align="right">{row.votes ?? '—'}</TableCell>
                  <TableCell>{row.dateConfidence ?? '—'}</TableCell>
                  <TableCell>
                    {row.proofUrl
                      ? <Link href={row.proofUrl} target="_blank" rel="noopener noreferrer" variant="body2">Proof</Link>
                      : row.sourceUrl
                        ? <Link href={row.sourceUrl} target="_blank" rel="noopener noreferrer" variant="body2">Link</Link>
                        : <Typography variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        For research context only, not financial advice. Events are sourced from CoinMarketCal.
      </Typography>
    </Box>
  );
};

export default CryptoEventsPage;
