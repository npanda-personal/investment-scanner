/**
 * snapshot-assembler.config.test.ts
 *
 * Unit tests for the injectable config helpers (B2/B3).
 */

import {
  DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG,
  KNOWN_SNAPSHOT_SCOPES,
  isScopeSupported,
  resolveSnapshotAssemblerConfig,
} from '../../../src/modules/snapshot-assembler/snapshot-assembler.config';

describe('resolveSnapshotAssemblerConfig', () => {
  it('returns defaults when no override is given', () => {
    expect(resolveSnapshotAssemblerConfig()).toEqual(DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG);
  });

  it('merges a partial override onto defaults', () => {
    const cfg = resolveSnapshotAssemblerConfig({ smartMoneyRange: '6M', writeBatchSize: 1000 });
    expect(cfg.smartMoneyRange).toBe('6M');
    expect(cfg.writeBatchSize).toBe(1000);
    // untouched fields keep defaults
    expect(cfg.maxCommitRetries).toBe(DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG.maxCommitRetries);
    expect(cfg.enforceExplicitIdScope).toBe(false);
  });

  it('defaults are permissive and safe', () => {
    expect(DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG.supportedScopes).toEqual([]);
    expect(DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG.enforceExplicitIdScope).toBe(false);
    expect(DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG.smartMoneyRange).toBe('3M');
  });

  it('default commit timeout/maxWait clear Prisma defaults (IN/STOCK batch ~7s)', () => {
    // Prisma's interactive-tx defaults are timeout 5_000ms / maxWait 2_000ms,
    // which the large IN batch exceeded; defaults must give real headroom.
    expect(DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG.commitTimeoutMs).toBeGreaterThan(5_000);
    expect(DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG.commitMaxWaitMs).toBeGreaterThan(2_000);
  });
});

describe('isScopeSupported', () => {
  it('is permissive when supportedScopes is empty', () => {
    expect(isScopeSupported(DEFAULT_SNAPSHOT_ASSEMBLER_CONFIG, 'ANYTHING', 'WHATEVER')).toBe(true);
  });

  it('accepts only listed scopes when supportedScopes is populated', () => {
    const cfg = resolveSnapshotAssemblerConfig({ supportedScopes: KNOWN_SNAPSHOT_SCOPES });
    expect(isScopeSupported(cfg, 'IN', 'STOCK')).toBe(true);
    expect(isScopeSupported(cfg, 'US', 'STOCK')).toBe(true);
    expect(isScopeSupported(cfg, 'CRYPTO', 'CRYPTO')).toBe(true);
    expect(isScopeSupported(cfg, 'IN', 'CRYPTO')).toBe(false);
    expect(isScopeSupported(cfg, 'ZZ', 'STOCK')).toBe(false);
  });
});
