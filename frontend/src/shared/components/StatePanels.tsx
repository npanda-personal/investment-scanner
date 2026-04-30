import { Alert, CircularProgress, Paper, Stack, Typography } from '@mui/material';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 6 }}>
      <CircularProgress size={28} />
      <Typography color="text.secondary">{message}</Typography>
    </Stack>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6">{title}</Typography>
      {message && <Typography color="text.secondary">{message}</Typography>}
    </Paper>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <Alert severity="error">{message}</Alert>;
}
