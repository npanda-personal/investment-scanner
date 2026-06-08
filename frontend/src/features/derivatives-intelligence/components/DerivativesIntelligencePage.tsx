/**
 * Derivatives / F&O Intelligence Page
 *
 * Trader-facing research surface for NSE F&O (derivatives) insights, all derived
 * from the free NSE EOD bhavcopy and persisted server-side. Phase 1 ships the
 * Futures OI Buildup widget; PCR / max-pain / support-resistance and FII
 * derivatives positioning land in later phases.
 *
 * Research-support only — descriptive positioning analytics, never trade advice.
 */

import React from 'react';
import { Box, Container, Grid, Stack, Typography } from '@mui/material';
import OiBuildupWidget from './OiBuildupWidget';
import OptionMetricsWidget from './OptionMetricsWidget';
import ParticipantOiWidget from './ParticipantOiWidget';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import { NotApplicableForAssetClass } from '@/shared/components/NotApplicableForAssetClass';

export const DerivativesIntelligencePage: React.FC = () => {
  const { profile } = useMarketScope();
  // F&O derivatives intelligence here is sourced from the NSE EOD bhavcopy
  // (India-only). Other markets (US/EU/crypto) have no equivalent free feed yet.
  if (!profile.capabilities.hasInstitutionalFlow) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="h4" fontWeight={700}>Derivatives / F&amp;O</Typography>
          <Typography variant="body2" color="text.secondary">
            Exchange-traded derivatives positioning intelligence.
          </Typography>
        </Stack>
        <NotApplicableForAssetClass
          feature="Derivatives / F&O"
          detail="Derivatives positioning here is derived from the NSE F&O bhavcopy (India only). An equivalent free derivatives feed for this market is not available in this release."
        />
      </Container>
    );
  }
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>Derivatives / F&amp;O</Typography>
        <Typography variant="body2" color="text.secondary">
          NSE futures &amp; options positioning intelligence — open-interest buildup, derived from the
          end-of-day F&amp;O bhavcopy. Persisted daily; for research support only.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <OiBuildupWidget />
        </Grid>
        <Grid item xs={12} lg={6}>
          <OptionMetricsWidget />
        </Grid>
        <Grid item xs={12}>
          <ParticipantOiWidget />
        </Grid>
      </Grid>

      <Box sx={{ height: 24 }} />
    </Container>
  );
};

export default DerivativesIntelligencePage;
