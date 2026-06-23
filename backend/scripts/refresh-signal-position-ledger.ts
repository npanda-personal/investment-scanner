/**
 * Trigger a forced refresh of the Signal Position Ledger for IN/STOCK scope.
 * Run: npx ts-node --transpile-only scripts/refresh-signal-position-ledger.ts
 */
import { SignalPositionLedgerService } from '../src/modules/signal-position-ledger';
import { runScript } from './_run-script';

async function main() {
  const svc = new SignalPositionLedgerService();
  const query = { region: 'IN' as const, assetType: 'STOCK' as const, limit: 2000, offset: 0 };
  console.log('Starting forced ledger refresh...');
  const progress = await svc.refreshActiveRows(query, { force: true, wait: true });
  console.log('Status:', progress.status);
  console.log('totalCount:', progress.totalCount);
  console.log('processedCount:', progress.processedCount);
  console.log('succeededCount:', progress.succeededCount);
  console.log('skippedCount:', progress.skippedCount);
  console.log('failedCount:', progress.failedCount);
  console.log('materializedRowCount:', progress.materializedRowCount);
  if (progress.warnings.length) console.log('warnings:', progress.warnings);
  if (progress.errors.length) console.log('errors:', progress.errors);
}

runScript(main);
