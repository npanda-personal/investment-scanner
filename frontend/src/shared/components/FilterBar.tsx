import type { ReactNode } from 'react';
import { Button, Paper, Stack } from '@mui/material';

type FilterBarProps = {
  children: ReactNode;
  onReset?: () => void;
};

export function FilterBar({ children, onReset }: FilterBarProps) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
        {children}
        {onReset && <Button onClick={onReset} sx={{ ml: { md: 'auto' } }}>Reset</Button>}
      </Stack>
    </Paper>
  );
}
