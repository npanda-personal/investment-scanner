/**
 * snapshot-assembler.config.ts
 *
 * Injectable runtime configuration for the snapshot-assembler module.
 *
 * Everything here used to be a magic literal scattered across the service and
 * repository (smart-money lookback range, write batch size, version-conflict
 * retry budget).  Centralising them makes the assembler tunable per deployment
 * and per region without code edits, and gives a single seam for tests and for
 * future runtime injection (e.g. per-region overrides).
 */

/** A (region, assetType) pair the assembler is allowed to assemble for. */
export interface SnapshotScope {
  region: string;
  assetType: string;
}

export interface SnapshotAssemblerConfig {
  /**
   * Lookback range key used when reading smart_money_context_snapshots.
   * Was hardcoded '3M' in the repository.
   */
  smartMoneyRange: string;

  /** Batch size for createMany snapshot writes. */
  writeBatchSize: number;

  /**
   * Interactive-transaction timeout (ms) for commitAssembly. Prisma's default is
   * 5_000ms, which the large IN/STOCK batch (thousands of wide rows) blows past
   * (~7s observed), aborting the run and leaving the region's snapshots stale.
   * The version+rows+watermark write is deliberately one atomic transaction, so
   * the fix is to give that transaction enough headroom rather than split it.
   */
  commitTimeoutMs: number;

  /**
   * Max time (ms) commitAssembly waits to acquire a pooled connection before the
   * transaction starts (Prisma `maxWait`, default 2_000ms). Raised alongside
   * commitTimeoutMs so a momentarily busy pool under a full pipeline run does not
   * spuriously fail the commit before any work begins.
   */
  commitMaxWaitMs: number;

  /**
   * Max attempts to (re)compute snapshotVersion when a concurrent assembly run
   * races on the (instrumentId, tradingDate, snapshotVersion) unique key.
   * 1 = no retry.
   */
  maxCommitRetries: number;

  /**
   * Allowed scopes.  EMPTY = permissive (any region/assetType accepted) — this
   * is the default so existing behaviour is unchanged.  Populate it (e.g. with
   * KNOWN_SNAPSHOT_SCOPES) to make the assembler reject unknown scopes loudly
   * instead of silently producing zero rows.
   */
  supportedScopes: ReadonlyArray<SnapshotScope>;

  /**
   * When true, caller-supplied explicit instrumentIds are filtered down to those
   * whose Stock actually belongs to the requested (region, assetType); dropped
   * ids are reported as a warning.  Default false to preserve existing pipeline
   * behaviour (the DAG already passes correctly-scoped ids) — enable it for
   * external/API callers where a cross-region id list would otherwise be
   * mislabelled with a single region.
   */
  enforceExplicitIdScope: boolean;
}

/**
 * Reference list of scopes this product currently assembles for.  Exported for
 * callers that want strict validation; NOT applied by default (see
 * supportedScopes above) to avoid rejecting a freshly-added region before its
 * config is updated.
 */
export const KNOWN_SNAPSHOT_SCOPES: ReadonlyArray<SnapshotScope> = [
  { region: 'IN', assetType: 'STOCK' },
  { region: 'US', assetType: 'STOCK' },
  { region: 'CRYPTO', assetType: 'CRYPTO' },
];

export const DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG: SnapshotAssemblerConfig = {
  smartMoneyRange: '3M',
  writeBatchSize: 500,
  commitTimeoutMs: 120_000,
  commitMaxWaitMs: 15_000,
  maxCommitRetries: 3,
  supportedScopes: [], // permissive by default — see field doc
  enforceExplicitIdScope: false,
};

/** Merge a partial override onto the defaults. */
export function resolveSnapshotAssemblerConfig(
  partial?: Partial<SnapshotAssemblerConfig>,
): SnapshotAssemblerConfig {
  return { ...DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG, ...(partial ?? {}) };
}

/**
 * True when the scope is permitted.  An empty supportedScopes list is
 * permissive (always true) so the default config never blocks a valid run.
 */
export function isScopeSupported(
  config: SnapshotAssemblerConfig,
  region: string,
  assetType: string,
): boolean {
  if (config.supportedScopes.length === 0) return true;
  return config.supportedScopes.some(
    (s) => s.region === region && s.assetType === assetType,
  );
}
