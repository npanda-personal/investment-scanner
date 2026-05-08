import type { ReactNode } from 'react';
import { Button, Paper, Stack } from '@mui/material';

type FilterBarProps = {
  children: ReactNode;
  onReset?: () => void;
  showReset?: boolean;
};

export function FilterBar({ children, onReset, showReset = true }: FilterBarProps) {
  return (
    <Paper sx={{ p: 2, overflow: 'visible', maxWidth: '100%' }}>
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        flexWrap="wrap"
        alignItems="center"
        sx={{
          maxWidth: '100%',
          '& .MuiTextField-root': {
            flex: '1 1 160px',
            minWidth: 0,
            maxWidth: '100%',
          },
          '& .MuiButton-root': {
            flex: { xs: '1 1 160px', sm: '0 1 auto' },
            minWidth: 0,
            whiteSpace: 'nowrap',
          },
        }}
      >
        {children}
        {onReset && showReset && <Button onClick={onReset}>Reset</Button>}
      </Stack>
    </Paper>
  );
}
