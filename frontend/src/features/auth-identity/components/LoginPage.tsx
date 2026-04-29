import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthIdentity } from '../hooks';

export default function LoginPage() {
  const { login, error, setError } = useAuthIdentity();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await login(email, password);
      navigate((location.state as any)?.from || '/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Log in</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Access your market analytics workspace.</Typography>
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button variant="contained" disabled={loading || !email || !password} onClick={() => void submit()}>
            {loading ? 'Logging in...' : 'Log in'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            New here? <Link to="/signup">Create an account</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
