import type {
  StrategyDefinition,
  StrategyDefinitionDrift,
  StrategyDefinitionProviderResult,
  StrategyDefinitionProviderSource,
  StrategyDefinitionSource,
  StrategyListQuery,
} from './strategy-framework.types';
import { StrategyFrameworkRegistry } from './strategy-framework.registry';
import { checksumStrategyDefinition, StrategyFrameworkRepository } from './strategy-framework.repository';

export class StrategyFrameworkDefinitionProvider {
  constructor(
    private readonly repository = new StrategyFrameworkRepository(),
    private readonly registry = new StrategyFrameworkRegistry(),
  ) {}

  async list(query: StrategyListQuery = {}): Promise<StrategyDefinitionProviderResult> {
    const registryDefinitions = this.registry.list();
    const registryByCode = new Map(registryDefinitions.map((strategy) => [strategy.code, strategy]));
    let persistedDefinitions: StrategyDefinition[] = [];
    let persistenceReadFailed = false;
    let persistenceFailureReason: string | undefined;

    try {
      persistedDefinitions = await this.repository.listDefinitions({});
    } catch (error: any) {
      persistenceReadFailed = true;
      persistenceFailureReason = error?.message || 'Strategy definition persistence read failed.';
    }

    const latestPersisted = this.latestByCode(persistedDefinitions);
    const definitionsByCode = new Map<string, StrategyDefinition>();
    const drift: StrategyDefinitionDrift[] = [];
    let fallbackDefinitionsCount = 0;

    if (!persistenceReadFailed) {
      for (const persisted of latestPersisted) {
        const registryDefinition = registryByCode.get(persisted.code);
        const definitionDrift = this.driftForPersistedDefinition(persisted, registryDefinition);
        drift.push(...definitionDrift);
        definitionsByCode.set(
          persisted.code,
          this.withSource(this.withRegistryDisplayFallback(persisted, registryDefinition), 'PERSISTED', definitionDrift),
        );
      }
    }

    for (const registryDefinition of registryDefinitions) {
      if (definitionsByCode.has(registryDefinition.code)) continue;
      const definitionDrift = persistenceReadFailed
        ? [this.persistenceReadFailedDrift(registryDefinition, persistenceFailureReason)]
        : [this.missingPersistedDrift(registryDefinition)];
      drift.push(...definitionDrift);
      definitionsByCode.set(registryDefinition.code, this.withSource(registryDefinition, 'REGISTRY_FALLBACK', definitionDrift));
      fallbackDefinitionsCount += 1;
    }

    const allDefinitions = [...definitionsByCode.values()]
      .filter((strategy) => this.matches(strategy, query))
      .sort((left, right) => left.code.localeCompare(right.code));

    return {
      definitions: allDefinitions,
      source: this.sourceFor(persistenceReadFailed, latestPersisted.length, fallbackDefinitionsCount),
      drift,
      registryDefinitionsCount: registryDefinitions.length,
      persistedDefinitionsCount: latestPersisted.length,
      fallbackDefinitionsCount,
      persistenceReadFailed,
      persistenceFailureReason,
      warnings: this.warningsFor(drift, persistenceReadFailed),
    };
  }

  async get(code: string): Promise<{ definition: StrategyDefinition | null; diagnostics: StrategyDefinitionProviderResult }> {
    const normalizedCode = code.trim().toUpperCase();
    const diagnostics = await this.list({});
    return {
      definition: diagnostics.definitions.find((strategy) => strategy.code === normalizedCode) ?? null,
      diagnostics,
    };
  }

  private latestByCode(definitions: StrategyDefinition[]): StrategyDefinition[] {
    const byCode = new Map<string, StrategyDefinition>();
    for (const definition of definitions) {
      const current = byCode.get(definition.code);
      if (!current || this.definitionSortValue(definition) >= this.definitionSortValue(current)) {
        byCode.set(definition.code, definition);
      }
    }
    return [...byCode.values()];
  }

  private definitionSortValue(definition: StrategyDefinition): number {
    const effectiveAt = Date.parse(definition.effectiveAt || '');
    if (Number.isFinite(effectiveAt)) return effectiveAt;
    return 0;
  }

  private withRegistryDisplayFallback(persisted: StrategyDefinition, registryDefinition?: StrategyDefinition): StrategyDefinition {
    if (!registryDefinition) return persisted;
    return {
      ...persisted,
      explanationTemplate: persisted.explanationTemplate || registryDefinition.explanationTemplate,
      examples: {
        triggers: persisted.examples?.triggers?.length ? persisted.examples.triggers : registryDefinition.examples.triggers,
        blocks: persisted.examples?.blocks?.length ? persisted.examples.blocks : registryDefinition.examples.blocks,
      },
    };
  }

  private withSource(definition: StrategyDefinition, source: StrategyDefinitionSource, drift: StrategyDefinitionDrift[]): StrategyDefinition {
    return {
      ...definition,
      definitionSource: source,
      definitionDrift: drift,
    };
  }

  private driftForPersistedDefinition(persisted: StrategyDefinition, registryDefinition?: StrategyDefinition): StrategyDefinitionDrift[] {
    if (!registryDefinition) {
      return [{
        type: 'PERSISTED_DEFINITION_NOT_IN_REGISTRY',
        severity: 'WARN',
        strategyCode: persisted.code,
        persistedVersion: persisted.version,
        persistedChecksum: persisted.checksum,
        message: `Persisted strategy ${persisted.code} does not exist in the TypeScript registry. It can be listed, but evaluator support may be unavailable.`,
      }];
    }

    const registryChecksum = checksumStrategyDefinition(registryDefinition);
    const drifts: StrategyDefinitionDrift[] = [];
    if (persisted.version !== registryDefinition.version) {
      drifts.push({
        type: 'PERSISTED_VERSION_DIFFERS_FROM_REGISTRY',
        severity: 'WARN',
        strategyCode: persisted.code,
        persistedVersion: persisted.version,
        registryVersion: registryDefinition.version,
        persistedChecksum: persisted.checksum,
        registryChecksum,
        message: `Persisted strategy ${persisted.code} version ${persisted.version} differs from registry version ${registryDefinition.version}.`,
      });
    } else if (persisted.checksum && persisted.checksum !== registryChecksum) {
      drifts.push({
        type: 'CHECKSUM_MISMATCH',
        severity: 'WARN',
        strategyCode: persisted.code,
        persistedVersion: persisted.version,
        registryVersion: registryDefinition.version,
        persistedChecksum: persisted.checksum,
        registryChecksum,
        message: `Persisted strategy ${persisted.code} ${persisted.version} checksum differs from the registry snapshot.`,
      });
    }
    return drifts;
  }

  private missingPersistedDrift(strategy: StrategyDefinition): StrategyDefinitionDrift {
    return {
      type: 'MISSING_PERSISTED_DEFINITION',
      severity: 'INFO',
      strategyCode: strategy.code,
      registryVersion: strategy.version,
      registryChecksum: checksumStrategyDefinition(strategy),
      message: `Strategy ${strategy.code} is running from registry fallback because no persisted definition row is available.`,
    };
  }

  private persistenceReadFailedDrift(strategy: StrategyDefinition, reason?: string): StrategyDefinitionDrift {
    return {
      type: 'PERSISTENCE_READ_FAILED',
      severity: 'WARN',
      strategyCode: strategy.code,
      registryVersion: strategy.version,
      registryChecksum: checksumStrategyDefinition(strategy),
      message: `Strategy ${strategy.code} is running from registry fallback because persisted definitions could not be read.${reason ? ` ${reason}` : ''}`,
    };
  }

  private sourceFor(readFailed: boolean, persistedCount: number, fallbackCount: number): StrategyDefinitionProviderSource {
    if (readFailed || persistedCount === 0) return 'REGISTRY_FALLBACK';
    return fallbackCount > 0 ? 'MIXED' : 'PERSISTED';
  }

  private warningsFor(drift: StrategyDefinitionDrift[], persistenceReadFailed: boolean): string[] {
    const warnings = new Set<string>();
    if (persistenceReadFailed) warnings.add('Strategy Definition persistence is unavailable; registry fallback is active.');
    for (const item of drift) {
      if (item.severity !== 'INFO') warnings.add(item.message);
    }
    return [...warnings];
  }

  private matches(strategy: StrategyDefinition, query: StrategyListQuery) {
    if (query.status && strategy.status !== query.status) return false;
    if (query.category && strategy.category !== query.category) return false;
    if (query.style && strategy.style !== query.style) return false;
    if (query.region && !strategy.supportedRegions.includes(query.region) && !strategy.supportedRegions.includes('GLOBAL')) return false;
    if (query.assetType && !strategy.assetTypes.includes(query.assetType)) return false;
    return true;
  }
}
