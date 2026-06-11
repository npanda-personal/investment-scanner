import { request, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Logs in ONCE per suite run via the API and persists the token as Playwright
 * storageState. Every test then starts already authenticated.
 *
 * Why: the backend rate-limits /auth/login to 10 attempts per 15 minutes per
 * IP. Per-test real logins lock the suite out after the 10th test — the
 * remaining specs fail on the 'Log out' visibility wait and the failures
 * masquerade as flakes.
 */
const AUTH_TOKEN_KEY = 'investment_scanner_auth_token';
export const STORAGE_STATE_PATH = path.join(moduleDir, '.auth-state.json');

export default async function globalSetup(config: FullConfig) {
  const baseURL = (config.projects[0]?.use?.baseURL as string) || 'http://localhost:5173';
  const backendURL = process.env.E2E_BACKEND_URL || 'http://localhost:3000';
  const email = process.env.E2E_EMAIL || 'test@example.com';
  const password = process.env.E2E_PASSWORD || 'TestUser123!';

  const api = await request.newContext();
  try {
    const response = await api.post(`${backendURL}/api/v1/auth/login`, {
      data: { email, password },
    });
    if (!response.ok()) {
      throw new Error(
        `global-setup login failed: HTTP ${response.status()} ${await response.text()} — ` +
          'if 429, the login rate limiter window (15 min) is still cooling down.',
      );
    }
    const body = (await response.json()) as { accessToken?: string };
    if (!body.accessToken) {
      throw new Error('global-setup login returned no accessToken');
    }

    const state = {
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL).origin,
          localStorage: [{ name: AUTH_TOKEN_KEY, value: body.accessToken }],
        },
      ],
    };
    fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify(state, null, 2));
  } finally {
    await api.dispose();
  }
}
