/**
 * snapshot-assembler.alerts-adapter.ts
 *
 * Adapts AlertsMonitoringService to the assembler's AlertsEvaluationPort.
 *
 * The assembler needs two things from alerts after a run: the list of enabled
 * rules (to fan out evaluation per distinct userId) and the evaluate() entry
 * point.  AlertsMonitoringService exposes evaluate() publicly but keeps the
 * rule list on a private repository, with no public accessor.
 *
 * Rather than scatter `(alertsService as any).repository.enabledRules()` through
 * the assembly flow, ALL of that structural access is contained here, in one
 * small, clearly-documented place.  The rest of the module depends only on the
 * typed AlertsEvaluationPort.  If/when AlertsMonitoringService grows a public
 * `enabledRules()` accessor, only this file changes.
 */

import { AlertsMonitoringService } from '../alerts-monitoring';
import type { AlertsEvaluationPort, EnabledAlertRule } from './snapshot-assembler.types';

/** Minimal structural shape we rely on from the alerts service internals. */
interface AlertsServiceInternals {
  evaluate(userId?: string): Promise<unknown>;
  repository?: {
    enabledRules?: () => Promise<Array<{ userId: string | null; region?: string | null }>>;
  };
}

export class AlertsMonitoringEvaluationAdapter implements AlertsEvaluationPort {
  private readonly internals: AlertsServiceInternals;

  constructor(service: AlertsMonitoringService = new AlertsMonitoringService()) {
    this.internals = service as unknown as AlertsServiceInternals;
  }

  evaluate(userId?: string): Promise<unknown> {
    return this.internals.evaluate(userId);
  }

  async listEnabledRules(): Promise<EnabledAlertRule[]> {
    const repo = this.internals.repository;
    if (!repo || typeof repo.enabledRules !== 'function') return [];
    const rules = await repo.enabledRules();
    return rules.map((r) => ({ userId: r.userId, region: r.region ?? null }));
  }
}
