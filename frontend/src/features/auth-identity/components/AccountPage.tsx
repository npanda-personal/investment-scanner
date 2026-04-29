import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useAuthIdentity } from '../hooks';

export default function AccountPage() {
  const { user, updateName, logout, error, setError } = useAuthIdentity();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateName(name);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Account</Typography>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography color="text.secondary">Signed in as {user?.email}</Typography>
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : 'Save profile'}</Button>
            <Button color="error" variant="outlined" onClick={() => void logout()}>Log out</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
