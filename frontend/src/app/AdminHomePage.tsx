import { Box, Paper, Stack, Typography } from '@mui/material';

export default function AdminHomePage() {
  return (
    <Box sx={{ p: 3 }}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight={800}>Admin</Typography>
          <Typography color="text.secondary">
            Select an admin page from the navigation.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
