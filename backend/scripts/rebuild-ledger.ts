/**
 * ONE-TIME rebuild of the Signal Position Ledger's closed history under the fixed-horizon
 * lifecycle (owner decision 2026-07). Deletes the corrupt defensive-only closed
 * population and replays every historical entry per region, so the closed-trades card
 * measures a real held-to-horizon return instead of ~2-day first-flag exits.
 *
 * IRREVERSIBLE: each scope's rows are atomically replaced. Capture before-counts first
 * (see the plan's verification section).
 *
 * Run (worktree BE, one Prisma pool, guaranteed $disconnect + exit via runScript):
 *   cd backend
 *   $env:TS_NODE_TRANSPILE_ONLY='1'
 *   npx ts-node --transpile-only scripts/rebuild-ledger.ts            # IN, US, EU
 *   npx ts-node --transpile-only scripts/rebuild-ledger.ts IN         # single region
 */
import { SignalPositionLedgerService } from '../src/modules/signal-position-ledger';
import { runScript } from './_run-script';

const ALL_REGIONS = ['IN', 'US', 'EU'] as const;

async function main() {
  const requested = process.argv.slice(2).map((arg) => arg.trim().toUpperCase()).filter(Boolean);
  const regions = requested.length ? requested : [...ALL_REGIONS];
  const svc = new SignalPositionLedgerService();

  console.log(`Rebuilding Signal Position Ledger closed history for: ${regions.join(', ')}`);
  for (const region of regions) {
    const scope = { region, assetType: 'STOCK' };
    console.log(`\n=== ${region}/STOCK ===`);
    const t0 = Date.now();
    const r = await svc.recomputeClosedHistory(scope);
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  scanned:          ${r.scanned}`);
    console.log(`  shadowsDropped:   ${r.shadowsDropped}  (re-entries while a position was still open)`);
    console.log(`  bornDeadDropped:  ${r.bornDeadDropped}  (coincident-evidence intake guard)`);
    console.log(`  belowFloorDropped: ${r.belowFloorDropped}  (fails HIGH+score>90 entry floor / no signal)`);
    console.log(`  -- reclassified --`);
    console.log(`  closedHorizon:    ${r.closedHorizon}`);
    console.log(`  closedDefensive:  ${r.closedDefensive}`);
    console.log(`  invalidated:      ${r.invalidated}`);
    console.log(`  exitTriggered:    ${r.exitTriggered}  (defensive exit fired, close price pending)`);
    console.log(`  active:           ${r.active}  (held, horizon not yet reached)`);
    console.log(`  -- persistence --`);
    console.log(`  deleted:          ${r.deleted}`);
    console.log(`  inserted/kept:    ${r.inserted} / ${r.kept}`);
    console.log(`  (${secs}s)`);
  }
  console.log('\nRebuild complete.');
}

runScript(main);
