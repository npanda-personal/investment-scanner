/**
 * Demo-mode bootstrap (GitHub Pages static build only).
 *
 * The static demo has no backend. We seed the two pieces of client state the app
 * reads at startup so the trader UI renders without a live API:
 *   - the auth token, so AuthIdentityProvider calls fetchMe() (served from baked
 *     JSON by demoAdapter) instead of bouncing to /login;
 *   - the market scope, so the global interceptor and pages default to IN / STOCK.
 *
 * Only invoked when import.meta.env.VITE_DEMO === '1' (see main.tsx); a normal
 * `npm run dev` build never imports this side effect.
 */

const AUTH_TOKEN_KEY = 'investment_scanner_auth_token';
const MARKET_SCOPE_KEY = 'market_scope';

export function seedDemo(): void {
  try {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      localStorage.setItem(AUTH_TOKEN_KEY, 'demo');
    }
    if (!localStorage.getItem(MARKET_SCOPE_KEY)) {
      localStorage.setItem(
        MARKET_SCOPE_KEY,
        JSON.stringify({ region: 'IN', assetType: 'STOCK' }),
      );
    }
  } catch {
    /* localStorage unavailable — adapter still serves baked data, page may bounce to /login */
  }
}
