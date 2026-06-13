// Repair/remediation orchestration facade (Phase 5c). Owns the public controller-facing repair
// surface (repairRun / latestRepairRun / manualMetadataTemplate) and constructs the repair
// sub-engines. Bodies are byte-identical to the pre-extraction inline implementation in
// market-data-foundation.service.ts (this.X -> this.host.X for stays-on-service / cross-engine
// collaborators; pure util/mapper helpers imported directly). The service keeps thin byte-identical
// delegators that forward into this facade.

import type { MarketDataRepairHost } from './market-data-foundation.repair-host';
import type {
  PaginationOptions,
  MarketDataRepairRunStatus,
  MarketDataRepairRunRequest,
  MarketDataManualMetadataTemplate,
  MarketDataRepairRunActionResult,
  MarketDataRepairRunResponse,
  MarketDataRepairRunRecord,
} from '../market-data-foundation.types';
import {
  csvEscape as csvEscapeUtil,
} from '../util/market-data-foundation.util.csv';
import {
  hasValidMarketCap as hasValidMarketCapUtil,
} from '../util/market-data-foundation.util.instrument-metadata';
import { normalizeProviderStatus } from '../ingestion/market-data-foundation.universe';
import { RepairRunEngine } from './market-data-foundation.repair.run-engine';
import { RepairPriceBackfillService } from './market-data-foundation.repair.price-backfill';
import { RepairPriceBackfillRunEngine } from './market-data-foundation.repair.price-backfill-run';
import { RepairCatalogIdentityService } from './market-data-foundation.repair.catalog-identity';
import { RepairBusinessMetadataService } from './market-data-foundation.repair.business-metadata';
import { RepairMetadataEnrichmentService } from './market-data-foundation.repair.metadata-enrichment';
import { RepairFundamentalsImportService } from './market-data-foundation.repair.fundamentals-import';
import { RepairPriceIdentityService } from './market-data-foundation.repair.price-identity';

export class RepairService {
  // Repair sub-engines (each constructed once with the same host). RepairService exposes them so
  // the MarketDataFoundationService facade can delegate every public repair method to the owning
  // engine, while cross-engine calls still route through the host re-exposed delegators.
  readonly runEngine: RepairRunEngine;
  readonly priceBackfill: RepairPriceBackfillService;
  readonly priceBackfillRun: RepairPriceBackfillRunEngine;
  readonly catalogIdentity: RepairCatalogIdentityService;
  readonly businessMetadata: RepairBusinessMetadataService;
  readonly metadataEnrichment: RepairMetadataEnrichmentService;
  readonly fundamentalsImport: RepairFundamentalsImportService;
  readonly priceIdentity: RepairPriceIdentityService;

  constructor(private readonly host: MarketDataRepairHost) {
    this.runEngine = new RepairRunEngine(host);
    this.priceBackfill = new RepairPriceBackfillService(host);
    this.priceBackfillRun = new RepairPriceBackfillRunEngine(host);
    this.catalogIdentity = new RepairCatalogIdentityService(host);
    this.businessMetadata = new RepairBusinessMetadataService(host);
    this.metadataEnrichment = new RepairMetadataEnrichmentService(host);
    this.fundamentalsImport = new RepairFundamentalsImportService(host);
    this.priceIdentity = new RepairPriceIdentityService(host);
  }

  public async manualMetadataTemplate(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}): Promise<MarketDataManualMetadataTemplate> {
    const scope = {
      region: options.region?.trim().toUpperCase() || 'IN',
      assetType: options.assetType?.trim().toUpperCase() || 'STOCK',
    };
    const stocks = (await this.host.repository.listStocksForUniverseHealth(scope))
      .filter((stock) => stock.isActive !== false && stock.isDelisted !== true)
      .filter((stock) => normalizeProviderStatus(stock.providerSupportStatus) === 'SUPPORTED')
      .filter((stock) => this.host.needsBusinessMetadataRepair(stock));
    const rows = stocks.map((stock) => {
      const requiredFields = this.host.missingBusinessMetadataFields(stock);
      return {
        symbol: stock.symbol,
        providerSymbol: stock.providerSymbol || null,
        companyName: stock.name || null,
        exchange: stock.exchange || null,
        currentSector: stock.sector || null,
        currentIndustry: stock.industry || null,
        currentMarketCap: hasValidMarketCapUtil(stock.marketCap) ? Number(stock.marketCap) : null,
        requiredFields,
        suggestedSource: 'Manual curated exchange/company reference',
        notes: `Fill required business metadata: ${requiredFields.join(', ')}.`,
      };
    });
    const header = [
      'symbol',
      'providerSymbol',
      'companyName',
      'exchange',
      'currentSector',
      'currentIndustry',
      'currentMarketCap',
      'sector',
      'industry',
      'marketCap',
      'requiredFields',
      'suggestedSource',
      'notes',
    ];
    const csvRows = rows.map((row) => [
      row.symbol,
      row.providerSymbol || '',
      row.companyName || '',
      row.exchange || '',
      row.currentSector || '',
      row.currentIndustry || '',
      row.currentMarketCap ?? '',
      '',
      '',
      '',
      row.requiredFields.join('|'),
      row.suggestedSource,
      row.notes,
    ].map((value) => csvEscapeUtil(value)).join(','));
    return {
      scope,
      generatedAt: new Date().toISOString(),
      count: rows.length,
      rows,
      csvText: [header.join(','), ...csvRows].join('\n'),
    };
  }


  public async repairRun(request: MarketDataRepairRunRequest = {}): Promise<MarketDataRepairRunResponse> {
    const startedAt = new Date();
    const scope = this.host.repairScope(request);
    const batchSize = Math.min(Math.max(Number(request.batchSize ?? request.limit) || 50, 1), 100);
    const maxBatchesPerAction = Math.min(Math.max(Number(request.maxBatchesPerAction) || 5, 1), 100);
    const drainMode = request.mode === 'DRAIN_UNTIL_BLOCKED';
    const actions = this.host.normalizeRepairRunActions(request.actions, request.mode, request.csvText);
    const beforeSnapshot = await this.host.tryUniverseComputationSnapshot(scope);
    const beforeHealth = await this.host.universeHealth(scope, beforeSnapshot ?? undefined);
    const beforeRepairPlan = await this.host.repairPlan(scope, beforeSnapshot ?? undefined);
    const dryRun = Boolean(request.dryRun);
    const plannedActions = actions.map((action) => this.host.createRepairRunActionResult(
      action,
      beforeRepairPlan,
      batchSize,
      maxBatchesPerAction,
      dryRun
    ));

    if (dryRun) {
      const summary = this.host.repairRunTotals(plannedActions, actions);
      const warnings = this.host.repairRunWarnings(beforeHealth, beforeRepairPlan, plannedActions, true);
      const expectedNextAction = this.host.expectedNextRepairRunAction(beforeRepairPlan, actions);
      return {
        id: null,
        dryRun: true,
        scope,
        status: 'COMPLETED',
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        beforeHealth,
        afterHealth: beforeHealth,
        beforeRepairPlan,
        afterRepairPlan: beforeRepairPlan,
        actions: plannedActions,
        summary,
        warnings,
        anotherRunNeeded: plannedActions.some((action) => action.estimatedTotal > 0),
        hardBlockersRemaining: this.host.hardBlockersFromHealth(beforeHealth),
        expectedNextAction,
        afterTrustStatus: beforeHealth.trustStatus,
        universeSignoff: beforeHealth.universeSignoff,
        error: null,
      };
    }

    const repositoryAny = this.host.repository as any;
    const sourceFingerprints = await this.host.repairRunSourceFingerprints(request, scope, actions);
    const startState = await this.host.repairRunStartOffsets(scope, actions, sourceFingerprints);
    const sourceFingerprintMetadata = this.host.repairRunSourceFingerprintMetadata(sourceFingerprints);
    const runRecord = typeof repositoryAny.createRepairRun === 'function'
      ? await repositoryAny.createRepairRun({
        region: scope.region,
        assetType: scope.assetType,
        status: 'RUNNING' as MarketDataRepairRunStatus,
        beforeHealthJson: this.host.jsonSnapshot(beforeHealth),
        beforeRepairPlanJson: this.host.jsonSnapshot(beforeRepairPlan),
        actionsJson: this.host.jsonSnapshot({ actions, batchSize, maxBatchesPerAction, sourceFingerprints: sourceFingerprintMetadata }),
        warningsJson: [],
      })
      : null;

    const results: MarketDataRepairRunActionResult[] = [];
    const warnings: string[] = [];
    let error: string | null = null;
    let blockedStatus: MarketDataRepairRunStatus | null = null;
    let actionPlan = beforeRepairPlan;

    for (const action of actions) {
      const result = this.host.createRepairRunActionResult(action, actionPlan, batchSize, maxBatchesPerAction, false);
      const sourceFingerprint = sourceFingerprints[action];
      if (sourceFingerprint?.fingerprint) {
        result.sourceFingerprint = sourceFingerprint.fingerprint;
        result.sourceIdentity = sourceFingerprint.identity;
      }
      result.resumeOffset = startState.offsets[action] || 0;
      result.warnings.push(...(startState.warningsByAction[action] || []));
      result.warnings.push(...(sourceFingerprint?.warnings || []));
      results.push(result);
      if (drainMode && action === 'RETRY_FAILED_PROVIDERS' && (actionPlan.providerValidationNeeded ?? actionPlan.providerUnknownValidationNeeded ?? 0) > 0) {
        const message = 'Unknown provider validations remain; retry-failed providers are deferred until the UNKNOWN queue is drained.';
        result.hasMore = true;
        result.anotherRunNeeded = true;
        result.warnings.push(message);
        warnings.push(message);
        break;
      }
      try {
        const beforeActionCount = this.host.repairRunActionCount(action, actionPlan);
        await this.host.executeRepairRunAction(action, request, scope, batchSize, maxBatchesPerAction, result, result.resumeOffset || 0, sourceFingerprint);
        this.host.invalidateUniverseComputationSnapshot(scope);
        if (drainMode && beforeActionCount <= 0) {
          continue;
        }
        if (drainMode) {
          const afterActionPlan = await this.host.repairPlan(scope);
          const afterActionCount = this.host.repairRunActionCount(action, afterActionPlan);
          if (beforeActionCount > 0 && afterActionCount >= beforeActionCount && result.batchesExecuted > 0) {
            blockedStatus = 'PARTIAL_BLOCKED';
            const message = action === 'RETRY_FAILED_PROVIDERS'
              ? 'Retry failed provider validations did not reduce; manual/provider diagnosis required.'
              : `${result.label} did not reduce its queue; stopping drain before downstream actions.`;
            result.warnings.push(message);
            warnings.push(message);
            actionPlan = afterActionPlan;
            break;
          }
          actionPlan = afterActionPlan;
          if (result.hasMore || result.anotherRunNeeded) {
            warnings.push(`${result.label} still has more rows; another bounded drain run is needed before downstream actions.`);
            break;
          }
        }
      } catch (err) {
        error = err instanceof Error ? err.message : `${action} failed`;
        result.error = error;
        result.warnings.push(error);
        warnings.push(`${this.host.repairRunActionLabel(action)} failed: ${error}`);
        break;
      }
      warnings.push(...result.warnings);
    }

    this.host.invalidateUniverseComputationSnapshot(scope);
    const afterHealth = await this.host.universeHealth(scope);
    const afterRepairPlan = await this.host.repairPlan(scope);
    const completedAt = new Date();
    const summary = this.host.repairRunTotals(results, actions);
    const manualOnlyRemaining = drainMode && !request.csvText?.trim() && this.host.onlyManualMetadataRemains(afterRepairPlan);
    const expectedNextAction = this.host.expectedNextRepairRunAction(afterRepairPlan, actions)
      || afterRepairPlan.universeSignoff.nextAction
      || (manualOnlyRemaining && afterRepairPlan.universeSignoff.nextAction === 'MANUAL_METADATA_IMPORT'
        ? 'MANUAL_METADATA_IMPORT'
        : null);
    const hardBlockersRemaining = this.host.hardBlockersFromHealth(afterHealth);
    if (!blockedStatus && manualOnlyRemaining) {
      blockedStatus = 'PARTIAL_MANUAL_REQUIRED';
    }
    const anotherRunNeeded = error
      ? true
      : Boolean(blockedStatus)
        || results.some((action) => action.anotherRunNeeded || action.hasMore)
        || expectedNextAction !== null;
    const status: MarketDataRepairRunStatus = error
      ? 'PARTIAL'
      : blockedStatus
        ? blockedStatus
      : anotherRunNeeded
        ? 'PARTIAL'
        : 'COMPLETED';
    const runWarnings = [
      ...this.host.repairRunWarnings(afterHealth, afterRepairPlan, results, false),
      ...warnings,
    ].slice(0, 50);

    if (runRecord?.id && typeof repositoryAny.updateRepairRun === 'function') {
      await repositoryAny.updateRepairRun(runRecord.id, {
        status,
        completedAt,
        afterHealthJson: this.host.jsonSnapshot(afterHealth),
        afterRepairPlanJson: this.host.jsonSnapshot(afterRepairPlan),
        summaryJson: this.host.jsonSnapshot({
          actions: results,
          summary,
          anotherRunNeeded,
          expectedNextAction,
          hardBlockersRemaining,
          afterTrustStatus: afterHealth.trustStatus,
          universeSignoff: afterHealth.universeSignoff,
        }),
        warningsJson: this.host.jsonSnapshot(runWarnings),
        error,
      });
    }

    return {
      id: runRecord?.id ?? null,
      dryRun: false,
      scope,
      status,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      beforeHealth,
      afterHealth,
      beforeRepairPlan,
      afterRepairPlan,
      actions: results,
      summary,
      warnings: runWarnings,
      anotherRunNeeded,
      hardBlockersRemaining,
      expectedNextAction,
      afterTrustStatus: afterHealth.trustStatus,
      universeSignoff: afterHealth.universeSignoff,
      error,
    };
  }


  public async latestRepairRun(options: Pick<PaginationOptions, 'region' | 'assetType'> = {}): Promise<MarketDataRepairRunRecord | null> {
    const scope = this.host.repairScope(options);
    const repositoryAny = this.host.repository as any;
    if (typeof repositoryAny.latestRepairRun !== 'function') return null;
    const row = await repositoryAny.latestRepairRun(scope);
    if (!row) return null;
    const summaryJson = row.summaryJson || {};
    return {
      id: row.id,
      scope: {
        region: row.region,
        assetType: row.assetType || scope.assetType,
      },
      status: row.status as MarketDataRepairRunStatus,
      startedAt: row.startedAt instanceof Date ? row.startedAt.toISOString() : String(row.startedAt),
      completedAt: row.completedAt ? (row.completedAt instanceof Date ? row.completedAt.toISOString() : String(row.completedAt)) : null,
      beforeHealth: row.beforeHealthJson || null,
      afterHealth: row.afterHealthJson || null,
      beforeRepairPlan: row.beforeRepairPlanJson || null,
      afterRepairPlan: row.afterRepairPlanJson || null,
      actions: Array.isArray(summaryJson.actions) ? summaryJson.actions : [],
      summary: summaryJson.summary || null,
      warnings: Array.isArray(row.warningsJson) ? row.warningsJson : [],
      anotherRunNeeded: Boolean(summaryJson.anotherRunNeeded),
      hardBlockersRemaining: Array.isArray(summaryJson.hardBlockersRemaining) ? summaryJson.hardBlockersRemaining : [],
      expectedNextAction: summaryJson.expectedNextAction || null,
      afterTrustStatus: summaryJson.afterTrustStatus || row.afterHealthJson?.trustStatus || null,
      universeSignoff: summaryJson.universeSignoff || row.afterHealthJson?.universeSignoff || null,
      error: row.error || null,
    };
  }

}
