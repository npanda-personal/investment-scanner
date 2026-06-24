import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';

// isSignalEligible is a pure private helper (uses only its argument, not `this`),
// so we can exercise it off the prototype without constructing the heavy service.
const isSignalEligible: (quality: any) => boolean =
  (StrategyDecisionEngineService.prototype as any).isSignalEligible;

describe('StrategyDecisionEngineService.isSignalEligible', () => {
  it('reads the nested batch-row verdict (verdicts.signalEligible)', () => {
    expect(isSignalEligible({ verdicts: { signalEligible: true } })).toBe(true);
    expect(isSignalEligible({ verdicts: { signalEligible: false } })).toBe(false);
  });

  it('falls back to the legacy flat field when there is no verdicts object', () => {
    expect(isSignalEligible({ eligibleForSignals: true })).toBe(true);
    expect(isSignalEligible({ eligibleForSignals: false })).toBe(false);
  });

  it('returns false for absent / null quality (the regression that blanked the board)', () => {
    expect(isSignalEligible(null)).toBe(false);
    expect(isSignalEligible(undefined)).toBe(false);
    // a nested row used to be read via the flat field → always undefined → forced LOW
    expect(isSignalEligible({ verdicts: { signalEligible: true } })).not.toBe(undefined);
  });

  it('prefers the nested verdict even if a stray flat field is also present', () => {
    expect(isSignalEligible({ verdicts: { signalEligible: false }, eligibleForSignals: true })).toBe(false);
  });
});
