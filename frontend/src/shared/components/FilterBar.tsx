import type { ReactNode } from 'react';
import { Button, Paper, Stack } from '@mui/material';

type FilterBarProps = {
  children?: ReactNode;
  primaryFilters?: ReactNode;
  quickFilters?: ReactNode;
  actions?: ReactNode;
  onReset?: () => void;
  showReset?: boolean;
};

export function FilterBar({
  children,
  primaryFilters,
  quickFilters,
  actions,
  onReset,
  showReset = true,
}: FilterBarProps) {
  const filterZone = primaryFilters ?? children;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, overflow: 'visible', maxWidth: '100%' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{
          maxWidth: '100%',
          minWidth: 0,
          '& .MuiTextField-root': {
            flex: '0 1 180px',
            minWidth: 0,
            maxWidth: '100%',
          },
          '& .MuiFormControlLabel-root': {
            flex: { xs: '1 1 220px', md: '0 1 auto' },
            minWidth: 0,
            mr: 0,
          },
          '& .MuiFormControlLabel-label': {
            whiteSpace: 'normal',
          },
          '& .MuiButton-root': {
            minHeight: 32,
            whiteSpace: 'normal',
          },
        }}
      >
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ minWidth: 0, flex: '1 1 440px' }}>
          {filterZone}
        </Stack>
        {(quickFilters || actions || onReset) && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            alignItems="center"
            justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            sx={{ minWidth: 0, flex: { xs: '1 1 100%', md: '0 1 auto' } }}
          >
            {quickFilters}
            {actions}
            {onReset && showReset && (
              <Button variant="text" onClick={onReset}>
                Reset
              </Button>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
