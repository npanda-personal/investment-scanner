import React from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { fetchInstruments, type V1Instrument } from '@/features/market-data-foundation';

type InstrumentSearchSelectProps = {
  label?: string;
  value: V1Instrument | null;
  onChange: (value: V1Instrument | null) => void;
  disabled?: boolean;
};

export function InstrumentSearchSelect({ label = 'Stock / instrument', value, onChange, disabled }: InstrumentSearchSelectProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [options, setOptions] = React.useState<V1Instrument[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const handle = window.setTimeout(() => {
      setLoading(true);
      fetchInstruments({ search: inputValue || undefined, page: 1, pageSize: 20, sortBy: 'symbol', sortOrder: 'asc' })
        .then((response) => {
          if (active) setOptions(response.instruments);
        })
        .catch(() => {
          if (active) setOptions([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [inputValue]);

  return (
    <Autocomplete
      disabled={disabled}
      value={value}
      inputValue={inputValue}
      onInputChange={(_event, nextValue) => setInputValue(nextValue)}
      onChange={(_event, nextValue) => onChange(nextValue)}
      options={options}
      loading={loading}
      getOptionLabel={(option) => `${option.symbol} - ${option.company_name || 'Unknown company'}`}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <span>
            <strong>{option.symbol}</strong> {option.company_name}
            <br />
            <small>{[option.exchange, option.country, option.sector].filter(Boolean).join(' / ') || 'No market metadata'}</small>
          </span>
        </li>
      )}
    />
  );
}
