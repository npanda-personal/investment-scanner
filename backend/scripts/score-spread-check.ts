/**
 * score-spread-check.ts
 *
 * Validates the v3 conviction-gradient scoring produces the expected spread.
 * Pure synthetic computation — no DB access.
 *
 * Run with:
 *   cd backend && npx ts-node --transpile-only scripts/score-spread-check.ts
 */

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
console.log('─'.repeat(100));
if (allPassed && monoPass && bearMonoPass) {
  console.log('ALL CHECKS PASSED');
} else {
  console.log('SOME CHECKS FAILED — review output above');
  process.exit(1);
}
console.log('─'.repeat(100));
console.log('');
