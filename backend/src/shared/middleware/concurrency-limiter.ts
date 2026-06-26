/**
 * In-flight concurrency limiter (backpressure) for the known-heavy data routes.
 *
 * Under many simultaneous page loads the slow endpoints pile up against the single Prisma pool
 * until `pool_timeout`, which is what crashed the backend during concurrent testing. This sheds
 * load with a fast 503 + Retry-After instead of letting a heavy-route storm hold connections
 * hostage and starve the many cheap/fast endpoints that share the same pool.
 *
 * Scope is deliberately narrow — it is attached ONLY to the confirmed-heavy GET routes, so a burst
 * of cheap requests is never throttled. Counter-based and process-local (single-node app), like the
 * sibling auth-rate-limiter: zero dependencies, no env vars, disabled under NODE_ENV==='test' so
 * suites are never tripped.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';

export interface InFlightLimiterOptions {
  /** Label surfaced in the 503 body / logs. */
  name: string;
  /** Max simultaneous in-flight requests across all routes sharing this limiter instance. */
  maxInFlight: number;
}

export const createInFlightLimiter = ({ name, maxInFlight }: InFlightLimiterOptions): RequestHandler => {
  let inFlight = 0;

  return (_req: Request, res: Response, next: NextFunction): void => {
    // Never throttle tests — they drive bursts of requests through these routes by design.
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }

    if (inFlight >= maxInFlight) {
      res.setHeader('Retry-After', '1');
      res.status(503).json({
        error: 'Server busy — too many concurrent heavy requests. Please retry shortly.',
        limiter: name,
      });
      return;
    }

    inFlight += 1;
    let released = false;
    const release = (): void => {
      if (released) return; // 'finish' and 'close' can both fire — decrement exactly once.
      released = true;
      inFlight -= 1;
    };
    res.on('finish', release);
    res.on('close', release);
    next();
  };
};

/**
 * Shared limiter for the heavy data endpoints (signal detail, smart-money sectors, earnings).
 * The cap leaves comfortable headroom in the connection_limit=20 backend pool for the many
 * cheap/fast endpoints, so they never queue behind a heavy-route storm.
 */
const HEAVY_ROUTE_MAX_IN_FLIGHT = 12;
export const heavyDataRouteLimiter = createInFlightLimiter({
  name: 'heavy-data-routes',
  maxInFlight: HEAVY_ROUTE_MAX_IN_FLIGHT,
});
