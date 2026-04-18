import React from 'react';
import {
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { Watchlist } from '../../services/watchlistService';

export type ScanScope = 'database' | 'watchlist' | 'custom';

export interface ScanScopeSelectorProps {
  value?: {
    scope: ScanScope;
    watchlistId?: string;
    customSymbols?: string[];
  };
  onChange?: (value: {
    scope: ScanScope;
    watchlistId?: string;
    customSymbols?: string[];
  }) => void;
  watchlists?: Watchlist[];
}

const ScanScopeSelector: React.FC<ScanScopeSelectorProps> = ({
  value = { scope: 'database' },
  onChange,
  watchlists = [],
}) => {
  const handleScopeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newScope = event.target.value as ScanScope;
    const newValue = { ...value, scope: newScope };
    if (newScope !== 'watchlist') newValue.watchlistId = undefined;
    if (newScope !== 'custom') newValue.customSymbols = [];
    onChange?.(newValue);
  };

  const handleWatchlistChange = (watchlistId: string) => {
    onChange?.({ ...value, watchlistId });
  };

  const handleCustomSymbolsStringChange = (symbolsString: string) => {
    const symbols = symbolsString.split(',').map(s => s.trim()).filter(s => s.length > 0);
    onChange?.({ ...value, customSymbols: symbols });
  };

  const customSymbolsString = (value.customSymbols || []).join(', ');

  return (
    <Box>
      <FormControl component="fieldset">
        <FormLabel component="legend" required>Scan Scope</FormLabel>
        <RadioGroup
          row
          value={value.scope}
          onChange={handleScopeChange}
          sx={{ mt: 1, gap: 2 }}
        >
          <FormControlLabel
            value="database"
            control={<Radio />}
            label={
              <Box>
                <strong>Complete Stock Universe</strong>
                <Typography variant="body2" color="text.secondary">
                  Scan all symbols available in the system (default).
                </Typography>
              </Box>
            }
            sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}
          />
          <FormControlLabel
            value="watchlist"
            control={<Radio />}
            label={
              <Box>
                <strong>Watchlist</strong>
                <Typography variant="body2" color="text.secondary">
                  Scan only the symbols in one of your watchlists.
                </Typography>
              </Box>
            }
            sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}
          />
          <FormControlLabel
            value="custom"
            control={<Radio />}
            label={
              <Box>
                <strong>Symbols</strong>
                <Typography variant="body2" color="text.secondary">
                  Scan a custom, user‑provided list of symbols.
                </Typography>
              </Box>
            }
            sx={{ flex: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}
          />
        </RadioGroup>
      </FormControl>

      {value.scope === 'watchlist' && (
        <Box mt={3}>
          <FormControl fullWidth required>
            <FormLabel>Select Watchlist</FormLabel>
            <Select
              value={value.watchlistId || ''}
              onChange={(e) => handleWatchlistChange(e.target.value)}
              size="small"
              error={!value.watchlistId}
            >
              <MenuItem value="">-- Select a watchlist --</MenuItem>
              {watchlists.map((wl) => (
                <MenuItem key={wl.id} value={wl.id}>
                  {wl.name} ({wl.symbols?.length || 0} symbols)
                </MenuItem>
              ))}
            </Select>
            {!value.watchlistId && (
              <Typography variant="caption" color="error">
                A watchlist must be selected.
              </Typography>
            )}
          </FormControl>
        </Box>
      )}

      {value.scope === 'custom' && (
        <Box mt={3}>
          <FormLabel>Symbols (comma‑separated)</FormLabel>
          <TextField
            fullWidth
            size="small"
            placeholder="AAPL, MSFT, GOOGL"
            value={customSymbolsString}
            onChange={(e) => handleCustomSymbolsStringChange(e.target.value)}
            helperText="Enter stock symbols separated by commas."
            sx={{ mt: 1 }}
          />
        </Box>
      )}
    </Box>
  );
};

export default ScanScopeSelector;