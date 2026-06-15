/**
 * Demo-mode access-code gate (GitHub Pages static build only).
 *
 * The static demo has no backend: main.tsx seeds a fake auth token and swaps the
 * axios adapter, so the real login/ProtectedRoute is effectively bypassed and the
 * whole app would otherwise be public to anyone with the URL. This component asks
 * for a shared access code before rendering anything, and remembers a correct
 * entry on the browser (localStorage) so it's a one-time front door.
 *
 * NOT real security. Everything here ships to the browser — a technical visitor
 * can read the bundled code, read demo-access.json, or set the localStorage key by
 * hand. The hash (vs. plaintext) only keeps the code out of casual view; the gate
 * deters casual access to the public demo, nothing more.
 *
 * Pure pass-through outside demo mode (VITE_DEMO !== '1'): normal dev/prod, which
 * keep their real login, render `children` immediately with no behavior change.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';

const STORAGE_KEY = 'investment_scanner_demo_unlocked';
const isDemo = import.meta.env.VITE_DEMO === '1';

interface AccessConfig {
  title?: string;
  hint?: string;
  hashes: string[];
}

/** SHA-256 hex of a string, via Web Crypto (secure context: HTTPS + localhost). */
async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

let configPromise: Promise<AccessConfig> | null = null;
function loadConfig(): Promise<AccessConfig> {
  if (!configPromise) {
    const base = import.meta.env.BASE_URL || '/';
    // Native fetch — the demo adapter only swaps axios.defaults.adapter, and this
    // file sits outside /api/, so nothing intercepts it.
    configPromise = fetch(`${base}demo-access.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`demo-access.json ${r.status}`);
        return r.json() as Promise<AccessConfig>;
      })
      .then((c) => ({ ...c, hashes: Array.isArray(c.hashes) ? c.hashes : [] }))
      .catch(() => {
        // Don't cache a transient failure — otherwise a flaky first-load fetch
        // would reject even the correct code until a full reload. Reset so the
        // next call (mount retry / "Try again") re-fetches.
        configPromise = null;
        return { hashes: [] } as AccessConfig;
      });
  }
  return configPromise;
}

export default function DemoAccessGate({ children }: { children: React.ReactNode }) {
  if (!isDemo) return <>{children}</>;
  return <Gate>{children}</Gate>;
}

function Gate({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AccessConfig | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Load config and check whether a previously-matched hash is still valid.
  // Storing the matched hash (not a flag) means rotating the code in the JSON
  // automatically forces re-entry. Reusable so the "Try again" button can re-run
  // it after a transient fetch failure.
  const load = useCallback((signal?: { active: boolean }) => {
    setConfig(null);
    loadConfig().then((c) => {
      if (signal && !signal.active) return;
      setConfig(c);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && c.hashes.includes(stored)) setUnlocked(true);
    });
  }, []);

  useEffect(() => {
    const signal = { active: true };
    load(signal);
    return () => {
      signal.active = false;
    };
  }, [load]);

  if (unlocked) return <>{children}</>;

  // Wait for config before showing the form (avoids a flash of the gate when the
  // browser is already unlocked).
  if (!config) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  // No usable codes (config failed to load or is misconfigured): show an explicit
  // unavailable state with retry, rather than a form that can never succeed.
  if (config.hashes.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
        <Paper sx={{ p: 3, width: '100%', maxWidth: 420 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            Demo unavailable
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            This preview couldn't load its access settings. Please check your connection and try again.
          </Typography>
          <Button variant="contained" onClick={() => load()}>
            Try again
          </Button>
        </Paper>
      </Box>
    );
  }

  const submit = async () => {
    setChecking(true);
    setError(null);
    try {
      const hash = await sha256Hex(code);
      if (config.hashes.includes(hash)) {
        localStorage.setItem(STORAGE_KEY, hash);
        setUnlocked(true);
      } else {
        setError('That code is not valid. Please check and try again.');
        setCode('');
      }
    } catch {
      setError('Could not verify the code in this browser. Try a recent browser over HTTPS.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper sx={{ p: 3, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          {config.title || 'Demo access'}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {config.hint || 'Enter the access code you were given to view this demo.'}
        </Typography>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2}>
          <TextField
            label="Access code"
            type="password"
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && code && !checking) void submit();
            }}
          />
          <Button variant="contained" disabled={checking || !code} onClick={() => void submit()}>
            {checking ? 'Checking...' : 'Enter'}
          </Button>
          <Typography variant="caption" color="text.secondary">
            This is a private preview. Access is remembered on this browser.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
