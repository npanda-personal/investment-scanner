/**
 * score-spread-check.ts
 *
 * Validates the v3 conviction-gradient scoring produces the expected spread.
 * Pure synthetic computation — no DB access.
 *
 * Also validates the overextension / mean-reversion guards (v3 refinement):
 * a healthy uptrend must score MATERIALLY HIGHER than an over-extended name
 * that carries the same positive trend signals but also fires all three guards
 * (RSI overbought, extended above SMA50, parabolic run-up).
 *
 * Run with:
 *   cd backend && npx ts-node --transpile-only scripts/score-spread-check.ts
 */

import { runScript } from './_run-script';

// ── Inline the scoring constants (mirrors signal-generation-engine.service.ts) ──

const TECHNICAL_WEIGHT   = 0.4;
const MOMENTUM_WEIGHT    = 0.35;
const FUNDAMENTAL_WEIGHT = 0.25;

const CATEGORY_SCORE_ALPHA      = 1;
const SCORE_SPREAD_GAIN         = 1.8;
const EVIDENCE_SATURATION_COUNT = 7;
const EVIDENCE_AGREEMENT_WEIGHT = 0.45;
const EVIDENCE_COUNT_WEIGHT     = 0.55;
const EVIDENCE_MIXED_FLOOR      = 0.4;
const DIRECTION_BULLISH_THRESHOLD = 60;
const DIRECTION_BEARISH_THRESHOLD = 40;

// Overextension guard constants (mirrors service.ts)
const RSI_OVERBOUGHT          = 70;
const RSI_EXTREME_OVERBOUGHT  = 80;
const SMA50_STRETCH_PCT       = 0.15;
const PARABOLIC_RUNUP_PCT     = 0.20;

// ── Scoring functions ──────────────────────────────────────────────────────────

function categoryScore(positive: number, negative: number): number {
  const total = positive + negative;
  if (total === 0) return 0.5;
  return (positive + CATEGORY_SCORE_ALPHA * 0.5) / (total + CATEGORY_SCORE_ALPHA);
}

function compositeScore(
  technical: number, momentum: number, fundamentals: number,
  techPos = 0, techNeg = 0,
  momPos  = 0, momNeg  = 0,
  fundPos = 0, fundNeg = 0,
): number {
  const rawLean    = technical * TECHNICAL_WEIGHT + momentum * MOMENTUM_WEIGHT + fundamentals * FUNDAMENTAL_WEIGHT;
  const displacement = rawLean - 0.5;

  const bullish = displacement >= 0;
  const techAlign = bullish ? techPos : techNeg;
  const momAlign  = bullish ? momPos  : momNeg;
  const fundAlign = bullish ? fundPos : fundNeg;
  const totalAligning = techAlign + momAlign + fundAlign;

  const countComponent = 1 - Math.exp(-totalAligning / EVIDENCE_SATURATION_COUNT);

  const techLeans  = bullish ? technical    > 0.5 : technical    < 0.5;
  const momLeans   = bullish ? momentum     > 0.5 : momentum     < 0.5;
  const fundLeans  = bullish ? fundamentals > 0.5 : fundamentals < 0.5;
  const agreeing   = (techLeans ? 1 : 0) + (momLeans ? 1 : 0) + (fundLeans ? 1 : 0);
  const rawAgreement = agreeing / 3;
  const agreementFraction = rawAgreement < EVIDENCE_MIXED_FLOOR ? EVIDENCE_MIXED_FLOOR : rawAgreement;

  const evidenceFactor =
    EVIDENCE_COUNT_WEIGHT  * countComponent +
    EVIDENCE_AGREEMENT_WEIGHT * agreementFraction;

  const raw = 50 + displacement * 100 * SCORE_SPREAD_GAIN * evidenceFactor;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

function direction(score: number): string {
  if (score >= DIRECTION_BULLISH_THRESHOLD) return 'BULLISH';
  if (score <= DIRECTION_BEARISH_THRESHOLD) return 'BEARISH';
  return 'NEUTRAL';
}

// ── Test cases ────────────────────────────────────────────────────────────────

type Case = {
  label: string;
  techPos: number; techNeg: number;
  momPos: number;  momNeg: number;
  fundPos: number; fundNeg: number;
  expectMin?: number; expectMax?: number;
};

const cases: Case[] = [
  {
    label: 'maxed-bullish (tech 6/0, mom 5/0, fund 4/0)',
    techPos: 6, techNeg: 0, momPos: 5, momNeg: 0, fundPos: 4, fundNeg: 0,
    expectMin: 85, expectMax: 100,
  },
  {
    label: 'moderate-bullish (tech 2/0, mom 2/1, fund 1/0)',
    techPos: 2, techNeg: 0, momPos: 2, momNeg: 1, fundPos: 1, fundNeg: 0,
    expectMin: 60, expectMax: 85,
  },
  {
    label: 'thin-bullish (tech 1/0, mom 0/0, fund 0/0)',
    techPos: 1, techNeg: 0, momPos: 0, momNeg: 0, fundPos: 0, fundNeg: 0,
    expectMin: 50, expectMax: 58,
  },
  {
    label: 'mixed/conflict (tech 3/1, mom 0/3, fund 1/1)',
    techPos: 3, techNeg: 1, momPos: 0, momNeg: 3, fundPos: 1, fundNeg: 1,
    expectMin: 40, expectMax: 60,
  },
  {
    label: 'maxed-bearish (tech 0/6, mom 0/5, fund 0/4)',
    techPos: 0, techNeg: 6, momPos: 0, momNeg: 5, fundPos: 0, fundNeg: 4,
    expectMin: 0, expectMax: 15,
  },
  {
    label: 'empty (0/0 all categories)',
    techPos: 0, techNeg: 0, momPos: 0, momNeg: 0, fundPos: 0, fundNeg: 0,
    expectMin: 50, expectMax: 50,
  },
];

// ── Run ────────────────────────────────────────────────────────────────────────

runScript(async () => {

console.log('\n── v3 Conviction Gradient: Score Spread Check ────────────────────────────────');
console.log('');
console.log(
  'Case'.padEnd(48) +
  'techCS'.padEnd(8) + 'momCS'.padEnd(8) + 'fundCS'.padEnd(8) +
  'score'.padEnd(8) + 'dir'.padEnd(10) +
  'pass?'
);
console.log('─'.repeat(100));

let allPassed = true;

for (const c of cases) {
  const tech = categoryScore(c.techPos, c.techNeg);
  const mom  = categoryScore(c.momPos,  c.momNeg);
  const fund = categoryScore(c.fundPos, c.fundNeg);
  const score = compositeScore(
    tech, mom, fund,
    c.techPos, c.techNeg,
    c.momPos,  c.momNeg,
    c.fundPos, c.fundNeg,
  );
  const dir = direction(score);
  const pass = (c.expectMin === undefined || score >= c.expectMin) &&
               (c.expectMax === undefined || score <= c.expectMax);
  if (!pass) allPassed = false;

  const passStr = pass ? 'PASS' : `FAIL (expected ${c.expectMin ?? '*'}–${c.expectMax ?? '*'})`;
  console.log(
    c.label.padEnd(48) +
    tech.toFixed(3).padEnd(8) +
    mom.toFixed(3).padEnd(8) +
    fund.toFixed(3).padEnd(8) +
    String(score).padEnd(8) +
    dir.padEnd(10) +
    passStr
  );
}

console.log('─'.repeat(100));
console.log('');

// ── Extra: monotonicity check ─────────────────────────────────────────────────
console.log('── Monotonicity check (more aligned signals → further from 50) ──────────────');
console.log('');

const monoSteps = [
  { label: 'aligned × 1',  tp: 1, tn: 0, mp: 1, mn: 0, fp: 1, fn: 0 },
  { label: 'aligned × 3',  tp: 2, tn: 0, mp: 2, mn: 0, fp: 2, fn: 0 },
  { label: 'aligned × 6',  tp: 3, tn: 0, mp: 3, mn: 0, fp: 2, fn: 0 },
  { label: 'aligned × 10', tp: 4, tn: 0, mp: 4, mn: 0, fp: 4, fn: 0 },
  { label: 'maxed',        tp: 6, tn: 0, mp: 5, mn: 0, fp: 4, fn: 0 },
];

let prevScore = -1;
let monoPass = true;
for (const s of monoSteps) {
  const t = categoryScore(s.tp, s.tn);
  const m = categoryScore(s.mp, s.mn);
  const f = categoryScore(s.fp, s.fn);
  const sc = compositeScore(t, m, f, s.tp, s.tn, s.mp, s.mn, s.fp, s.fn);
  // non-decreasing (>= accounts for clamping at 100)
  const ok = sc >= prevScore;
  if (!ok) monoPass = false;
  const note = prevScore === -1 ? '' : sc === prevScore ? ' (clamped)' : '';
  console.log(`  ${s.label.padEnd(16)} score=${sc}  ${ok ? 'PASS' + note : 'FAIL (not monotonic)'}`);
  prevScore = sc;
}

console.log('');

// ── Extra: bearish monotonicity ────────────────────────────────────────────────
console.log('── Bearish monotonicity (more bearish → lower score) ────────────────────────');
console.log('');

const bearSteps = [
  { label: 'bearish × 1',  tp: 0, tn: 1, mp: 0, mn: 1, fp: 0, fn: 1 },
  { label: 'bearish × 3',  tp: 0, tn: 2, mp: 0, mn: 2, fp: 0, fn: 2 },
  { label: 'bearish × 6',  tp: 0, tn: 3, mp: 0, mn: 3, fp: 0, fn: 2 },
  { label: 'bearish × 10', tp: 0, tn: 4, mp: 0, mn: 4, fp: 0, fn: 4 },
  { label: 'maxed-bear',   tp: 0, tn: 6, mp: 0, mn: 5, fp: 0, fn: 4 },
];

let prevBear = 101;
let bearMonoPass = true;
for (const s of bearSteps) {
  const t = categoryScore(s.tp, s.tn);
  const m = categoryScore(s.mp, s.mn);
  const f = categoryScore(s.fp, s.fn);
  const sc = compositeScore(t, m, f, s.tp, s.tn, s.mp, s.mn, s.fp, s.fn);
  // non-increasing (<= accounts for clamping at 0)
  const ok = sc <= prevBear;
  if (!ok) bearMonoPass = false;
  const note = sc === prevBear ? ' (clamped)' : '';
  console.log(`  ${s.label.padEnd(16)} score=${sc}  ${ok ? 'PASS' + note : 'FAIL (not monotonic)'}`);
  prevBear = sc;
}

console.log('');
// ── Overextension Guard: Healthy vs Over-extended ─────────────────────────────
//
// Both setups share the same POSITIVE trend signals (price above SMA50, golden
// cross, near 52w high, 1M & 3M momentum positive, positive EPS) — so the
// *only* difference in score comes from the negative guard signals.
//
// Healthy uptrend (RSI ~57, price 5% above SMA50, 3% 10-day run):
//   Tech: +3 positive (SMA50, golden cross, near 52w high), 0 guard negatives
//   Mom:  +2 positive (1M, 3M momentum), 0 guard negatives
//   Fund: +1 positive (EPS)
//
// Over-extended (same positives PLUS):
//   Guard 1 (RSI >= 70): +1 TECHNICAL negative  (RSI_OVERBOUGHT)
//   Guard 2 (>15% above SMA50): +1 TECHNICAL negative (EXTENDED_ABOVE_SMA50)
//   Guard 3 (10-day run >= 20%): +1 MOMENTUM negative (PARABOLIC_RUNUP)

console.log('');
console.log('── Overextension Guard: Healthy vs Over-extended ────────────────────────────');
console.log('');
console.log('  Both have the same positive signals (SMA50 above, golden cross, near 52wH, 1M+3M momentum, EPS+).');
console.log('  Over-extended also fires: RSI_OVERBOUGHT (or RSI_EXTREME_OVERBOUGHT) + EXTENDED_ABOVE_SMA50 + PARABOLIC_RUNUP.');
console.log('');

// Healthy uptrend
const healthyTechPos = 3; const healthyTechNeg = 0;
const healthyMomPos  = 2; const healthyMomNeg  = 0;
const healthyFundPos = 1; const healthyFundNeg = 0;

const healthyTech  = categoryScore(healthyTechPos, healthyTechNeg);
const healthyMom   = categoryScore(healthyMomPos,  healthyMomNeg);
const healthyFund  = categoryScore(healthyFundPos, healthyFundNeg);
const healthyScore = compositeScore(
  healthyTech, healthyMom, healthyFund,
  healthyTechPos, healthyTechNeg,
  healthyMomPos,  healthyMomNeg,
  healthyFundPos, healthyFundNeg,
);

// Over-extended (RSI 78 → RSI_OVERBOUGHT fires; 25% above SMA50 → EXTENDED_ABOVE_SMA50; 30% 10d run → PARABOLIC_RUNUP)
// Guard 1: RSI 78 >= 70 → 1 TECHNICAL negative
// Guard 2: 25% > 15% → 1 TECHNICAL negative
// Guard 3: 30% > 20% → 1 MOMENTUM negative
const extTechPos = 3; const extTechNeg = 2;  // +2 from guard1(RSI_OVERBOUGHT) + guard2(EXTENDED_ABOVE_SMA50)
const extMomPos  = 2; const extMomNeg  = 1;  // +1 from guard3(PARABOLIC_RUNUP)
const extFundPos = 1; const extFundNeg = 0;

const extTech  = categoryScore(extTechPos, extTechNeg);
const extMom   = categoryScore(extMomPos,  extMomNeg);
const extFund  = categoryScore(extFundPos, extFundNeg);
const extScore = compositeScore(
  extTech, extMom, extFund,
  extTechPos, extTechNeg,
  extMomPos,  extMomNeg,
  extFundPos, extFundNeg,
);

// Over-extended (extreme: RSI 85 → RSI_EXTREME_OVERBOUGHT fires instead of RSI_OVERBOUGHT)
// Both RSI_OVERBOUGHT and RSI_EXTREME_OVERBOUGHT each push 1 negative (extreme fires both thresholds)
// Guard 1: RSI 85 >= 80 → RSI_EXTREME_OVERBOUGHT (1 TECHNICAL negative) — extreme branch fires instead of regular
// (The extreme check fires in place of the regular; implementation fires only one or the other based on threshold)
// For the purpose of scoring: extreme guard = same 1 extra negative (the extreme label, not stacked)
// So signal counts are identical; we show the same score but with a different label note.
const ext2TechPos = 3; const ext2TechNeg = 2;  // same count — extreme replaces regular
const ext2MomPos  = 2; const ext2MomNeg  = 1;
const ext2FundPos = 1; const ext2FundNeg = 0;

const ext2Tech  = categoryScore(ext2TechPos, ext2TechNeg);
const ext2Mom   = categoryScore(ext2MomPos,  ext2MomNeg);
const ext2Fund  = categoryScore(ext2FundPos, ext2FundNeg);
const ext2Score = compositeScore(
  ext2Tech, ext2Mom, ext2Fund,
  ext2TechPos, ext2TechNeg,
  ext2MomPos,  ext2MomNeg,
  ext2FundPos, ext2FundNeg,
);

console.log(`  Healthy uptrend    (RSI ~57, 5% above SMA50, 3% 10d):    techCS=${healthyTech.toFixed(3)}  momCS=${healthyMom.toFixed(3)}  fundCS=${healthyFund.toFixed(3)}  score=${healthyScore}  dir=${direction(healthyScore)}`);
console.log(`  Over-extended      (RSI 78,  25% above SMA50, 30% 10d):  techCS=${extTech.toFixed(3)}  momCS=${extMom.toFixed(3)}  fundCS=${extFund.toFixed(3)}  score=${extScore}  dir=${direction(extScore)}`);
console.log(`  Extreme-overbought (RSI 85,  25% above SMA50, 30% 10d):  techCS=${ext2Tech.toFixed(3)}  momCS=${ext2Mom.toFixed(3)}  fundCS=${ext2Fund.toFixed(3)}  score=${ext2Score}  dir=${direction(ext2Score)}`);
console.log('');

const scoreDiff = healthyScore - extScore;
const guardCheck = scoreDiff >= 5; // require at least 5 pts material demotion
const guardMsg = guardCheck
  ? `PASS — healthy scores ${scoreDiff} pts higher than over-extended (>= 5 pt material demotion required)`
  : `FAIL — healthy scores only ${scoreDiff} pts higher (< 5 pt threshold; guards may not be working)`;
console.log(`  Guard demotion check: ${guardMsg}`);
console.log('');

// Threshold visibility check
console.log('  Threshold constants in effect:');
console.log(`    RSI_OVERBOUGHT=${RSI_OVERBOUGHT}  RSI_EXTREME_OVERBOUGHT=${RSI_EXTREME_OVERBOUGHT}`);
console.log(`    SMA50_STRETCH_PCT=${(SMA50_STRETCH_PCT*100).toFixed(0)}%  PARABOLIC_RUNUP_PCT=${(PARABOLIC_RUNUP_PCT*100).toFixed(0)}%`);
console.log('');

console.log('─'.repeat(100));
if (allPassed && monoPass && bearMonoPass && guardCheck) {
  console.log('ALL CHECKS PASSED');
} else {
  console.log('SOME CHECKS FAILED — review output above');
  throw new Error('score-spread-check: one or more checks failed');
}
console.log('─'.repeat(100));
console.log('');

}); // runScript
