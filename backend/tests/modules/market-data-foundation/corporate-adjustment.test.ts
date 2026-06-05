/// <reference types="@types/jest" />
import {
  computeAdjustedCloses,
  AdjustmentAction,
  RawBar,
  DISCONTINUITY_TYPES,
} from '../../../src/modules/market-data-foundation/market-data-foundation.corporate-adjustment';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a UTC-midnight Date from an ISO date string (YYYY-MM-DD). */
function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Build a RawBar. */
function bar(iso: string, close: number): RawBar {
  return { date: d(iso), close };
}

// Round to 6 decimal places (mirrors what the engine does internally).
function r6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

// ---------------------------------------------------------------------------
// Test 1: No actions → identity
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – no actions', () => {
  it('returns adjustedClose === close for every bar when there are no actions', () => {
    const bars: RawBar[] = [
      bar('2024-01-10', 100),
      bar('2024-01-11', 101),
      bar('2024-01-12', 102),
    ];

    const { bars: result, warnings } = computeAdjustedCloses(bars, []);

    expect(warnings).toHaveLength(0);
    expect(result).toHaveLength(3);
    result.forEach((b) => {
      expect(b.adjustedClose).toBe(b.close);
    });
  });
});

// ---------------------------------------------------------------------------
// Test 2: Single 1:1 bonus → bars before exDate are exactly halved
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – 1:1 bonus', () => {
  // A 1:1 bonus means R=2 (1 new share per 1 existing → 2 total).
  // Price factor = 1/2 = 0.5.
  // exDate: 2024-02-01
  // bars before exDate must be ×0.5; bars on/after must be unchanged.

  const actions: AdjustmentAction[] = [
    { type: 'bonus', exDate: d('2024-02-01'), ratio: 2 },
  ];

  const bars: RawBar[] = [
    bar('2024-01-29', 200), // before exDate → ×0.5 = 100
    bar('2024-01-30', 220), // before exDate → ×0.5 = 110
    bar('2024-01-31', 240), // before exDate → ×0.5 = 120  (the day before ex-date)
    bar('2024-02-01', 120), // ON exDate     → ×1   = 120  (reference, no adjustment)
    bar('2024-02-02', 122), // after exDate  → ×1   = 122
  ];

  it('halves all bars strictly before the ex-date', () => {
    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-01-29'].adjustedClose).toBe(100);
    expect(byDate['2024-01-30'].adjustedClose).toBe(110);
    expect(byDate['2024-01-31'].adjustedClose).toBe(120);
  });

  it('leaves bars on or after the ex-date unchanged', () => {
    const { bars: result } = computeAdjustedCloses(bars, actions);
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-02-01'].adjustedClose).toBe(120);
    expect(byDate['2024-02-02'].adjustedClose).toBe(122);
  });
});

// ---------------------------------------------------------------------------
// Test 3: Single 5:1 split → bars before exDate ×0.2
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – 5:1 split', () => {
  // R=5 → factor = 0.2
  const actions: AdjustmentAction[] = [
    { type: 'split', exDate: d('2024-03-15'), ratio: 5 },
  ];

  const bars: RawBar[] = [
    bar('2024-03-12', 1000),
    bar('2024-03-13', 1010),
    bar('2024-03-14', 1020), // last bar before exDate
    bar('2024-03-15', 204),  // ON exDate (reference)
    bar('2024-03-18', 206),
  ];

  it('scales bars before exDate by 0.2', () => {
    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-03-12'].adjustedClose).toBeCloseTo(200, 5);
    expect(byDate['2024-03-13'].adjustedClose).toBeCloseTo(202, 5);
    expect(byDate['2024-03-14'].adjustedClose).toBeCloseTo(204, 5);
  });

  it('leaves the ex-date bar and later bars unchanged', () => {
    const { bars: result } = computeAdjustedCloses(bars, actions);
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-03-15'].adjustedClose).toBe(204);
    expect(byDate['2024-03-18'].adjustedClose).toBe(206);
  });
});

// ---------------------------------------------------------------------------
// Test 4: 10:1 reverse split → bars before exDate ×10
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – 10:1 reverse split', () => {
  // 10:1 reverse split: 10 old shares → 1 new share.
  // R = newShares/oldShares = 1/10 = 0.1 → factor = 1/0.1 = 10.
  const actions: AdjustmentAction[] = [
    { type: 'reverse_split', exDate: d('2024-04-01'), ratio: 0.1 },
  ];

  const bars: RawBar[] = [
    bar('2024-03-28', 5),   // before exDate → ×10 = 50
    bar('2024-03-29', 4.8), // before exDate → ×10 = 48
    bar('2024-04-01', 48),  // ON exDate (reference)
    bar('2024-04-02', 49),
  ];

  it('scales bars before exDate by 10', () => {
    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-03-28'].adjustedClose).toBeCloseTo(50, 5);
    expect(byDate['2024-03-29'].adjustedClose).toBeCloseTo(48, 5);
  });

  it('leaves ex-date and later bars unchanged', () => {
    const { bars: result } = computeAdjustedCloses(bars, actions);
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-04-01'].adjustedClose).toBe(48);
    expect(byDate['2024-04-02'].adjustedClose).toBe(49);
  });
});

// ---------------------------------------------------------------------------
// Test 5: Single cash dividend
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – single cash dividend', () => {
  // exDate: 2024-05-10; dividend D = 5.
  // C_prev = close of the last bar STRICTLY BEFORE 2024-05-10.
  // bars: ..., 2024-05-08 @ 200, 2024-05-09 @ 202, 2024-05-10 @ 198 (ex-date, ref), 2024-05-13 @ 200.
  // C_prev = 202 (last bar before 2024-05-10).
  // factor = (202 - 5) / 202 = 197/202.

  const D = 5;
  const cPrev = 202;
  const expectedFactor = (cPrev - D) / cPrev; // ≈ 0.97524752...

  const actions: AdjustmentAction[] = [
    { type: 'dividend', exDate: d('2024-05-10'), amount: D },
  ];

  const bars: RawBar[] = [
    bar('2024-05-07', 198),
    bar('2024-05-08', 200),
    bar('2024-05-09', cPrev), // C_prev
    bar('2024-05-10', 198),  // ON exDate (reference)
    bar('2024-05-13', 200),
  ];

  it('scales bars before exDate by (C_prev - D) / C_prev', () => {
    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-05-07'].adjustedClose).toBeCloseTo(r6(198 * expectedFactor), 5);
    expect(byDate['2024-05-08'].adjustedClose).toBeCloseTo(r6(200 * expectedFactor), 5);
    expect(byDate['2024-05-09'].adjustedClose).toBeCloseTo(r6(cPrev * expectedFactor), 5);
  });

  it('leaves ex-date and later bars unchanged', () => {
    const { bars: result } = computeAdjustedCloses(bars, actions);
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-05-10'].adjustedClose).toBe(198);
    expect(byDate['2024-05-13'].adjustedClose).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Test 6: Combined split + later dividend – factors compound correctly
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – split then dividend (factors compound)', () => {
  //  Split:    exDate 2024-06-01, ratio=2 (1:1 bonus style split) → factor=0.5
  //  Dividend: exDate 2024-07-01, D=10, C_prev = close of last bar before 2024-07-01.
  //
  //  bars:
  //    2024-05-31 @ 200   – before split AND before dividend → factor = 0.5 × div_factor
  //    2024-06-01 @ 100   – ON split exDate, before dividend  → factor = 1   × div_factor
  //    2024-06-30 @ 105   – after split, before dividend      → factor = 1   × div_factor  (C_prev for dividend)
  //    2024-07-01 @ 96    – ON dividend exDate (reference)    → factor = 1
  //    2024-07-02 @ 97    – after dividend                    → factor = 1
  //
  //  C_prev for dividend = 105 (last bar strictly before 2024-07-01).
  //  div_factor = (105 - 10) / 105 = 95/105 ≈ 0.904762

  const D = 10;
  const cPrevDiv = 105;
  const divFactor = (cPrevDiv - D) / cPrevDiv;
  const splitFactor = 1 / 2;

  const actions: AdjustmentAction[] = [
    { type: 'split', exDate: d('2024-06-01'), ratio: 2 },
    { type: 'dividend', exDate: d('2024-07-01'), amount: D },
  ];

  // Supply actions in reverse order to also test sort-independence.
  const actionsReversed = [...actions].reverse();

  const bars: RawBar[] = [
    bar('2024-05-31', 200),
    bar('2024-06-01', 100),
    bar('2024-06-30', cPrevDiv),
    bar('2024-07-01', 96),
    bar('2024-07-02', 97),
  ];

  it('applies only the dividend factor to bars between split exDate and dividend exDate', () => {
    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    // ON split ex-date → not affected by split; affected by dividend.
    expect(byDate['2024-06-01'].adjustedClose).toBeCloseTo(r6(100 * divFactor), 5);
    // Between split and dividend ex-dates.
    expect(byDate['2024-06-30'].adjustedClose).toBeCloseTo(r6(cPrevDiv * divFactor), 5);
  });

  it('applies both split and dividend factors (compounded) to bars before split exDate', () => {
    const { bars: result } = computeAdjustedCloses(bars, actions);
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    // 2024-05-31 is before BOTH ex-dates → split factor × div factor
    expect(byDate['2024-05-31'].adjustedClose).toBeCloseTo(r6(200 * splitFactor * divFactor), 5);
  });

  it('leaves bars on/after the last ex-date unchanged', () => {
    const { bars: result } = computeAdjustedCloses(bars, actions);
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-07-01'].adjustedClose).toBe(96);
    expect(byDate['2024-07-02'].adjustedClose).toBe(97);
  });

  it('produces the same result regardless of action input order', () => {
    const { bars: r1 } = computeAdjustedCloses(bars, actions);
    const { bars: r2 } = computeAdjustedCloses(bars, actionsReversed);

    r1.forEach((b, i) => {
      expect(b.adjustedClose).toBeCloseTo(r2[i].adjustedClose, 6);
    });
  });
});

// ---------------------------------------------------------------------------
// Test 7: Most-recent bar (after all ex-dates) adjustedClose === close
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – reference invariant', () => {
  it('the most-recent bar always has adjustedClose === close regardless of actions', () => {
    const actions: AdjustmentAction[] = [
      { type: 'split', exDate: d('2024-01-10'), ratio: 3 },
      { type: 'bonus', exDate: d('2024-03-20'), ratio: 2 },
      { type: 'dividend', exDate: d('2024-05-01'), amount: 8 },
    ];

    const bars: RawBar[] = [
      bar('2024-01-01', 900),
      bar('2024-01-10', 300), // ON split exDate
      bar('2024-03-19', 200), // before bonus
      bar('2024-03-20', 100), // ON bonus exDate
      bar('2024-04-30', 102), // C_prev for dividend
      bar('2024-05-01', 95),  // ON dividend exDate
      bar('2024-06-01', 97),  // LATEST bar – this must be adjustedClose === close
    ];

    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const latest = result[result.length - 1];
    expect(latest.adjustedClose).toBe(latest.close);
    expect(latest.close).toBe(97);
  });
});

// ---------------------------------------------------------------------------
// Test 8: Continuity – no artificial jump across ex-date in adjusted series
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – adjusted-series continuity across ex-date (1:1 bonus)', () => {
  // A 1:1 bonus means the RAW price drops ~50% on the ex-date.
  // The ADJUSTED series must show the smooth economic return, not a -50% jump.
  //
  // Setup:
  //   2024-08-29 @ 200 (pre-bonus, before exDate)
  //   2024-08-30 @ 100 (ON bonus exDate, post-split raw price)
  //
  // Bonus exDate: 2024-08-30, ratio=2 → factor=0.5
  // adjustedClose for 2024-08-29 = 200 × 0.5 = 100
  // adjustedClose for 2024-08-30 = 100 × 1   = 100
  //
  // Day-over-day adjusted return = (100 - 100) / 100 = 0% → no jump.

  it('shows no artificial return jump across a 1:1 bonus ex-date in the adjusted series', () => {
    const actions: AdjustmentAction[] = [
      { type: 'bonus', exDate: d('2024-08-30'), ratio: 2 },
    ];

    const bars: RawBar[] = [
      bar('2024-08-29', 200), // before exDate
      bar('2024-08-30', 100), // ON exDate (reference)
    ];

    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    const adjPrev = byDate['2024-08-29'].adjustedClose;
    const adjEx   = byDate['2024-08-30'].adjustedClose;

    // Both should be 100.
    expect(adjPrev).toBeCloseTo(100, 5);
    expect(adjEx).toBeCloseTo(100, 5);

    // Day-over-day return in the adjusted series is 0% (no jump).
    const adjReturn = (adjEx - adjPrev) / adjPrev;
    expect(adjReturn).toBeCloseTo(0, 6);
  });

  it('shows no artificial return jump across a 5:1 split ex-date', () => {
    // RAW price drops 80% (1000 → 200).
    // Adjusted: 1000 × 0.2 = 200 → 200 × 1 = 200.  Return = 0%.
    const actions: AdjustmentAction[] = [
      { type: 'split', exDate: d('2024-09-15'), ratio: 5 },
    ];

    const bars: RawBar[] = [
      bar('2024-09-14', 1000),
      bar('2024-09-15', 200),
    ];

    const { bars: result } = computeAdjustedCloses(bars, actions);
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    const adjPrev = byDate['2024-09-14'].adjustedClose;
    const adjEx   = byDate['2024-09-15'].adjustedClose;

    expect(adjPrev).toBeCloseTo(200, 5);
    expect(adjEx).toBeCloseTo(200, 5);
    expect((adjEx - adjPrev) / adjPrev).toBeCloseTo(0, 6);
  });

  it('shows the true economic return across a dividend ex-date (not -D/C jump)', () => {
    // Without adjustment:  return from 2024-10-09 to 2024-10-10 appears to be
    // (190 - 200) / 200 = -5%  — mostly the dividend extraction, not a real loss.
    // With adjustment: bars before exDate are scaled by (200-10)/200 = 0.95.
    //   adj(2024-10-09) = 200 × 0.95 = 190
    //   adj(2024-10-10) = 190 × 1    = 190
    // Day-over-day adjusted return = 0%.

    const D = 10;
    const cPrev = 200; // close of 2024-10-09
    const expectedFactor = (cPrev - D) / cPrev; // 0.95

    const actions: AdjustmentAction[] = [
      { type: 'dividend', exDate: d('2024-10-10'), amount: D },
    ];

    const bars: RawBar[] = [
      bar('2024-10-09', cPrev),
      bar('2024-10-10', 190), // ex-dividend: reference
    ];

    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    const adjPrev = byDate['2024-10-09'].adjustedClose;
    const adjEx   = byDate['2024-10-10'].adjustedClose;

    expect(adjPrev).toBeCloseTo(r6(cPrev * expectedFactor), 5);  // 190
    expect(adjEx).toBe(190);
    expect((adjEx - adjPrev) / adjPrev).toBeCloseTo(0, 6);
  });
});

// ---------------------------------------------------------------------------
// Test 9a: Edge – dividend with no prior bar → skipped + warning
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – dividend with no prior bar', () => {
  it('skips the dividend factor and emits a warning when no bar precedes the ex-date', () => {
    const actions: AdjustmentAction[] = [
      { type: 'dividend', exDate: d('2024-11-01'), amount: 5 },
    ];

    // All bars are ON or AFTER the ex-date.
    const bars: RawBar[] = [
      bar('2024-11-01', 200),
      bar('2024-11-04', 202),
    ];

    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);

    // Warning must be emitted.
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0]).toMatch(/no prior bar/i);

    // Since factor is skipped, adjustedClose === close for all bars.
    result.forEach((b) => {
      expect(b.adjustedClose).toBe(b.close);
    });
  });
});

// ---------------------------------------------------------------------------
// Test 9b: Edge – empty bars
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – empty bars input', () => {
  it('returns empty bars and no warnings', () => {
    const actions: AdjustmentAction[] = [
      { type: 'split', exDate: d('2024-01-10'), ratio: 2 },
    ];

    const { bars: result, warnings } = computeAdjustedCloses([], actions);

    expect(result).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 9c: Edge – multiple actions on the same ex-date
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – multiple actions same ex-date', () => {
  // On 2024-12-01:
  //   • split: ratio=2 → factor=0.5
  //   • dividend: D=5, C_prev = close of 2024-11-30 = 200 → factor=(200-5)/200=0.975
  //   Combined factor = 0.5 × 0.975 = 0.4875
  // Bars before 2024-12-01 should be ×0.4875; bars on/after unchanged.

  const D = 5;
  const cPrev = 200;
  const splitFactor = 0.5;
  const divFactor = (cPrev - D) / cPrev; // 0.975
  const combined = splitFactor * divFactor; // 0.4875

  const actions: AdjustmentAction[] = [
    { type: 'split', exDate: d('2024-12-01'), ratio: 2 },
    { type: 'dividend', exDate: d('2024-12-01'), amount: D },
  ];

  const bars: RawBar[] = [
    bar('2024-11-29', 202),
    bar('2024-11-30', cPrev), // C_prev for dividend
    bar('2024-12-01', 98),    // ON exDate (reference)
    bar('2024-12-02', 99),
  ];

  it('multiplies all factors for the same ex-date together', () => {
    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-11-29'].adjustedClose).toBeCloseTo(r6(202 * combined), 5);
    expect(byDate['2024-11-30'].adjustedClose).toBeCloseTo(r6(cPrev * combined), 5);
  });

  it('leaves the ex-date bar and later bars at raw close', () => {
    const { bars: result } = computeAdjustedCloses(bars, actions);
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-12-01'].adjustedClose).toBe(98);
    expect(byDate['2024-12-02'].adjustedClose).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Test 9d: Edge – unsorted input actions (must be sorted internally)
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – unsorted input actions', () => {
  it('produces identical results whether actions are supplied sorted or not', () => {
    const sortedActions: AdjustmentAction[] = [
      { type: 'split',    exDate: d('2024-01-15'), ratio: 2 },
      { type: 'bonus',    exDate: d('2024-03-01'), ratio: 2 },
      { type: 'dividend', exDate: d('2024-05-01'), amount: 4 },
    ];

    const unsortedActions: AdjustmentAction[] = [
      { type: 'dividend', exDate: d('2024-05-01'), amount: 4 },
      { type: 'split',    exDate: d('2024-01-15'), ratio: 2 },
      { type: 'bonus',    exDate: d('2024-03-01'), ratio: 2 },
    ];

    const bars: RawBar[] = [
      bar('2024-01-01', 800),
      bar('2024-01-14', 820),
      bar('2024-01-15', 410), // ON split exDate
      bar('2024-02-28', 200), // before bonus
      bar('2024-03-01', 100), // ON bonus exDate
      bar('2024-04-30', 102), // C_prev for dividend
      bar('2024-05-01', 99),  // ON dividend exDate
      bar('2024-06-01', 101), // latest
    ];

    const { bars: r1, warnings: w1 } = computeAdjustedCloses(bars, sortedActions);
    const { bars: r2, warnings: w2 } = computeAdjustedCloses(bars, unsortedActions);

    expect(w1).toHaveLength(0);
    expect(w2).toHaveLength(0);

    r1.forEach((b, i) => {
      expect(b.adjustedClose).toBeCloseTo(r2[i].adjustedClose, 6);
    });
  });
});

// ---------------------------------------------------------------------------
// Test 9e: Edge – ex-date falls on a non-trading day (no bar on that date)
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – ex-date on non-trading day', () => {
  // Split exDate = Saturday 2024-02-10 (no bar on that date).
  // Bars: ..., 2024-02-09 (Fri) @ 400, 2024-02-12 (Mon) @ 200, ...
  // Both bars before and after — bars strictly BEFORE 2024-02-10 get scaled;
  // bars on or after 2024-02-10 do not.

  it('correctly attributes bars around a non-trading-day ex-date', () => {
    const actions: AdjustmentAction[] = [
      { type: 'split', exDate: d('2024-02-10'), ratio: 2 }, // Saturday
    ];

    const bars: RawBar[] = [
      bar('2024-02-08', 410),
      bar('2024-02-09', 400), // last trading day before non-trading ex-date
      bar('2024-02-12', 200), // first trading day on/after ex-date → factor=1
      bar('2024-02-13', 202),
    ];

    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-02-08'].adjustedClose).toBeCloseTo(205, 5);
    expect(byDate['2024-02-09'].adjustedClose).toBeCloseTo(200, 5);
    expect(byDate['2024-02-12'].adjustedClose).toBe(200);
    expect(byDate['2024-02-13'].adjustedClose).toBe(202);
  });
});

// ---------------------------------------------------------------------------
// Test 9f: Edge – dividend with D >= C_prev → skipped + warning
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – dividend >= prior close', () => {
  it('skips the dividend factor and warns when D >= C_prev', () => {
    const actions: AdjustmentAction[] = [
      { type: 'dividend', exDate: d('2024-03-05'), amount: 300 }, // D=300 >= C_prev=200
    ];

    const bars: RawBar[] = [
      bar('2024-03-04', 200), // C_prev
      bar('2024-03-05', 198),
    ];

    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);

    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0]).toMatch(/dividend.*prior close|≥ prior close/i);

    // Factor is skipped → adjustedClose === close for all bars.
    result.forEach((b) => {
      expect(b.adjustedClose).toBe(b.close);
    });
  });
});

// ---------------------------------------------------------------------------
// Test 9g: Edge – single bar with no actions (trivial sanity)
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – single bar', () => {
  it('returns the single bar with adjustedClose === close', () => {
    const { bars: result, warnings } = computeAdjustedCloses([bar('2024-01-01', 500)], []);

    expect(result).toHaveLength(1);
    expect(result[0].adjustedClose).toBe(500);
    expect(warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 9h: Edge – action with invalid ratio (zero / negative) → warning + skip
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – invalid ratio', () => {
  it('emits a warning and skips a split with ratio=0', () => {
    const actions: AdjustmentAction[] = [
      { type: 'split', exDate: d('2024-06-01'), ratio: 0 },
    ];

    const bars: RawBar[] = [
      bar('2024-05-31', 100),
      bar('2024-06-01', 100),
    ];

    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);

    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0]).toMatch(/invalid.*ratio/i);

    // Factor skipped → no change.
    result.forEach((b) => expect(b.adjustedClose).toBe(b.close));
  });
});

// ---------------------------------------------------------------------------
// Test 9i: Precision – chained factors don't drift beyond 6 decimal places
// ---------------------------------------------------------------------------
describe('computeAdjustedCloses – numeric precision with many chained actions', () => {
  it('keeps adjustedClose within 6 decimal places of the true value', () => {
    // 10 consecutive 2:1 splits over 10 years.
    // Total factor = (0.5)^10 = 1/1024.
    // If bar close = 1024, adjustedClose should be exactly 1.

    const actions: AdjustmentAction[] = Array.from({ length: 10 }, (_, i) => ({
      type: 'split' as const,
      exDate: new Date(Date.UTC(2015 + i, 0, 1)), // Jan 1 of each year 2015–2024
      ratio: 2,
    }));

    const bars: RawBar[] = [
      bar('2014-12-31', 1024), // before all splits
      bar('2025-01-01', 1),    // after all splits (reference)
    ];

    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2014-12-31'].adjustedClose).toBeCloseTo(1, 5);
    expect(byDate['2025-01-01'].adjustedClose).toBe(1); // reference unchanged
  });
});

// ---------------------------------------------------------------------------
// CB-15: Rights issue — TERP adjustment
// ---------------------------------------------------------------------------

describe('computeAdjustedCloses – CB-15 rights TERP adjustment', () => {
  /**
   * Setup:
   *   rights exDate: 2024-06-01
   *   rightsRatio   = 2/5 = 0.4   (2 rights shares per 5 existing)
   *   issuePrice    = 50           (subscription price per share)
   *   C_prev        = 200          (close of 2024-05-31, last bar before exDate)
   *
   * TERP = (200 + 50 × 0.4) / (1 + 0.4)
   *      = (200 + 20) / 1.4
   *      = 220 / 1.4
   *      ≈ 157.142857
   *
   * factor = 157.142857 / 200 ≈ 0.785714
   *
   * Bars BEFORE 2024-06-01 → × factor ≈ 0.7857
   * Bars ON/AFTER 2024-06-01 → × 1 (unchanged)
   */

  const rightsRatio = 2 / 5;
  const issuePrice = 50;
  const cPrev = 200;
  const terp = (cPrev + issuePrice * rightsRatio) / (1 + rightsRatio);
  const expectedFactor = terp / cPrev; // 220/280 ≈ 0.785714

  const actions: AdjustmentAction[] = [
    { type: 'rights', exDate: d('2024-06-01'), rightsRatio, issuePrice },
  ];

  const bars: RawBar[] = [
    bar('2024-05-29', 198),
    bar('2024-05-30', 199),
    bar('2024-05-31', cPrev), // C_prev
    bar('2024-06-01', 158),   // ex-rights bar (reference)
    bar('2024-06-02', 160),
  ];

  it('applies TERP factor to bars strictly before ex-date', () => {
    const { bars: result, warnings } = computeAdjustedCloses(bars, actions);
    expect(warnings).toHaveLength(0);

    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-05-29'].adjustedClose).toBeCloseTo(r6(198 * expectedFactor), 5);
    expect(byDate['2024-05-30'].adjustedClose).toBeCloseTo(r6(199 * expectedFactor), 5);
    expect(byDate['2024-05-31'].adjustedClose).toBeCloseTo(r6(cPrev * expectedFactor), 5);
  });

  it('leaves the ex-date bar and later bars unchanged', () => {
    const { bars: result } = computeAdjustedCloses(bars, actions);
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    expect(byDate['2024-06-01'].adjustedClose).toBe(158);
    expect(byDate['2024-06-02'].adjustedClose).toBe(160);
  });

  it('TERP factor is ≤1 when issuePrice < C_prev (rights always dilute)', () => {
    expect(expectedFactor).toBeGreaterThan(0);
    expect(expectedFactor).toBeLessThanOrEqual(1);
  });

  it('shows no artificial adjusted-close gap across the ex-date (TERP continuity)', () => {
    // adj(2024-05-31) = 200 × factor ≈ TERP = 157.14
    // adj(2024-06-01) = 158 (ex-rights, close approximately at TERP)
    // In a perfect market: adj(May-31) ≈ adj(Jun-01), proving the factor was correct.
    const { bars: result } = computeAdjustedCloses(bars, actions);
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));

    const adjPrev = byDate['2024-05-31'].adjustedClose;
    // adj(May-31) should equal TERP (up to rounding)
    expect(adjPrev).toBeCloseTo(terp, 3);
  });

  it('skips factor and warns when no prior bar exists', () => {
    const noPriorActions: AdjustmentAction[] = [
      { type: 'rights', exDate: d('2024-06-01'), rightsRatio, issuePrice },
    ];
    // All bars are on or after exDate
    const noPriorBars: RawBar[] = [bar('2024-06-01', 158), bar('2024-06-02', 160)];

    const { bars: result, warnings } = computeAdjustedCloses(noPriorBars, noPriorActions);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0]).toMatch(/no prior bar/i);
    result.forEach((b) => expect(b.adjustedClose).toBe(b.close));
  });

  it('skips factor and warns when issuePrice > C_prev (invalid input)', () => {
    const badActions: AdjustmentAction[] = [
      { type: 'rights', exDate: d('2024-06-01'), rightsRatio, issuePrice: 300 }, // 300 > 200
    ];
    const { bars: result, warnings } = computeAdjustedCloses(bars, badActions);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0]).toMatch(/issuePrice.*prior close|prior close/i);
    result.forEach((b) => expect(b.adjustedClose).toBe(b.close));
  });

  it('idempotency: running the same rights action twice produces the same output', () => {
    // Passing the same action twice would double-apply the factor IF NOT idempotent.
    // Our implementation accumulates by exDate, so two actions on the same date
    // multiply the factors — this is consistent with split+dividend same-date behavior.
    // The test confirms bars are stable when the function is called twice on the SAME input.
    const { bars: r1 } = computeAdjustedCloses(bars, actions);
    const { bars: r2 } = computeAdjustedCloses(bars, actions);
    r1.forEach((b, i) => {
      expect(b.adjustedClose).toBeCloseTo(r2[i].adjustedClose, 6);
    });
  });
});

// ---------------------------------------------------------------------------
// CB-16: Merger / demerger / spinoff / rights_unparseable — discontinuity flags
// ---------------------------------------------------------------------------

describe('computeAdjustedCloses – CB-16 structural-break events produce discontinuityFlags', () => {
  const barsArr: RawBar[] = [
    bar('2023-07-05', 1000),
    bar('2023-07-06', 980),
    bar('2023-07-10', 500), // post-demerger (structural break)
    bar('2023-07-11', 510),
  ];

  it('demerger: emits discontinuityFlag, no factor applied, bars unchanged', () => {
    const actions: AdjustmentAction[] = [
      { type: 'demerger', exDate: d('2023-07-10') },
    ];

    const { bars: result, warnings, discontinuityFlags } = computeAdjustedCloses(barsArr, actions);

    // No numeric adjustment applied
    result.forEach((b) => expect(b.adjustedClose).toBe(b.close));

    // Warning emitted
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(warnings[0]).toMatch(/DISCONTINUITY_FLAG/);

    // Structured flag populated
    expect(discontinuityFlags).toHaveLength(1);
    expect(discontinuityFlags[0].actionType).toBe('demerger');
    expect(discontinuityFlags[0].exDate).toEqual(d('2023-07-10'));
    expect(discontinuityFlags[0].message).toMatch(/demerger/i);
  });

  it('merger: emits discontinuityFlag, bars unchanged', () => {
    const actions: AdjustmentAction[] = [
      { type: 'merger', exDate: d('2023-07-10') },
    ];

    const { bars: result, discontinuityFlags } = computeAdjustedCloses(barsArr, actions);
    result.forEach((b) => expect(b.adjustedClose).toBe(b.close));
    expect(discontinuityFlags).toHaveLength(1);
    expect(discontinuityFlags[0].actionType).toBe('merger');
  });

  it('spinoff: emits discontinuityFlag, bars unchanged', () => {
    const actions: AdjustmentAction[] = [
      { type: 'spinoff', exDate: d('2023-07-10') },
    ];

    const { bars: result, discontinuityFlags } = computeAdjustedCloses(barsArr, actions);
    result.forEach((b) => expect(b.adjustedClose).toBe(b.close));
    expect(discontinuityFlags).toHaveLength(1);
    expect(discontinuityFlags[0].actionType).toBe('spinoff');
  });

  it('rights_unparseable: emits discontinuityFlag, bars unchanged', () => {
    const actions: AdjustmentAction[] = [
      { type: 'rights_unparseable', exDate: d('2023-07-10') },
    ];

    const { bars: result, discontinuityFlags } = computeAdjustedCloses(barsArr, actions);
    result.forEach((b) => expect(b.adjustedClose).toBe(b.close));
    expect(discontinuityFlags).toHaveLength(1);
    expect(discontinuityFlags[0].actionType).toBe('rights_unparseable');
  });

  it('multiple discontinuity events accumulate as separate flags', () => {
    const actions: AdjustmentAction[] = [
      { type: 'demerger', exDate: d('2023-07-06') },
      { type: 'merger',   exDate: d('2023-07-10') },
    ];

    const { discontinuityFlags } = computeAdjustedCloses(barsArr, actions);
    expect(discontinuityFlags).toHaveLength(2);
  });

  it('mix of valid action + discontinuity: split factor applied; demerger flagged only', () => {
    // Split on 2023-07-06 (ratio=2 → factor=0.5)
    // Demerger on 2023-07-10 (no factor)
    const actions: AdjustmentAction[] = [
      { type: 'split',   exDate: d('2023-07-06'), ratio: 2 },
      { type: 'demerger', exDate: d('2023-07-10') },
    ];

    const { bars: result, discontinuityFlags, warnings } = computeAdjustedCloses(barsArr, actions);

    // Discontinuity emitted for demerger
    expect(discontinuityFlags).toHaveLength(1);
    expect(discontinuityFlags[0].actionType).toBe('demerger');

    // Split factor applied to 2023-07-05 (strictly before 2023-07-06)
    const byDate = Object.fromEntries(result.map((b) => [b.date.toISOString().slice(0, 10), b]));
    expect(byDate['2023-07-05'].adjustedClose).toBeCloseTo(500, 5); // 1000 × 0.5
    // 2023-07-06 is ON split exDate → NOT affected by split; demerger has no factor
    expect(byDate['2023-07-06'].adjustedClose).toBe(980);
    // No split warning (only demerger discontinuity)
    const nonDiscontinuityWarnings = warnings.filter((w) => !w.includes('DISCONTINUITY_FLAG'));
    expect(nonDiscontinuityWarnings).toHaveLength(0);
  });

  it('empty-bars input returns empty discontinuityFlags', () => {
    const actions: AdjustmentAction[] = [
      { type: 'demerger', exDate: d('2023-07-10') },
    ];
    const { discontinuityFlags } = computeAdjustedCloses([], actions);
    expect(discontinuityFlags).toHaveLength(0);
  });

  it('DISCONTINUITY_TYPES set contains merger, demerger, spinoff, rights_unparseable', () => {
    expect(DISCONTINUITY_TYPES.has('merger')).toBe(true);
    expect(DISCONTINUITY_TYPES.has('demerger')).toBe(true);
    expect(DISCONTINUITY_TYPES.has('spinoff')).toBe(true);
    expect(DISCONTINUITY_TYPES.has('rights_unparseable')).toBe(true);
    expect(DISCONTINUITY_TYPES.has('split')).toBe(false);
    expect(DISCONTINUITY_TYPES.has('bonus')).toBe(false);
    expect(DISCONTINUITY_TYPES.has('dividend')).toBe(false);
  });
});
