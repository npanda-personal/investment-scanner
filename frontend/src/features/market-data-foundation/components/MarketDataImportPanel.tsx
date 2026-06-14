import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import { HistoricalBackfillRunEvidence, SourceFileImportEvidence } from './MarketDataOpsEvidence';
import type {
  CatalogSourceInfo,
  ExchangeHistoricalBackfillResponse,
  MarketDataSourceFileImportRecord,
} from '../api/marketDataFoundationService';

type BackfillInputMode = 'DATE_RANGE' | 'YEAR';
type ImportMode = 'CONFIGURED_URL' | 'MANUAL_CSV' | 'INTERNAL_SEED';
type SourceFileImportSortBy = 'importedAt' | 'tradingDate';
type SourceFileImportSortDirection = 'asc' | 'desc';

type ManualFundamentalState = {
  stockId: string;
  periodType: string;
  periodEndDate: string;
  revenue: string;
  eps: string;
  netIncome: string;
  peRatio: string;
  marketCap: string;
  sourceNote: string;
  sourceUrl: string;
  validatedBy: string;
};

/**
 * Ingestion capabilities derived from the global market scope. The header is the
 * sole source of truth, so exchange-file import / backfill / source-file evidence
 * only render for India (NSE/BSE), manual fundamentals are hidden for crypto, and
 * when nothing applies a single explanatory note is shown instead.
 */
export interface IngestionCapability {
  region: string;
  isCryptoScope: boolean;
  hasCatalogSources: boolean;
  hasExchangeFiles: boolean;
  hasManualFundamentals: boolean;
  hasAnyIngestionControl: boolean;
}

export interface MarketDataImportPanelProps {
  capability: IngestionCapability;
  // Catalog import / source selection
  availableCatalogSources: CatalogSourceInfo[];
  selectedCatalogSource?: CatalogSourceInfo;
  importMode: ImportMode;
  catalogCsv: string;
  importAvailable: boolean;
  importingCatalog: boolean;
  backfillingCatalog: boolean;
  operatorBackgroundActive: boolean;
  onImportModeChange: (mode: ImportMode) => void;
  onImportSourceChange: (source: string) => void;
  onCatalogCsvChange: (value: string) => void;
  onImportCatalog: () => void;
  onBackfillCatalog: () => void;
  // Historical exchange candle backfill
  historicalBackfillInputMode: BackfillInputMode;
  historicalStartDate: string;
  historicalEndDate: string;
  historicalBackfillStartYear: string;
  historicalBackfillEndYear: string;
  historicalBackfillYearOptions: string[];
  latestSelectableBackfillDate: string;
  selectedHistoricalBackfillRange: { startDate: string; endDate: string };
  historicalBackfillRunning: boolean;
  historicalBackfillResult: ExchangeHistoricalBackfillResponse | null;
  onHistoricalBackfillInputModeChange: (mode: BackfillInputMode) => void;
  onHistoricalStartDateChange: (value: string) => void;
  onHistoricalEndDateChange: (value: string) => void;
  onHistoricalBackfillStartYearChange: (year: string) => void;
  onHistoricalBackfillEndYearChange: (year: string) => void;
  onRunHistoricalBackfill: () => void;
  onResumeHistoricalBackfill: () => void;
  onRetryHistoricalBackfill: () => void;
  onCancelHistoricalBackfill: () => void;
  // Manual verified fundamentals
  manualFundamental: ManualFundamentalState;
  manualFundamentalRunning: boolean;
  onManualFundamentalFieldChange: (field: keyof ManualFundamentalState, value: string) => void;
  onManualFundamentalImport: () => void;
  // Source file evidence
  sourceImports: MarketDataSourceFileImportRecord[];
  sourceImportsLoaded: boolean;
  sourceImportsLoading: boolean;
  sourceImportSortBy: SourceFileImportSortBy;
  sourceImportSortDirection: SourceFileImportSortDirection;
  onLoadSourceImports: () => void;
  onSourceImportSortChange: (sortBy: SourceFileImportSortBy) => void;
}

const MarketDataImportPanel: React.FC<MarketDataImportPanelProps> = ({
  capability,
  availableCatalogSources,
  selectedCatalogSource,
  importMode,
  catalogCsv,
  importAvailable,
  importingCatalog,
  backfillingCatalog,
  operatorBackgroundActive,
  onImportModeChange,
  onImportSourceChange,
  onCatalogCsvChange,
  onImportCatalog,
  onBackfillCatalog,
  historicalBackfillInputMode,
  historicalStartDate,
  historicalEndDate,
  historicalBackfillStartYear,
  historicalBackfillEndYear,
  historicalBackfillYearOptions,
  latestSelectableBackfillDate,
  selectedHistoricalBackfillRange,
  historicalBackfillRunning,
  historicalBackfillResult,
  onHistoricalBackfillInputModeChange,
  onHistoricalStartDateChange,
  onHistoricalEndDateChange,
  onHistoricalBackfillStartYearChange,
  onHistoricalBackfillEndYearChange,
  onRunHistoricalBackfill,
  onResumeHistoricalBackfill,
  onRetryHistoricalBackfill,
  onCancelHistoricalBackfill,
  manualFundamental,
  manualFundamentalRunning,
  onManualFundamentalFieldChange,
  onManualFundamentalImport,
  sourceImports,
  sourceImportsLoaded,
  sourceImportsLoading,
  sourceImportSortBy,
  sourceImportSortDirection,
  onLoadSourceImports,
  onSourceImportSortChange,
}) => {
  const {
    region,
    isCryptoScope,
    hasCatalogSources,
    hasExchangeFiles,
    hasManualFundamentals,
    hasAnyIngestionControl,
  } = capability;
  const regionLabel = region === 'GLOBAL' ? 'Global' : (region || 'This market');

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'visible',
      }}
    >
      <Stack spacing={1.5}>
        {!hasAnyIngestionControl && (
          <Alert severity="info">
            {isCryptoScope
              ? 'Crypto is ingested by the 24/7 lane — no manual catalog import, exchange-file backfill, or source-file evidence applies here. Use the Catalog tab to inspect crypto instruments.'
              : `${regionLabel} ingests via its configured provider; catalog is seed-maintained. No exchange-file import/backfill applies.`}
          </Alert>
        )}

        {hasCatalogSources && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(180px, 1fr)) auto' },
                gap: 1.5,
                alignItems: 'center',
                maxWidth: '100%',
                '& .MuiTextField-root': { minWidth: 0 },
              }}
            >
              <TextField select size="small" label="Import Mode" value={importMode} onChange={(event) => onImportModeChange(event.target.value as ImportMode)}>
                {(!selectedCatalogSource || selectedCatalogSource.supportsConfiguredUrl) && <MenuItem value="CONFIGURED_URL">Configured URL</MenuItem>}
                {selectedCatalogSource?.supportsInternalSeed && <MenuItem value="INTERNAL_SEED">Internal Seed</MenuItem>}
                {(!selectedCatalogSource || selectedCatalogSource.supportsManualCsv) && <MenuItem value="MANUAL_CSV">Manual CSV</MenuItem>}
              </TextField>
              <TextField select size="small" label="Catalog Source" value={selectedCatalogSource?.catalogSource ?? ''} onChange={(event) => onImportSourceChange(event.target.value)}>
                {availableCatalogSources.map((item) => <MenuItem key={item.catalogSource} value={item.catalogSource}>{item.displayName || item.catalogSource}</MenuItem>)}
              </TextField>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                sx={{ justifySelf: { xs: 'stretch', lg: 'end' }, minWidth: 0 }}
              >
                <Button
                  variant="outlined"
                  startIcon={importingCatalog ? <CircularProgress size={18} /> : <SyncIcon />}
                  onClick={onImportCatalog}
                  disabled={operatorBackgroundActive || importingCatalog || backfillingCatalog || !importAvailable}
                  sx={{ flex: { xs: '1 1 auto', sm: '0 1 auto' }, whiteSpace: 'nowrap' }}
                >
                  {importingCatalog ? 'Importing...' : 'Import Catalog'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={backfillingCatalog ? <CircularProgress size={18} /> : <SyncIcon />}
                  onClick={onBackfillCatalog}
                  disabled={operatorBackgroundActive || backfillingCatalog || importingCatalog}
                  sx={{ flex: { xs: '1 1 auto', sm: '0 1 auto' }, whiteSpace: 'nowrap' }}
                >
                  {backfillingCatalog ? 'Backfilling...' : 'Backfill Metadata'}
                </Button>
              </Stack>
            </Box>
            {selectedCatalogSource && (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" label={selectedCatalogSource.region} />
                {selectedCatalogSource.assetType && <Chip size="small" label={selectedCatalogSource.assetType} />}
                {selectedCatalogSource.segmentClass && <Chip size="small" label={selectedCatalogSource.segmentClass} />}
                {selectedCatalogSource.supportsInternalSeed ? (
                  <Chip size="small" color="success" label="Uses built-in seed list" />
                ) : importMode === 'MANUAL_CSV' && !selectedCatalogSource.urlConfigured ? (
                  <Chip size="small" color="warning" label="Manual CSV required" />
                ) : (
                  <Chip size="small" color={selectedCatalogSource.urlConfigured ? 'success' : 'warning'} label={`URL configured: ${selectedCatalogSource.urlConfigured ? 'Yes' : 'No'}`} />
                )}
                <Chip size="small" label={`Source: ${selectedCatalogSource.urlSource === 'ENV' ? 'Env' : selectedCatalogSource.urlSource === 'DEFAULT' ? 'Default' : selectedCatalogSource.urlSource === 'INTERNAL_SEED' ? 'Internal Seed' : 'Manual setup'}`} />
              </Stack>
            )}
            {importMode === 'CONFIGURED_URL' && selectedCatalogSource && !selectedCatalogSource.urlConfigured && (
              <Alert severity="warning">{selectedCatalogSource.setupHint || 'No configured URL for this source. Use Manual CSV or configure the source URL.'}</Alert>
            )}
            {importMode === 'MANUAL_CSV' && selectedCatalogSource && !selectedCatalogSource.urlConfigured && selectedCatalogSource.setupHint && (
              <Alert severity="info">{selectedCatalogSource.setupHint}</Alert>
            )}
            {importMode === 'INTERNAL_SEED' && selectedCatalogSource && (
              <Alert severity="info">{selectedCatalogSource.setupHint || 'Uses a built-in seed list. No URL is required.'}</Alert>
            )}
            {importMode === 'MANUAL_CSV' && (
              <TextField
                multiline
                minRows={3}
                size="small"
                label="Catalog CSV"
                value={catalogCsv}
                onChange={(event) => onCatalogCsvChange(event.target.value)}
                placeholder={`Paste ${selectedCatalogSource?.displayName || 'catalog'} CSV here. Index seed import does not require CSV.`}
              />
            )}
          </>
        )}

        {hasExchangeFiles && (
          <>
            {hasCatalogSources && <Divider />}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Historical Exchange Candle Backfill</Typography>
              <Stack spacing={1.25}>
                <FormControl>
                  <FormLabel id="market-data-historical-backfill-mode-label">Backfill mode</FormLabel>
                  <RadioGroup
                    row
                    aria-labelledby="market-data-historical-backfill-mode-label"
                    value={historicalBackfillInputMode}
                    onChange={(event) => onHistoricalBackfillInputModeChange(event.target.value as BackfillInputMode)}
                  >
                    <FormControlLabel value="DATE_RANGE" control={<Radio size="small" />} label="Date range" />
                    <FormControlLabel value="YEAR" control={<Radio size="small" />} label="By year" />
                  </RadioGroup>
                </FormControl>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: historicalBackfillInputMode === 'YEAR'
                        ? 'minmax(160px, 220px) minmax(160px, 220px) auto'
                        : 'minmax(180px, 240px) minmax(180px, 240px) auto',
                    },
                    gap: 1,
                    alignItems: 'center',
                  }}
                >
                  {historicalBackfillInputMode === 'YEAR' ? (
                    <>
                      <TextField
                        select
                        size="small"
                        label="From year"
                        value={historicalBackfillStartYear}
                        onChange={(event) => onHistoricalBackfillStartYearChange(event.target.value)}
                        fullWidth
                      >
                        {historicalBackfillYearOptions.map((year) => (
                          <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        label="To year"
                        value={historicalBackfillEndYear}
                        onChange={(event) => onHistoricalBackfillEndYearChange(event.target.value)}
                        fullWidth
                      >
                        {historicalBackfillYearOptions.map((year) => (
                          <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                      </TextField>
                    </>
                  ) : (
                    <>
                      <TextField size="small" type="date" label="Start Date" value={historicalStartDate} onChange={(event) => onHistoricalStartDateChange(event.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ max: latestSelectableBackfillDate }} fullWidth />
                      <TextField size="small" type="date" label="End Date" value={historicalEndDate} onChange={(event) => onHistoricalEndDateChange(event.target.value)} InputLabelProps={{ shrink: true }} inputProps={{ max: latestSelectableBackfillDate }} fullWidth />
                    </>
                  )}
                  <Button
                    variant="contained"
                    startIcon={historicalBackfillRunning ? <CircularProgress size={18} /> : <SyncIcon />}
                    onClick={onRunHistoricalBackfill}
                    disabled={operatorBackgroundActive || historicalBackfillRunning || !selectedHistoricalBackfillRange.startDate || !selectedHistoricalBackfillRange.endDate}
                    sx={{ height: 40, whiteSpace: 'nowrap', width: 'fit-content', justifySelf: 'start', minWidth: 132 }}
                  >
                    {historicalBackfillRunning ? 'Starting...' : 'Run Backfill'}
                  </Button>
                </Box>
              </Stack>
              {historicalBackfillResult && (
                <Box sx={{ mt: 1.5 }}>
                  <HistoricalBackfillRunEvidence
                    run={historicalBackfillResult}
                    loading={historicalBackfillRunning}
                    onResume={onResumeHistoricalBackfill}
                    onRetry={onRetryHistoricalBackfill}
                    onCancel={onCancelHistoricalBackfill}
                  />
                </Box>
              )}
            </Box>
          </>
        )}

        {hasManualFundamentals && (
          <>
            {(hasCatalogSources || hasExchangeFiles) && <Divider />}
            <Box>
              <Typography variant="subtitle2" gutterBottom>Manual Verified Fundamentals</Typography>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', md: 'center' }}
                useFlexGap
                flexWrap="wrap"
              >
                <TextField size="small" label="Stock ID" value={manualFundamental.stockId} onChange={(event) => onManualFundamentalFieldChange('stockId', event.target.value)} />
                <TextField select size="small" label="Period" value={manualFundamental.periodType} onChange={(event) => onManualFundamentalFieldChange('periodType', event.target.value)} sx={{ maxWidth: { md: 140 } }}>
                  <MenuItem value="ANNUAL">Annual</MenuItem>
                  <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                  <MenuItem value="TTM">TTM</MenuItem>
                </TextField>
                <TextField size="small" type="date" label="Period End" value={manualFundamental.periodEndDate} onChange={(event) => onManualFundamentalFieldChange('periodEndDate', event.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField size="small" label="EPS" value={manualFundamental.eps} onChange={(event) => onManualFundamentalFieldChange('eps', event.target.value)} sx={{ maxWidth: { md: 120 } }} />
                <TextField size="small" label="P/E" value={manualFundamental.peRatio} onChange={(event) => onManualFundamentalFieldChange('peRatio', event.target.value)} sx={{ maxWidth: { md: 120 } }} />
                <TextField size="small" label="Market Cap" value={manualFundamental.marketCap} onChange={(event) => onManualFundamentalFieldChange('marketCap', event.target.value)} sx={{ maxWidth: { md: 150 } }} />
                <TextField size="small" label="Source Note" value={manualFundamental.sourceNote} onChange={(event) => onManualFundamentalFieldChange('sourceNote', event.target.value)} />
                <TextField size="small" label="Source URL" value={manualFundamental.sourceUrl} onChange={(event) => onManualFundamentalFieldChange('sourceUrl', event.target.value)} />
                <TextField size="small" label="Validated By" value={manualFundamental.validatedBy} onChange={(event) => onManualFundamentalFieldChange('validatedBy', event.target.value)} sx={{ maxWidth: { md: 180 } }} />
                <Button
                  variant="contained"
                  startIcon={manualFundamentalRunning ? <CircularProgress size={18} /> : <FactCheckIcon />}
                  onClick={onManualFundamentalImport}
                  disabled={operatorBackgroundActive || manualFundamentalRunning}
                >
                  {manualFundamentalRunning ? 'Importing...' : 'Import Fundamentals'}
                </Button>
              </Stack>
            </Box>
          </>
        )}

        {hasExchangeFiles && (
          <>
            <Divider />
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2">Source File Evidence</Typography>
                  <Chip size="small" label="Latest 10" variant="outlined" />
                </Stack>
                <Button size="small" startIcon={sourceImportsLoading ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={onLoadSourceImports} disabled={sourceImportsLoading}>
                  Refresh Evidence
                </Button>
              </Stack>
              {sourceImportsLoaded ? (
                <SourceFileImportEvidence
                  imports={sourceImports}
                  sortBy={sourceImportSortBy}
                  sortDirection={sourceImportSortDirection}
                  onSortChange={onSourceImportSortChange}
                />
              ) : (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">Refresh Evidence loads the latest SourceFileImport records.</Typography>
                </Paper>
              )}
            </Box>
          </>
        )}
      </Stack>
    </Paper>
  );
};

export default MarketDataImportPanel;
