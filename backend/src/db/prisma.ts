import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Pool-selection context. The Express request middleware (`src/app.ts`) runs each
 * HTTP request inside `poolContext.run('api', …)`, so user-facing queries draw from
 * the dedicated API pool. Anything with NO context — schedulers, timers, the
 * pipeline DAG, standalone scripts — falls through to the pipeline pool (the
 * `?? 'pipeline'` default below).
 *
 * This isolates the two workloads at the connection-pool level: a saturated
 * pipeline can no longer starve the API of connections. Previously a single
 * shared 20-connection pool made `pool_timeout` errors on user requests
 * inevitable whenever the daily pipeline ran.
 */
export const poolContext = new AsyncLocalStorage<'api' | 'pipeline'>();

const isTest = process.env.NODE_ENV === 'test';

/**
 * Derive a per-pool connection URL from DATABASE_URL: set this pool's
 * `connection_limit` and tag it with `application_name` (so the two pools are
 * distinguishable in `pg_stat_activity`), while preserving `pool_timeout`,
 * `schema`, `sslmode`, etc. verbatim.
 */
function deriveUrl(base: string, limit: number, appName: string): string {
  const url = new URL(base);
  url.searchParams.set('connection_limit', String(limit));
  url.searchParams.set('application_name', appName);
  return url.toString();
}

/**
 * Resolve a pool URL. Precedence: explicit full `*_DATABASE_URL` override >
 * `*_DB_CONNECTION_LIMIT` override (applied to DATABASE_URL) > the default limit.
 */
function poolUrl(
  fullOverride: string | undefined,
  limitOverride: string | undefined,
  fallbackLimit: number,
  appName: string,
): string {
  if (fullOverride) return fullOverride;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL is required');
  const limit = limitOverride ? Number(limitOverride) : fallbackLimit;
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error(`Invalid pool connection limit: ${String(limitOverride)}`);
  }
  return deriveUrl(base, limit, appName);
}

/**
 * In tests, collapse both pools to ONE client built from the unmodified
 * DATABASE_URL. This (a) preserves test-specific `connection_limit` pins — e.g.
 * the seeded integration test forces `connection_limit=1` before importing this
 * module — and (b) avoids double-instantiating clients across parallel jest
 * workers, which would exhaust Postgres ("too many clients already").
 */
const apiClient = new PrismaClient(
  isTest
    ? undefined
    : {
        datasourceUrl: poolUrl(
          process.env.API_DATABASE_URL,
          process.env.API_DB_CONNECTION_LIMIT,
          30,
          'scanner_api',
        ),
      },
);

const pipelineClient = isTest
  ? apiClient
  : new PrismaClient({
      datasourceUrl: poolUrl(
        process.env.PIPELINE_DATABASE_URL,
        process.env.PIPELINE_DB_CONNECTION_LIMIT,
        50,
        'scanner_pipeline',
      ),
    });

/**
 * The exported singleton is a Proxy that dispatches every access to whichever
 * client matches the current async context. Existing
 * `import prisma from '../db/prisma'` call sites are unchanged.
 *
 * `Reflect.get(client, prop, client)` + `.bind(client)` is REQUIRED: returning an
 * unbound method would invoke it with `this` = the Proxy, breaking `$transaction`
 * and tagged-template `$queryRaw` (they rely on the client's internal `this`).
 *
 * `$disconnect` is intercepted to fan out to BOTH pools — ~80 scripts, the
 * `_run-script` helper, and the MDF service all call `$disconnect()` through this
 * singleton and expect every connection released. (In test mode both names are the
 * same client; `allSettled` disconnects it idempotently.)
 */
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (prop === '$disconnect') {
      return async (): Promise<void> => {
        await Promise.allSettled([apiClient.$disconnect(), pipelineClient.$disconnect()]);
      };
    }
    const pool = poolContext.getStore() ?? 'pipeline';
    const client = pool === 'api' ? apiClient : pipelineClient;
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * Graceful shutdown — release BOTH connection pools when the process is asked to
 * stop. Without this, a SIGINT/SIGTERM (nodemon restart, Ctrl-C, container stop)
 * can leave pooled connections parked in Postgres until their TCP sockets time
 * out. Idempotent: only the first signal triggers the disconnect.
 *
 * NOTE: this does NOT rescue one-shot scripts that finish their work but never
 * exit (an open pool keeps the event loop alive, so 'beforeExit' never fires).
 * Scripts must use `runScript()` (backend/scripts/_run-script.ts), which
 * guarantees `$disconnect()` + `process.exit()`.
 */
let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await Promise.allSettled([apiClient.$disconnect(), pipelineClient.$disconnect()]);
  } finally {
    // Re-raise so the process actually terminates via the default handler.
    process.kill(process.pid, signal);
  }
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as NodeJS.Signals[]) {
  // once: after we re-raise above, a second identical signal hits the default handler.
  process.once(signal, () => {
    void shutdown(signal);
  });
}

export default prisma;
