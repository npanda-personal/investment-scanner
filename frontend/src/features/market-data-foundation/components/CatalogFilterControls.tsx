import React from 'react';
import { Button, CircularProgress, InputAdornment, MenuItem, TextField } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { FilterBar } from '@/shared/components';

/**
 * Capability flags derived from the global market scope. The header is the sole
 * source of truth for region + asset class, so India/NSE-specific refinements
 * (F&O, SME segment, cash/futures class) only render when the scope is Indian
 * equity, and exchange filtering is hidden for crypto.
 */
export interface CatalogScopeCapability {
  isIndiaEquity: boolean;
  isCryptoScope: boolean;
  region: string;
}

/** Known exchanges per region that actually carry instruments (verified against the data).
 *  Currency is intentionally NOT a filter — it is fully determined by the region. Segment/Class
 *  is also NOT a filter: the global header owns the asset class, so within (e.g.) STOCK every
 *  non-CASH segment returns zero — the F&O-eligible and SME filters cover the real STOCK
 *  sub-distinctions. */
const EXCHANGES_BY_REGION: Record<string, string[]> = {
  IN: ['NSE', 'BSE'],
  US: ['NASDAQ', 'NYSE', 'AMEX', 'ARCA', 'BATS'],
  EU: ['LSE', 'XETRA', 'EURONEXT', 'BME'],
};

export interface CatalogFilterControlsProps {
  capability: CatalogScopeCapability;
  search: string;
  exchange: string;
  derivativesEligible: string;
  catalogSource: string;
  loading: boolean;
  hasLocalFilters: boolean;
  onSearchChange: (value: string) => void;
  onExchangeChange: (value: string) => void;
  onDerivativesEligibleChange: (value: string) => void;
  onCatalogSourceChange: (value: string) => void;
  onResetPage: () => void;
  onReset: () => void;
  onRefresh: () => void;
}

const CatalogFilterControls: React.FC<CatalogFilterControlsProps> = ({
  capability,
  search,
  exchange,
  derivativesEligible,
  catalogSource,
  loading,
  hasLocalFilters,
  onSearchChange,
  onExchangeChange,
  onDerivativesEligibleChange,
  onCatalogSourceChange,
  onResetPage,
  onReset,
  onRefresh,
}) => {
  const { isIndiaEquity, isCryptoScope, region } = capability;
  const exchangeOptions = EXCHANGES_BY_REGION[String(region || '').toUpperCase()] ?? [];

  return (
    <FilterBar onReset={onReset} showReset={hasLocalFilters}>
      <TextField
        sx={{ flexBasis: { xs: '100%', md: 320 }, flexGrow: { md: 2 } }}
        size="small"
        label="Search by symbol or company"
        value={search}
        onChange={(event) => {
          onSearchChange(event.target.value);
          onResetPage();
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      {!isCryptoScope && exchangeOptions.length > 0 && (
        <TextField
          select
          size="small"
          label="Exchange"
          value={exchange}
          onChange={(event) => { onExchangeChange(event.target.value); onResetPage(); }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          {exchangeOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </TextField>
      )}
      {isIndiaEquity && (
        <TextField
          select
          size="small"
          label="F&O Eligible"
          value={derivativesEligible}
          onChange={(event) => { onDerivativesEligibleChange(event.target.value); onResetPage(); }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="true">Yes</MenuItem>
          <MenuItem value="false">No</MenuItem>
        </TextField>
      )}
      {isIndiaEquity && (
        <TextField
          select
          size="small"
          label="SME / Segment"
          value={catalogSource}
          onChange={(event) => { onCatalogSourceChange(event.target.value); onResetPage(); }}
          title="Filter by NSE segment classification (Main Board vs SME)."
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="NSE_EQUITY_SECURITIES">NSE Main Board (EQ)</MenuItem>
          <MenuItem value="NSE_SME_EQUITY_SECURITIES">NSE SME only</MenuItem>
        </TextField>
      )}
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={18} /> : <RefreshIcon />}
        onClick={onRefresh}
        disabled={loading}
      >
        Refresh
      </Button>
    </FilterBar>
  );
};

export default CatalogFilterControls;
