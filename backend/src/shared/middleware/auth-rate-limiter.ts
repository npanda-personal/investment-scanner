/**
 * Zero-dependency per-IP fixed-window rate limiter for auth endpoints.
 *
 * Limits are intentionally generous for a single-user personal tool.
 * Disabled entirely when NODE_ENV === 'test' so test suites are never locked out.
 *
 * Adjust the constants below as needed — no env vars required.
 */

import type { Request, Response, NextFunction } from 'express';

// ── Config ────────────────────────────────────────────────────────────────────

// Login: 10 attempts per 15-minute window per IP
const LOGIN_MAX = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// Signup: 5 attempts per 60-minute window per IP
const SIGNUP_MAX = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface WindowEntry {
  count: number;
  resetAt: number; // epoch ms
}

// ── Store ─────────────────────────────────────────────────────────────────────

const stores = {
  login: new Map<string, WindowEntry>(),
  signup: new Map<string, WindowEntry>(),
};

// Prune stale entries every hour to avoid unbounded Map growth in long-running
// processes (single-user tool — low traffic, just hygiene).
setInterval(() => {
  const now = Date.now();
  for (const store of Object.values(stores)) {
    for (const [ip, entry] of store) {
      if (entry.resetAt <= now) store.delete(ip);
    }
  }
}, 60 * 60 * 1000).unref();

// ── Core ──────────────────────────────────────────────────────────────────────

function getClientIp(req: Request): string {
  // Express 5 / typical proxy setups
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? '127.0.0.1';
}

function makeRateLimiter(
  store: Map<string, WindowEntry>,
  maxRequests: number,
  windowMs: number
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Disabled in test environment so test suites can call login/signup freely.
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }

    const ip = getClientIp(req);
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      // First request in a new window
      store.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSecs));
      res.status(429).json({ error: 'Too many attempts, please try again later.' });
      return;
    }

    next();
  };
}

// ── Exported middleware ───────────────────────────────────────────────────────

export const loginRateLimiter = makeRateLimiter(stores.login, LOGIN_MAX, LOGIN_WINDOW_MS);
export const signupRateLimiter = makeRateLimiter(stores.signup, SIGNUP_MAX, SIGNUP_WINDOW_MS);
