// Concurrency / scheduling leaf utilities extracted from MarketDataFoundationService.
// Free functions, no instance/repository state. The ingestion throttle state is process-wide;
// it lives here as module-level variables (equivalent to the prior static service fields).
import os from 'os';

export async function eachWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  }));
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunkSize = Math.max(1, size);
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function currentMemoryUtilizationPercent(): number {
  const total = os.totalmem();
  if (!total) return 0;
  return ((total - os.freemem()) / total) * 100;
}

// Process-wide ingestion throttle state (moved from MarketDataFoundationService statics).
let lastIngestionAt = 0;
let ingestionThrottleChain: Promise<void> = Promise.resolve();

export async function throttleIngestion(minDelayMs = 1000) {
  const throttle = async () => {
    const delayMs = Math.max(0, minDelayMs);
    const now = Date.now();
    const elapsed = now - lastIngestionAt;
    if (elapsed < delayMs) {
      await new Promise(resolve => setTimeout(resolve, delayMs - elapsed));
    }
    lastIngestionAt = Date.now();
  };
  const next = ingestionThrottleChain.then(throttle, throttle);
  ingestionThrottleChain = next.catch(() => undefined);
  await next;
}
