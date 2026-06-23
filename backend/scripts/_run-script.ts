import prisma from '../src/db/prisma';

/**
 * Standard entrypoint for one-shot backend scripts.
 *
 * WHY THIS EXISTS: a script that opens a Prisma client (directly or via any
 * service) holds a full connection pool. When the script's work finishes but it
 * never calls `$disconnect()` / `process.exit()`, Prisma's open pool keeps the
 * Node event loop alive, so the process HANGS FOREVER holding its connections.
 * Against the small Postgres `max_connections` ceiling, a few such zombie
 * processes exhaust the pool ("FATAL: sorry, too many clients already") and
 * starve the backend + pipeline. This wrapper makes that impossible: it always
 * disconnects and always exits.
 *
 * Usage:
 *   import { runScript } from './_run-script';
 *   runScript(async () => { ...your work... });
 */
export function runScript(main: () => Promise<void>): void {
  void (async () => {
    let exitCode = 0;
    try {
      await main();
    } catch (err) {
      console.error(err);
      exitCode = 1;
    } finally {
      try {
        await prisma.$disconnect();
      } catch {
        /* best-effort */
      }
    }
    // Force-exit so no lingering pool/timer can keep the process (and its
    // connections) alive. This is the guarantee the whole file exists for.
    process.exit(exitCode);
  })();
}
