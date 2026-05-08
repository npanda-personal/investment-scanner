import type { ReactNode } from 'react';
import { Button, Paper, Stack } from '@mui/material';

type FilterBarProps = {
  children: ReactNode;
  onReset?: () => void;
  showReset?: boolean;
};

export function FilterBar({ children, onReset, showReset = true }: FilterBarProps) {
  return (
    <Paper sx={{ p: 2, overflow: 'hidden' }}>
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        flexWrap="wrap"
        alignItems="center"
        sx={{
          '& .MuiTextField-root': {
            flex: '1 1 150px',
            minWidth: 0,
          },
          '& .MuiButton-root': {
            flex: { xs: '1 1 140px', sm: '0 0 auto' },
          },
        }}
      >
        {children}
        {onReset && showReset && <Button onClick={onReset}>Reset</Button>}
      </Stack>
    </Paper>
  );
}
