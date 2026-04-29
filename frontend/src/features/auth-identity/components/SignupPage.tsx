import { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthIdentity } from '../hooks';

export default function SignupPage() {
  const { signup, error, setError } = useAuthIdentity();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await signup(email, password, name);
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: 440 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Create account</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Start with a FREE plan and private workspace.</Typography>
        {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField label="Password" type="password" helperText="Minimum 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button variant="contained" disabled={loading || !email || password.length < 8} onClick={() => void submit()}>
            {loading ? 'Creating...' : 'Create account'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Already have an account? <Link to="/login">Log in</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
