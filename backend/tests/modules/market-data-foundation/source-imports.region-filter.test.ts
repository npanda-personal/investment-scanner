/// <reference types="@types/jest" />
import { SourceImportsRepository } from '../../../src/modules/market-data-foundation/persistence/market-data-foundation.repository.source-imports';

/**
 * Region isolation for the admin source-file-imports list.
 *
 * source_file_imports rows are exchange-file evidence with NO region column. NSE/BSE/
 * manual rows are India-context; US/EU/Crypto ingest via the provider (Yahoo) and produce
 * NO exchange files. listSourceFileImports maps region -> allowed sources so a non-IN admin
 * scope honestly returns an empty list instead of leaking India's bhavcopy. This test pins
 * that mapping (the highest-risk new logic — empty-vs-leak honesty) against a mocked Prisma.
 */
describe('SourceImportsRepository.listSourceFileImports — region scoping', () => {
  function makeRepo() {
    const findMany = jest.fn().mockResolvedValue([]);
    const repo = new SourceImportsRepository({ sourceFileImport: { findMany } } as any);
    return { repo, findMany };
  }

  function whereOf(findMany: jest.Mock) {
    return findMany.mock.calls[0][0].where;
  }

  it('IN scope restricts to NSE/BSE/MANUAL_VERIFIED sources', async () => {
    const { repo, findMany } = makeRepo();
    await repo.listSourceFileImports({ region: 'IN' });
    expect(whereOf(findMany).source).toEqual({ in: ['NSE', 'BSE', 'MANUAL_VERIFIED'] });
  });

  it.each(['US', 'EU', 'CRYPTO'])(
    '%s scope returns an empty source allow-list (honest empty, no India leak)',
    async (region) => {
      const { repo, findMany } = makeRepo();
      await repo.listSourceFileImports({ region });
      // source: { in: [] } => Prisma matches zero rows.
      expect(whereOf(findMany).source).toEqual({ in: [] });
    },
  );

  it('lower-case / padded region keys normalize the same way', async () => {
    const { repo, findMany } = makeRepo();
    await repo.listSourceFileImports({ region: '  us ' });
    expect(whereOf(findMany).source).toEqual({ in: [] });
  });

  it('GLOBAL scope (crypto plane) returns an empty allow-list — no India exchange-file leak', async () => {
    const { repo, findMany } = makeRepo();
    await repo.listSourceFileImports({ region: 'GLOBAL' });
    // Crypto selects region GLOBAL; the 24/7 lane produces no exchange files → zero rows,
    // NOT an unscoped "show all" that would surface India's NSE/BSE bhavcopy.
    expect(whereOf(findMany).source).toEqual({ in: [] });
  });

  it('only a region-less (internal/unscoped) caller stays unrestricted with the TEST_ exclusion', async () => {
    const { repo, findMany } = makeRepo();
    await repo.listSourceFileImports({});
    expect(whereOf(findMany).source).toEqual({ not: { startsWith: 'TEST_' } });
  });

  it('explicit source filter overrides the region allow-list', async () => {
    const { repo, findMany } = makeRepo();
    await repo.listSourceFileImports({ region: 'IN', source: 'nse' });
    // Explicit source wins; normalized to upper-case.
    expect(whereOf(findMany).source).toEqual('NSE');
  });

  it('TEST_ fixture rows stay excluded under IN scope (allow-list contains no TEST_ source)', async () => {
    const { repo, findMany } = makeRepo();
    await repo.listSourceFileImports({ region: 'IN' });
    const sources: string[] = (whereOf(findMany).source as { in: string[] }).in;
    expect(sources.some((s) => s.startsWith('TEST_'))).toBe(false);
  });
});
