import { MarketContextIntelligenceRepository } from './market-context-intelligence.repository';
import { MarketPulseSnapshotRepository } from './market-pulse-snapshot.repository';
import type { MarketContextSummary } from './market-context-intelligence.types';
import type { MarketPulseSnapshotRecord } from './market-pulse-snapshot.types';
import {
  BREADTH_VERY_WEAK_THRESHOLD,
  BREADTH_WEAK_THRESHOLD,
  EXPOSURE_BANDS,
  HEALTH_SCORE_FRAGILE_MAX,
  HEALTH_SCORE_STRONG_MIN,
  REGIME_SCORE_RISK_OFF_MAX,
  REGIME_SCORE_RISK_ON_MIN,
} from './capital-posture.types';
import type {
  CapitalPostureDto,
  CapitalPostureEvidence,
  PostureAction,
  PostureLabel,
  RegimeGateResult,
} from './capital-posture.types';

/**
 * CapitalPostureService
 *
 * HARD RULE: reads only already-persisted snapshots — never triggers a refresh.
 * The posture derivation is pure mapping logic on top of what is already in the DB.
 */
export class CapitalPostureService {
  constructor(
    private readonly contextRepo = new MarketContextIntelligenceRepository(),
    private readonly pulseRepo    = new MarketPulseSnapshotRepository(),
  ) {}

  // ─── Public read API ────────────────────────────────────────────────────

  /**
   * Derives capital posture from the latest PERSISTED snapshots.
   * Returns UNAVAILABLE if no snapshot exists — does NOT generate one.
   */
  async capitalPosture(region: string): Promise<CapitalPostureDto> {
    const normalizedRegion = this.normalizeRegion(region);

    // Read both persisted snapshots in parallel — zero side-effects
    const [contextSummary, pulseRecord] = await Promise.all([
      // market-context-intelligence.repository.ts line 36: latestPersistedSnapshot — pure DB read
      this.contextRepo.latestPersistedSnapshot(normalizedRegion),
      // market-pulse-snapshot.repository.ts line 24: latestSnapshot — pure DB read
      this.pulseRepo.latestSnapshot({
        region: normalizedRegion,
        assetType: 'STOCK',
        timeframe: '1d',
      }),
    ]);

    const evidence = this.buildEvidence(contextSummary, pulseRecord, normalizedRegion);

    if (!contextSummary && !pulseRecord) {
      return this.unavailablePosture(normalizedRegion, evidence, 'No persisted market-context or market-pulse snapshot is available for this scope.');
    }

    const postureLabel = this.derivePostureLabel(contextSummary, pulseRecord, evidence);
    const action       = this.deriveAction(postureLabel, evidence);
    const gate         = this.buildRegimeGate(postureLabel, evidence);

    return {
      availability: 'READY',
      scope: { region: normalizedRegion },
      postureLabel,
      suggestedExposureBand: EXPOSURE_BANDS[postureLabel],
      action,
      evidence,
      regimeGate: gate,
      assembledAt: new Date().toISOString(),
      message: this.assembleMessage(postureLabel, action, evidence),
    };
  }

  // ─── regimeGate (standalone helper) ────────────────────────────────────

  /**
   * Lightweight gate helper that downstream signal/strategy layers can call.
   * Returns null when no persisted snapshot is available.
   *
   * Signature:
   *   regimeGate(region: string): Promise<RegimeGateResult | null>
   *
   * longsDiscouraged  = true  when posture is RISK_OFF
   * contextualShortsOnly = true when posture is RISK_OFF or (NEUTRAL + weak breadth)
   */
  async regimeGate(region: string): Promise<RegimeGateResult | null> {
    const posture = await this.capitalPosture(region);
    return posture.regimeGate;
  }

  // ─── Posture derivation ─────────────────────────────────────────────────

  /**
   * Derives PostureLabel using a two-signal blend:
   *  1. Primary: regime + regimeScore from persisted MarketContextSnapshot.
   *  2. Secondary: marketHealthScore from persisted MarketPulseSnapshot.
   *  3. Breadth modifier: can downgrade RISK_ON → NEUTRAL or NEUTRAL → RISK_OFF.
   *
   * Falls back gracefully if one source is missing.
   */
  derivePostureLabel(
    ctx: MarketContextSummary | null,
    pulse: MarketPulseSnapshotRecord | null,
    evidence: CapitalPostureEvidence,
  ): PostureLabel {
    // Start from the persisted regime label (most authoritative single signal)
    let posture: PostureLabel = this.postureFromRegime(ctx);

    // Apply marketHealthScore as a secondary check
    if (pulse !== null) {
      const healthScore = Number(pulse.marketHealthScore);
      if (Number.isFinite(healthScore)) {
        posture = this.applyHealthScore(posture, healthScore);
      }
    }

    // Apply breadth modifier
    const pct50 = evidence.breadthAbove50Dma?.value ?? null;
    posture = this.applyBreadthModifier(posture, pct50);

    return posture;
  }

  /**
   * Maps regime enum + score → initial PostureLabel.
   * Uses the same scoring thresholds as MarketContextIntelligenceService.regimeFromScore.
   */
  postureFromRegime(ctx: MarketContextSummary | null): PostureLabel {
    if (!ctx) return 'NEUTRAL'; // no context → conservative default
    const regime = ctx.regime.regime;
    const score  = Number(ctx.regime.score);

    if (regime === 'RISK_ON' && score >= REGIME_SCORE_RISK_ON_MIN) return 'RISK_ON';
    if (regime === 'RISK_OFF' || score <= REGIME_SCORE_RISK_OFF_MAX) return 'RISK_OFF';
    return 'NEUTRAL';
  }

  /**
   * Downgrades posture when marketHealthScore disagrees significantly.
   * Only downgrades — never upgrades — to remain conservative.
   */
  applyHealthScore(posture: PostureLabel, healthScore: number): PostureLabel {
    // A RISKY health score (< 40) overrides even RISK_ON regime to RISK_OFF
    if (healthScore <= HEALTH_SCORE_FRAGILE_MAX) {
      return 'RISK_OFF';
    }
    // A healthy score (≥ 60) is fine; a fragile-range score (40–59) downgrades RISK_ON → NEUTRAL
    if (posture === 'RISK_ON' && healthScore < HEALTH_SCORE_STRONG_MIN) {
      return 'NEUTRAL';
    }
    return posture;
  }

  /**
   * Breadth modifier: weak participation can downgrade the posture by one step.
   * RISK_ON  → NEUTRAL  when breadth < BREADTH_WEAK_THRESHOLD (40 %)
   * NEUTRAL  → RISK_OFF when breadth < BREADTH_VERY_WEAK_THRESHOLD (25 %)
   */
  applyBreadthModifier(posture: PostureLabel, pct50: number | null): PostureLabel {
    if (pct50 === null) return posture; // no breadth data — do not punish
    if (posture === 'RISK_ON'  && pct50 < BREADTH_WEAK_THRESHOLD)      return 'NEUTRAL';
    if (posture === 'NEUTRAL'  && pct50 < BREADTH_VERY_WEAK_THRESHOLD) return 'RISK_OFF';
    return posture;
  }

  /**
   * Maps PostureLabel → PostureAction using research-support vocabulary.
   * STAY_OUT reserved for RISK_OFF with additional data-quality concerns.
   */
  deriveAction(posture: PostureLabel, evidence: CapitalPostureEvidence): PostureAction {
    if (posture === 'RISK_ON')  return 'DEPLOY';
    if (posture === 'NEUTRAL')  return 'HOLD';
    // RISK_OFF: if health data is entirely absent → STAY_OUT; otherwise RAISE_CASH
    if (evidence.marketHealthScore === null && evidence.regimeScore === null) return 'STAY_OUT';
    return 'RAISE_CASH';
  }

  // ─── RegimeGate builder ─────────────────────────────────────────────────

  buildRegimeGate(posture: PostureLabel, evidence: CapitalPostureEvidence): RegimeGateResult {
    const pct50 = evidence.breadthAbove50Dma?.value ?? null;
    const breadthWeak = pct50 !== null && pct50 < BREADTH_WEAK_THRESHOLD;

    const longsDiscouraged     = posture === 'RISK_OFF';
    const contextualShortsOnly = posture === 'RISK_OFF' || (posture === 'NEUTRAL' && breadthWeak);

    let note: string;
    if (posture === 'RISK_OFF') {
      note = 'Regime is RISK_OFF: new long entries are discouraged; short/hedge context is valid selectively.';
    } else if (contextualShortsOnly) {
      note = 'Regime is NEUTRAL with weak breadth: maintain existing longs, avoid new aggressive entries; short context is contextually valid.';
    } else if (posture === 'NEUTRAL') {
      note = 'Regime is NEUTRAL: selective deployment acceptable; no blanket short positioning.';
    } else {
      note = 'Regime is RISK_ON: broad deployment environment; shorts are contra-trend.';
    }

    return { longsDiscouraged, contextualShortsOnly, posture, breadthAbove50Pct: pct50, note };
  }

  // ─── Evidence builder ───────────────────────────────────────────────────

  buildEvidence(
    ctx: MarketContextSummary | null,
    pulse: MarketPulseSnapshotRecord | null,
    _region: string,
  ): CapitalPostureEvidence {
    const gaps: string[] = [];

    // Breadth from MarketPulseSnapshot (richer sample counts)
    let breadthAbove50Dma: CapitalPostureEvidence['breadthAbove50Dma']  = null;
    let breadthAbove200Dma: CapitalPostureEvidence['breadthAbove200Dma'] = null;

    if (pulse?.breadthSummaryJson) {
      const b = pulse.breadthSummaryJson as any;
      if (this.isFinite(b.percentAbove50Dma)) {
        breadthAbove50Dma = {
          value: b.percentAbove50Dma,
          sampleCount: Number(b.sma50SampleCount ?? 0),
          denominator: Number(b.sampleCount ?? b.sma50SampleCount ?? 0),
        };
      } else {
        gaps.push('Breadth above 50-DMA is unavailable from the persisted MarketPulseSnapshot.');
      }
      if (this.isFinite(b.percentAbove200Dma)) {
        breadthAbove200Dma = {
          value: b.percentAbove200Dma,
          sampleCount: Number(b.sma200SampleCount ?? 0),
          denominator: Number(b.sampleCount ?? b.sma200SampleCount ?? 0),
        };
      } else {
        gaps.push('Breadth above 200-DMA is unavailable from the persisted MarketPulseSnapshot.');
      }
    } else if (ctx?.breadth) {
      // Fall back to MarketContextSnapshot breadth (less detailed, no 50-DMA denominator)
      const b = ctx.breadth;
      if (this.isFinite(b.percentAboveSma50)) {
        breadthAbove50Dma = {
          value: b.percentAboveSma50!,
          sampleCount: b.sma50SampleCount ?? b.instrumentCount ?? 0,
          denominator: b.instrumentCount ?? b.sma50SampleCount ?? 0,
        };
      } else {
        gaps.push('Breadth above SMA50 is unavailable from the persisted MarketContextSnapshot.');
      }
      if (this.isFinite(b.percentAboveSma200)) {
        breadthAbove200Dma = {
          value: b.percentAboveSma200!,
          sampleCount: b.sma200SampleCount ?? b.instrumentCount ?? 0,
          denominator: b.instrumentCount ?? b.sma200SampleCount ?? 0,
        };
      } else {
        gaps.push('Breadth above SMA200 is unavailable from the persisted MarketContextSnapshot.');
      }
      gaps.push('Using MarketContextSnapshot breadth (coarser); MarketPulseSnapshot not available for this scope.');
    } else {
      gaps.push('No breadth data is available from any persisted snapshot for this scope.');
    }

    if (!ctx) gaps.push('MarketContextSnapshot is not available; regime posture defaults to NEUTRAL.');
    if (!pulse) gaps.push('MarketPulseSnapshot is not available; marketHealthScore cannot be used.');

    // Index trend from pulse
    const topIndices = pulse?.topIndicesJson ?? [];
    const topIndicesSummary = topIndices.length > 0
      ? topIndices.slice(0, 3).map((idx: any) => `${idx.symbol ?? idx.label ?? '?'} ${this.signedPct(idx.return1M)}`).join(', ')
      : null;
    if (!topIndicesSummary) gaps.push('Index trend summary unavailable from persisted MarketPulseSnapshot.');

    // Delivery from pulse
    const delivery = pulse?.deliverySummaryJson as any ?? null;

    // Derive context snapshot dates
    let contextSnapshotDate: string | null   = null;
    let contextDataThroughDate: string | null = null;
    if (ctx) {
      // MarketContextSnapshot stores snapshotDate — use updatedAt as proxy for "as of"
      const upd = ctx.updatedAt ?? ctx.regime?.updatedAt ?? null;
      contextSnapshotDate    = upd ? upd.slice(0, 10) : null;
      contextDataThroughDate = contextSnapshotDate; // no separate dataThroughDate in summary
    }

    return {
      regime:            ctx?.regime?.regime    ?? null,
      regimeScore:       ctx ? Number(ctx.regime.score) : null,
      marketHealthScore: pulse ? Number(pulse.marketHealthScore) : null,
      marketHealthLabel: pulse?.marketHealthLabel ?? null,
      breadthAbove50Dma,
      breadthAbove200Dma,
      indexTrend: {
        score:              pulse ? Number(pulse.indexTrendScore) : null,
        topIndicesSummary,
      },
      deliveryParticipation: {
        score:       pulse ? Number(pulse.deliveryParticipationScore) : null,
        summaryText: delivery?.summaryText ?? null,
      },
      contextSnapshotDate,
      contextDataThroughDate,
      pulseSnapshotDate:    pulse ? this.dateKey(pulse.snapshotDate)    : null,
      pulseDataThroughDate: pulse ? this.dateKey(pulse.dataThroughDate) : null,
      gaps,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private assembleMessage(posture: PostureLabel, action: PostureAction, evidence: CapitalPostureEvidence): string {
    const actionVerb: Record<PostureAction, string> = {
      DEPLOY:     'Environment supports deploying capital into high-conviction positions.',
      HOLD:       'Selective environment — hold existing positions and review new entries carefully.',
      RAISE_CASH: 'Regime signals caution — consider raising cash and reducing exposure.',
      STAY_OUT:   'Insufficient market evidence — stay out until conditions clarify.',
    };
    const breadthNote = evidence.breadthAbove50Dma?.value !== null && evidence.breadthAbove50Dma
      ? ` Breadth: ${this.fmtPct(evidence.breadthAbove50Dma.value)} above 50-DMA (${evidence.breadthAbove50Dma.sampleCount}/${evidence.breadthAbove50Dma.denominator} stocks).`
      : '';
    return `Posture ${posture}: ${actionVerb[action]}${breadthNote}`;
  }

  private unavailablePosture(
    region: string,
    evidence: CapitalPostureEvidence,
    reason: string,
  ): CapitalPostureDto {
    return {
      availability: 'UNAVAILABLE',
      scope: { region },
      postureLabel: null,
      suggestedExposureBand: null,
      action: null,
      evidence,
      regimeGate: null,
      assembledAt: new Date().toISOString(),
      message: reason,
    };
  }

  private normalizeRegion(region: string | undefined | null): string {
    const r = String(region || 'IN').trim().toUpperCase();
    return r || 'IN';
  }

  private isFinite(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private dateKey(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(String(value));
    if (!Number.isFinite(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  private signedPct(value: number | null | undefined): string {
    if (!this.isFinite(value as number)) return '(no data)';
    const pct = (value as number) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  }

  private fmtPct(value: number | null | undefined): string {
    if (!this.isFinite(value as number)) return 'N/A';
    return `${((value as number) * 100).toFixed(1)}%`;
  }
}
