/**
 * fit-region-calibration.ts
 *
 * Owner-run script: fits per-region calibration parameters from mature
 * signal_outcomes data and writes the artifact JSON to:
 *   backend/src/modules/signal-generation-engine/calibration/region-calibration.json
 *
 * Usage (from backend/):
 *   npx ts-node --transpile-only scripts/fit-region-calibration.ts
 *   npx ts-node --transpile-only scripts/fit-region-calibration.ts --horizon=20D
 *   npx ts-node --transpile-only scripts/fit-region-calibration.ts --modelVersion=signal-engine-v4.1
 *   npx ts-node --transpile-only scripts/fit-region-calibration.ts --dry-run
 *
 * Flags:
 *   --modelVersion=<string>  Signal model version to read outcomes for
 *                            (default: current SIGNAL_ENGINE_MODEL_VERSION_V4)
 *   --horizon=<string>       Outcome horizon (default: 20D)
 *   --dry-run                Print the artifact without writing to disk
 */

import * as fs from 'fs';
import * as path from 'path';
import prisma from '../src/db/prisma';
import { SignalCalibrationEngineRepository } from '../src/modules/signal-calibration-engine/signal-calibration-engine.repository';
import { RegionCalibrationFittingService } from '../src/modules/signal-calibration-engine/signal-calibration-engine.region-fitting.service';
import { SIGNAL_ENGINE_MODEL_VERSION_V4 } from '../src/modules/signal-generation-engine/signal-scoring.config';

const ARTIFACT_PATH = path.join(
  __dirname,
  '../src/modules/signal-generation-engine/calibration/region-calibration.json',
);

function parseArgs(argv: string[]) {
  const args = {
    modelVersion: SIGNAL_ENGINE_MODEL_VERSION_V4,
    horizon: '20D',
    dryRun: false,
  };
  for (const raw of argv.slice(2)) {
    if (raw.startsWith('--modelVersion=')) args.modelVersion = raw.split('=')[1];
    else if (raw.startsWith('--horizon=')) args.horizon = raw.split('=')[1];
    else if (raw === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`[fit-region-calibration] modelVersion=${args.modelVersion} horizon=${args.horizon} dry-run=${args.dryRun}`);

  const repository = new SignalCalibrationEngineRepository(prisma);
  const fittingService = new RegionCalibrationFittingService(repository);

  const generatedAt = new Date().toISOString();
  const { artifact, summary } = await fittingService.fit({
    generatedAt,
    modelVersion: args.modelVersion,
    horizon: args.horizon,
  });

  // Print cohort summary
  const fitted = summary.filter((s) => s.status === 'fitted');
  const skipped = summary.filter((s) => s.status === 'skipped');

  console.log(`\n[fit-region-calibration] Cohort summary:`);
  console.log(`  Fitted  (${fitted.length}):`);
  for (const s of fitted) {
    const c = artifact.cohorts[s.cohort];
    console.log(
      `    ${s.cohort.padEnd(20)} samples=${s.samples}  bullish=${c.directionThresholds.bullish}  bearish=${c.directionThresholds.bearish}  weights=t:${c.weights.technical},m:${c.weights.momentum},f:${c.weights.fundamental}  method=${c.method}`,
    );
  }
  console.log(`  Skipped (${skipped.length}):`);
  for (const s of skipped) {
    console.log(`    ${s.cohort.padEnd(20)} samples=${s.samples}  reason=${s.reason}`);
  }

  if (args.dryRun) {
    console.log('\n[fit-region-calibration] --dry-run: artifact NOT written.');
    console.log(JSON.stringify(artifact, null, 2));
    return;
  }

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(artifact, null, 2) + '\n', 'utf-8');
  console.log(`\n[fit-region-calibration] Artifact written to: ${ARTIFACT_PATH}`);
  console.log('[fit-region-calibration] Done.');
}

main()
  .catch((e) => {
    console.error('[fit-region-calibration] Fatal:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
