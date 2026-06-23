import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Graceful shutdown — release the connection pool when the process is asked to
 * stop. Without this, a SIGINT/SIGTERM (nodemon restart, Ctrl-C, container stop)
 * can leave the 10-connection pool parked in Postgres until the TCP sockets time
 * out, which — against the small `max_connections` ceiling — starves every other
 * client. Idempotent: only the first signal triggers the disconnect.
 *
 * NOTE: this does NOT rescue one-shot scripts that finish their work but never
 * exit (Prisma's open pool keeps the event loop alive, so 'beforeExit' never
 * fires). Scripts must use `runScript()` (backend/scripts/_run-script.ts), which
 * guarantees `$disconnect()` + `process.exit()`.
 */
let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    await prisma.$disconnect();
  } catch {
    /* best-effort */
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
