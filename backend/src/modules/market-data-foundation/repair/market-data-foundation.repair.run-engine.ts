// Auto-extracted repair sibling (Phase 5c). Bodies are byte-identical to the pre-extraction inline
// implementation in market-data-foundation.service.ts, except that stays-on-service / cross-engine
// collaborators are reached through the host (this.X -> this.host.X) and pure util/mapper helpers
// are imported directly. The service constructs this once and keeps byte-identical public delegators
// for the controller-facing repair surface.

import type { MarketDataRepairHost } from './market-data-foundation.repair-host';
import type {
  CatalogSource,
  MarketDataRepairPlan,
  MarketDataRepairRequest,
  MarketDataRepairRunAction,
  MarketDataRepairRunActionResult,
  MarketDataRepairRunRequest,
  MarketDataRepairRunResponse,
  MarketDataRepairSourceIdentity,
  MarketDataRepairSummary,
  MarketDataUniverseHealth,
} from '../market-data-foundation.types';
import type {
  CatalogIdentityRowsSnapshot,
  RepairRunSourceSnapshot,
} from './market-data-foundation.repair.types';
import {
  parseCsv as parseCsvUtil,
} from '../util/market-data-foundation.util.csv';
import {
  sha256 as sha256Util,
} from '../util/market-data-foundation.util.dates';
import {
  readPositiveNumber as readPositiveNumberUtil,
} from '../util/market-data-foundation.util.download';
import {
  normalizeCatalogSource as normalizeCatalogSourceUtil,
} from '../util/market-data-foundation.util.instrument-metadata';

export class RepairRunEngine {
  constructor(private readonly host: MarketDataRepairHost) {}

  public normalizeRepairRunActions(actions?: MarketDataRepairRunAction[], mode?: MarketDataRepairRunRequest['mode'], csvText?: string): MarketDataRepairRunAction[] {
    const defaultActions: MarketDataRepairRunAction[] = mode === 'DRAIN_UNTIL_BLOCKED'
      ? [
        'VALIDATE_PROVIDERS',
        'RETRY_FAILED_PROVIDERS',
        'CATALOG_IDENTITY_REPAIR',
        'PROVIDER_BUSINESS_METADATA_REPAIR',
        ...(csvText?.trim() ? ['MANUAL_METADATA_IMPORT' as MarketDataRepairRunAction] : []),
        'BACKFILL_PRICES',
      ]
      : [
        'VALIDATE_PROVIDERS',
        'CATALOG_IDENTITY_REPAIR',
        'PROVIDER_BUSINESS_METADATA_REPAIR',
        'BACKFILL_PRICES',
      ];
    const requested = new Set(actions?.length ? actions : defaultActions);
    const order: MarketDataRepairRunAction[] = [
      'VALIDATE_PROVIDERS',
      'RETRY_FAILED_PROVIDERS',
      'CATALOG_IDENTITY_REPAIR',
      'PROVIDER_BUSINESS_METADATA_REPAIR',
      'MANUAL_METADATA_IMPORT',
      'BACKFILL_PRICES',
    ];
    return order.filter((action) => requested.has(action));
  }


  public onlyManualMetadataRemains(plan: MarketDataRepairPlan): boolean {
    return plan.manualBusinessMetadataRequired > 0
      && plan.providerValidationNeeded + plan.retryFailedValidations === 0
      && (plan.supportedCatalogIdentityRepairNeeded ?? plan.catalogIdentityRepairNeeded) === 0
      && plan.businessMetadataAutoRepairable + plan.businessMetadataRetryEligible === 0
      && (plan.supportedPriceBackfillNeeded ?? plan.priceBackfillNeeded) === 0;
  }


  public repairRunActionLabel(action: MarketDataRepairRunAction): string {
    return {
      VALIDATE_PROVIDERS: 'Validate unknown providers',
      RETRY_FAILED_PROVIDERS: 'Retry failed providers',
      CATALOG_IDENTITY_REPAIR: 'Repair catalog identity',
      PROVIDER_BUSINESS_METADATA_REPAIR: 'Enrich provider business metadata',
      MANUAL_METADATA_IMPORT: 'Import manual metadata',
      BACKFILL_PRICES: 'Backfill prices',
    }[action];
  }


  public repairRunActionCount(action: MarketDataRepairRunAction, plan: MarketDataRepairPlan): number {
    if (action === 'VALIDATE_PROVIDERS') return plan.providerUnknownValidationNeeded ?? plan.providerValidationNeeded;
    if (action === 'RETRY_FAILED_PROVIDERS') return plan.providerRetryValidationNeeded ?? plan.retryFailedValidations;
    if (action === 'CATALOG_IDENTITY_REPAIR') return plan.supportedCatalogIdentityRepairNeeded ?? plan.catalogIdentityRepairNeeded;
    if (action === 'PROVIDER_BUSINESS_METADATA_REPAIR') return plan.businessMetadataAutoRepairable + plan.businessMetadataRetryEligible;
    if (action === 'MANUAL_METADATA_IMPORT') return plan.manualBusinessMetadataRequired ?? plan.manualMetadataRequired;
    if (action === 'BACKFILL_PRICES') return plan.supportedPriceBackfillNeeded ?? plan.priceBackfillNeeded;
    return 0;
  }


  public createRepairRunActionResult(
    action: MarketDataRepairRunAction,
    plan: MarketDataRepairPlan,
    batchSize: number,
    maxBatchesPerAction: number,
    dryRun: boolean
  ): MarketDataRepairRunActionResult {
    const estimatedTotal = this.repairRunActionCount(action, plan);
    const estimatedBatchCount = estimatedTotal > 0 ? Math.ceil(estimatedTotal / batchSize) : 0;
    return {
      action,
      label: this.repairRunActionLabel(action),
      estimatedTotal,
      estimatedBatchCount,
      batchesPlanned: Math.min(estimatedBatchCount, maxBatchesPerAction),
      batchesExecuted: 0,
      dryRun,
      hasMore: estimatedTotal > batchSize * maxBatchesPerAction,
      anotherRunNeeded: estimatedTotal > batchSize * maxBatchesPerAction,
      totals: {
        processedCount: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        noOp: 0,
        manualRequired: 0,
      },
      summaries: [],
      warnings: [],
    };
  }


  public async executeRepairRunAction(
    action: MarketDataRepairRunAction,
    request: MarketDataRepairRunRequest,
    scope: { region: string; assetType: string },
    batchSize: number,
    maxBatchesPerAction: number,
    result: MarketDataRepairRunActionResult,
    startOffset = 0,
    sourceSnapshot?: RepairRunSourceSnapshot
  ) {
    if (sourceSnapshot?.error) {
      throw new Error(sourceSnapshot.error);
    }

    if (result.estimatedTotal <= 0) {
      result.hasMore = false;
      result.anotherRunNeeded = false;
      return;
    }

    if (action === 'MANUAL_METADATA_IMPORT' && !request.csvText?.trim()) {
      result.warnings.push('Manual metadata import was not executed because CSV text was not supplied; manual-required rows remain visible.');
      result.anotherRunNeeded = result.estimatedTotal > 0;
      result.hasMore = result.estimatedTotal > 0;
      return;
    }

    let offset = this.isStableRepairRunSourceAction(action) ? startOffset : 0;
    let lastSummary: MarketDataRepairSummary | null = null;
    for (let index = 0; index < maxBatchesPerAction; index += 1) {
      const summary = await this.executeRepairRunBatch(action, request, scope, batchSize, offset, sourceSnapshot);
      if (result.sourceFingerprint && summary.sourceFingerprint && result.sourceFingerprint !== summary.sourceFingerprint) {
        throw new Error(`${this.repairRunActionLabel(action)} source fingerprint changed during the repair run.`);
      }
      result.batchesExecuted += 1;
      result.summaries.push(summary);
      if (summary.sourceFingerprint) result.sourceFingerprint = summary.sourceFingerprint;
      if (summary.sourceIdentity) result.sourceIdentity = summary.sourceIdentity;
      result.totals.processedCount += summary.processedCount;
      result.totals.updated += summary.updated;
      result.totals.skipped += summary.skipped;
      result.totals.failed += summary.failed;
      result.totals.noOp += summary.noOp || 0;
      result.totals.manualRequired += summary.manualRequired || 0;
      result.warnings.push(...(summary.warnings || []));
      lastSummary = summary;

      if (!summary.hasMore || summary.processedCount === 0) break;
      offset = summary.nextOffset ?? 0;
    }

    result.hasMore = Boolean(lastSummary?.hasMore);
    result.anotherRunNeeded = result.hasMore && result.batchesExecuted >= maxBatchesPerAction;
    if (result.anotherRunNeeded) {
      result.warnings.push(`${result.label} reached the per-run batch limit; another repair run is needed.`);
    }
  }


  private executeRepairRunBatch(
    action: MarketDataRepairRunAction,
    request: MarketDataRepairRunRequest,
    scope: { region: string; assetType: string },
    batchSize: number,
    offset: number,
    sourceSnapshot?: RepairRunSourceSnapshot
  ): Promise<MarketDataRepairSummary> {
    const base: MarketDataRepairRequest = {
      region: scope.region,
      assetType: scope.assetType,
      batchSize,
      offset,
    };
    if (action === 'VALIDATE_PROVIDERS') {
      return this.host.validateProviders({
        ...base,
        providerValidationQueue: 'UNKNOWN_FIRST',
      });
    }
    if (action === 'RETRY_FAILED_PROVIDERS') {
      return this.host.validateProviders({
        ...base,
        providerValidationQueue: 'RETRY_FAILED',
      });
    }
    if (action === 'CATALOG_IDENTITY_REPAIR') {
      if (!sourceSnapshot?.catalogSnapshot) {
        throw new Error('Catalog identity repair source was not loaded for this operational run.');
      }
      return this.host.repairCatalogIdentityFromRows({
        ...base,
        force: request.force,
      }, sourceSnapshot.catalogSnapshot, { actionableOnly: true });
    }
    if (action === 'PROVIDER_BUSINESS_METADATA_REPAIR') {
      return Promise.resolve(this.host.providerDisabledRepairSummary(
        base,
        'Provider business metadata repair is disabled for NSE/BSE-only market data. Import manual verified metadata instead.'
      ));
    }
    if (action === 'MANUAL_METADATA_IMPORT') {
      return this.host.importManualMetadata({
        ...base,
        csvText: request.csvText,
        importMode: 'MANUAL_CSV',
      });
    }
    return Promise.resolve(this.host.providerDisabledRepairSummary(
      base,
      'Provider price backfill is disabled for NSE/BSE-only market data. Use NSE/BSE exchange-file imports or historical exchange backfill instead.'
    ));
  }


  public async repairRunSourceFingerprints(
    request: MarketDataRepairRunRequest,
    scope: { region: string; assetType: string },
    actions: MarketDataRepairRunAction[]
  ): Promise<Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>>> {
    const fingerprints: Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>> = {};
    for (const action of actions) {
      if (action === 'CATALOG_IDENTITY_REPAIR') {
        try {
          const catalogSource = normalizeCatalogSourceUtil(request.catalogSource || this.defaultCatalogIdentitySource(scope));
          const catalog = await this.host.loadCatalogIdentityRows(catalogSource, request.csvText, request.importMode || 'CONFIGURED_URL');
          const catalogSnapshot: CatalogIdentityRowsSnapshot = {
            catalogSource,
            ...catalog,
          };
          fingerprints[action] = {
            fingerprint: catalog.sourceFingerprint,
            identity: catalog.sourceIdentity,
            catalogSnapshot,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Catalog source could not be loaded.';
          fingerprints[action] = {
            error: `Catalog identity repair source could not be loaded: ${message}`,
            warnings: [`Catalog identity repair source could not be loaded before processing; no catalog offsets were applied.`],
          };
        }
      }
      if (action === 'MANUAL_METADATA_IMPORT' && request.csvText?.trim()) {
        const rows = parseCsvUtil(request.csvText);
        const source = this.repairSourceIdentity({
          action,
          importMode: 'MANUAL_CSV',
          sourceKey: 'MANUAL_CSV',
          rawText: request.csvText,
          rows,
        });
        fingerprints[action] = source;
      }
    }
    return fingerprints;
  }



  public repairRunSourceFingerprintMetadata(
    sourceFingerprints: Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>>
  ) {
    return Object.fromEntries(Object.entries(sourceFingerprints).map(([action, source]) => [
      action,
      {
        fingerprint: source?.fingerprint,
        identity: source?.identity,
        error: source?.error,
        warnings: source?.warnings,
      },
    ]));
  }


  public async repairRunStartOffsets(
    scope: { region: string; assetType: string },
    actions: MarketDataRepairRunAction[],
    sourceFingerprints: Partial<Record<MarketDataRepairRunAction, RepairRunSourceSnapshot>>
  ): Promise<{
    offsets: Partial<Record<MarketDataRepairRunAction, number>>;
    warningsByAction: Partial<Record<MarketDataRepairRunAction, string[]>>;
  }> {
    const offsets: Partial<Record<MarketDataRepairRunAction, number>> = {};
    const warningsByAction: Partial<Record<MarketDataRepairRunAction, string[]>> = {};
    const repositoryAny = this.host.repository as any;
    if (typeof repositoryAny.latestRepairRun !== 'function') return { offsets, warningsByAction };
    const latest = await repositoryAny.latestRepairRun(scope);
    const previousActions = latest?.summaryJson?.actions;
    if (!Array.isArray(previousActions)) return { offsets, warningsByAction };
    for (const action of actions) {
      if (!this.isStableRepairRunSourceAction(action)) continue;
      const previous = previousActions.find((item: any) => item?.action === action);
      const lastSummary = Array.isArray(previous?.summaries) ? previous.summaries[previous.summaries.length - 1] : null;
      const currentSource = sourceFingerprints[action];
      if (currentSource?.error) {
        warningsByAction[action] = [`Source could not be loaded; no persisted offset was reused for ${this.repairRunActionLabel(action)}.`];
        offsets[action] = 0;
        continue;
      }
      const currentFingerprint = currentSource?.fingerprint;
      const previousFingerprint = previous?.sourceFingerprint || lastSummary?.sourceFingerprint;
      if (lastSummary?.hasMore && currentFingerprint && previousFingerprint && currentFingerprint !== previousFingerprint) {
        warningsByAction[action] = [`Source changed; restart from offset 0 for ${this.repairRunActionLabel(action)}.`];
        offsets[action] = 0;
        continue;
      }
      if (!previous?.error && lastSummary?.hasMore && Number.isFinite(Number(lastSummary.nextOffset))) {
        offsets[action] = Math.max(Number(lastSummary.nextOffset), 0);
      }
    }
    return { offsets, warningsByAction };
  }


  private isStableRepairRunSourceAction(action: MarketDataRepairRunAction): boolean {
    return action === 'CATALOG_IDENTITY_REPAIR' || action === 'MANUAL_METADATA_IMPORT';
  }


  public repairRunTotals(
    actions: MarketDataRepairRunActionResult[],
    actionsRequested: MarketDataRepairRunAction[]
  ): MarketDataRepairRunResponse['summary'] {
    return {
      actionsRequested,
      batchesExecuted: actions.reduce((sum, action) => sum + action.batchesExecuted, 0),
      updated: actions.reduce((sum, action) => sum + action.totals.updated, 0),
      skipped: actions.reduce((sum, action) => sum + action.totals.skipped, 0),
      failed: actions.reduce((sum, action) => sum + action.totals.failed, 0),
      noOp: actions.reduce((sum, action) => sum + action.totals.noOp, 0),
      manualRequired: actions.reduce((sum, action) => sum + action.totals.manualRequired, 0),
    };
  }


  public repairRunWarnings(
    health: MarketDataUniverseHealth,
    plan: MarketDataRepairPlan,
    actions: MarketDataRepairRunActionResult[],
    dryRun: boolean
  ): string[] {
    const warnings: string[] = [];
    if (dryRun) warnings.push('Dry run only: no provider, catalog, metadata, or price rows were mutated.');
    if (health.trustStatus !== 'OK') warnings.push(`Today Plan remains blocked because universe trust is ${health.trustStatus}.`);
    if (health.counts.reviewReady === 0) warnings.push('Today Plan remains blocked because review-ready universe is 0.');
    if (plan.providerValidationNeeded > 0) warnings.push(`${plan.providerValidationNeeded} unknown provider validations remain.`);
    if (plan.retryFailedValidations > 0) warnings.push(`${plan.retryFailedValidations} retry-failed provider validations remain.`);
    if ((plan.supportedCatalogIdentityRepairNeeded ?? plan.catalogIdentityRepairNeeded) > 0) warnings.push(`${plan.supportedCatalogIdentityRepairNeeded ?? plan.catalogIdentityRepairNeeded} provider-supported catalog identity repairs remain.`);
    if (plan.businessMetadataAutoRepairable > 0 || plan.businessMetadataRetryEligible > 0) {
      warnings.push(`${plan.businessMetadataAutoRepairable + plan.businessMetadataRetryEligible} provider business metadata rows remain auto-repairable or retry-eligible.`);
    }
    if (plan.manualBusinessMetadataRequired > 0) warnings.push(`${plan.manualBusinessMetadataRequired} rows still need manual business metadata if providers cannot fill them.`);
    if ((plan.supportedPriceBackfillNeeded ?? plan.priceBackfillNeeded) > 0) warnings.push(`${plan.supportedPriceBackfillNeeded ?? plan.priceBackfillNeeded} provider-supported rows still need price backfill.`);
    for (const action of actions) {
      if (action.error) warnings.push(`${action.label}: ${action.error}`);
      if (action.anotherRunNeeded) warnings.push(`${action.label}: another bounded run is needed.`);
    }
    return [...new Set(warnings)].slice(0, 50);
  }


  public expectedNextRepairRunAction(
    plan: MarketDataRepairPlan,
    actions: MarketDataRepairRunAction[]
  ): MarketDataRepairRunAction | null {
    return actions.find((action) => this.repairRunActionCount(action, plan) > 0) || null;
  }


  public hardBlockersFromHealth(health: MarketDataUniverseHealth): MarketDataUniverseHealth['topBlockers'] {
    return (health.topBlockers || []).filter((blocker) => blocker.severity === 'critical');
  }


  public jsonSnapshot<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }



  public repairScope(request: Pick<MarketDataRepairRequest, 'region' | 'assetType'>) {
    return {
      region: request.region?.trim().toUpperCase() || 'IN',
      assetType: request.assetType?.trim().toUpperCase() || 'STOCK',
    };
  }


  public mutatingRepairBatch(request: Pick<MarketDataRepairRequest, 'batchSize' | 'limit'>) {
    return {
      batchSize: Math.min(Math.max(Number(request.batchSize ?? request.limit) || 50, 1), 100),
      offset: 0,
    };
  }


  public providerBusinessMetadataRepairConcurrency(request: Pick<MarketDataRepairRequest, 'workerConcurrency'>) {
    return Math.max(1, Math.min(Number(request.workerConcurrency) || readPositiveNumberUtil(process.env.MARKET_DATA_PROVIDER_METADATA_REPAIR_CONCURRENCY, 4), 6));
  }


  public priceBackfillConcurrency(request: Pick<MarketDataRepairRequest, 'workerConcurrency'>) {
    return Math.max(1, Math.min(Number(request.workerConcurrency) || readPositiveNumberUtil(process.env.MARKET_DATA_PRICE_BACKFILL_CONCURRENCY, 2), 4));
  }


  public priceBackfillProviderThrottleMs() {
    const fallback = process.env.NODE_ENV === 'test' ? 0 : 1250;
    return Math.max(0, Math.min(readPositiveNumberUtil(process.env.MARKET_DATA_PRICE_BACKFILL_PROVIDER_THROTTLE_MS, fallback), 10_000));
  }


  public isYahooRateLimitError(message: string): boolean {
    return /too many requests|rate.?limit|\\b429\\b/i.test(message);
  }


  public isAngelOneTokenNotFoundError(message: string): boolean {
    return /angel one .*scrip master .*token .*not found|angel one scrip master did not contain/i.test(message);
  }


  public stableSourceRepairBatch(request: Pick<MarketDataRepairRequest, 'batchSize' | 'limit' | 'offset'>) {
    return {
      batchSize: Math.min(Math.max(Number(request.batchSize ?? request.limit) || 100, 1), 250),
      offset: Math.max(Number(request.offset) || 0, 0),
    };
  }


  public defaultCatalogIdentitySource(scope: { region: string; assetType: string }): CatalogSource {
    if (scope.region === 'IN' && scope.assetType === 'STOCK') return 'NSE_EQUITY_SECURITIES';
    return 'NSE_EQUITY_SECURITIES';
  }


  public repairSourceIdentity(input: {
    action: MarketDataRepairRunAction;
    catalogSource?: string;
    importMode?: string;
    sourceKey?: string;
    sourceUrl?: string | null;
    urlSource?: string | null;
    rawText: string;
    rows?: unknown[];
  }): { fingerprint: string; identity: MarketDataRepairSourceIdentity } {
    const contentSha256 = sha256Util(input.rawText);
    const rowsSha256 = sha256Util(JSON.stringify(input.rows || []));
    const identity: MarketDataRepairSourceIdentity = {
      action: input.action,
      catalogSource: input.catalogSource,
      importMode: input.importMode,
      sourceKey: input.sourceKey,
      sourceUrl: input.sourceUrl ?? null,
      urlSource: input.urlSource ?? null,
      rowCount: input.rows?.length ?? 0,
      contentSha256,
      rowsSha256,
    };
    return {
      identity,
      fingerprint: sha256Util(JSON.stringify(identity)),
    };
  }

  // Widened private->public for Phase 4b (IndiaExchangeIngestionHost collaborator).
}
