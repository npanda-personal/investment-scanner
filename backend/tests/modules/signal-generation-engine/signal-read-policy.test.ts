/**
 * isTrustedReadSignal — the single predicate gating which persisted signals are served
 * to traders (research-tab single read + list/dashboard filters).
 *
 * Key behaviour (option (a), 2026-06-18): an ELIGIBLE signal is trusted whether its
 * readinessStatus is READY (>=75) or LIMITED. Eligibility independently enforces the
 * readinessScore >= 70 floor (LIMITED itself spans 50-74), so an eligible LIMITED signal
 * is in the 70-74 range; requiring READY-only was stricter than eligibility and silently
 * 404'd those eligible-but-LIMITED signals.
 */
import { isTrustedReadSignal } from '../../../src/modules/signal-generation-engine/signal-read-policy';

const candidate = (overrides: Partial<{
  auditStatus: 'CURRENT' | 'LEGACY_MISSING';
  filterApplied: boolean;
  eligible: boolean | null;
  signalReadinessStatus: string;
}> = {}) => ({
  auditStatus: overrides.auditStatus ?? 'CURRENT',
  dataQualityEligibility: {
    filterApplied: overrides.filterApplied ?? true,
    eligible: overrides.eligible ?? true,
    signalReadinessStatus: overrides.signalReadinessStatus ?? 'READY',
  },
});

describe('isTrustedReadSignal — eligible READY or LIMITED is trusted', () => {
  it('trusts an eligible READY signal', () => {
    expect(isTrustedReadSignal(candidate({ signalReadinessStatus: 'READY' }))).toBe(true);
  });

  it('trusts an eligible LIMITED signal (70-74 readiness band)', () => {
    // The regression this fixes: LIMITED was rejected, 404ing eligible signals.
    expect(isTrustedReadSignal(candidate({ signalReadinessStatus: 'LIMITED' }))).toBe(true);
  });

  it('does NOT trust an ineligible signal even if READY', () => {
    expect(isTrustedReadSignal(candidate({ eligible: false }))).toBe(false);
  });

  it('does NOT trust when the DQ filter was not applied', () => {
    expect(isTrustedReadSignal(candidate({ filterApplied: false }))).toBe(false);
  });

  it('does NOT trust a signal without CURRENT audit provenance', () => {
    expect(isTrustedReadSignal(candidate({ auditStatus: 'LEGACY_MISSING' }))).toBe(false);
  });

  it('does NOT trust when readiness status is absent (legacy sparse snapshot — needs regen)', () => {
    // Built explicitly: the candidate() helper would default a missing status to READY.
    expect(isTrustedReadSignal({
      auditStatus: 'CURRENT',
      dataQualityEligibility: { filterApplied: true, eligible: true },
    })).toBe(false);
  });

  it('does NOT trust an unexpected/lower readiness status (e.g. POOR)', () => {
    expect(isTrustedReadSignal(candidate({ signalReadinessStatus: 'POOR' }))).toBe(false);
  });

  it('does NOT trust when the DQ snapshot is missing entirely', () => {
    expect(isTrustedReadSignal({ auditStatus: 'CURRENT', dataQualityEligibility: null })).toBe(false);
  });
});
