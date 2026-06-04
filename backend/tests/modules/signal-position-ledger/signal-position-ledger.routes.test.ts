/// <reference types="@types/jest" />
import { apiModules } from '../../../src/api/routes';
import { createSignalPositionLedgerRouter, signalPositionLedgerRouter } from '../../../src/modules/signal-position-ledger';

const routePaths = (router: any) =>
  router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

describe('signal position ledger routes', () => {
  it('registers health, active, closed, and refresh endpoints', () => {
    const router = createSignalPositionLedgerRouter({
      health: jest.fn(),
      activeRows: jest.fn(),
      closedRows: jest.fn(),
      persistedActiveRows: jest.fn(),
      persistedClosedRows: jest.fn(),
      refreshActiveRows: jest.fn(),
    } as any);

    expect(routePaths(router)).toEqual([
      'GET /signals/position-ledger/health',
      'GET /signals/position-ledger/active',
      'GET /signals/position-ledger/closed',
      'GET /signals/position-ledger/persisted/active',
      'GET /signals/position-ledger/persisted/closed',
      'POST /signals/position-ledger/active/refresh',
    ]);
  });

  it('mounts the accepted router through the api module registry', () => {
    expect(apiModules.some((module) => module.path === '/api/v1' && module.router === signalPositionLedgerRouter)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Persisted-read constraint: trader GET /active must NOT trigger live calc
  // -------------------------------------------------------------------------

  it('trader GET /active is wired to persistedActiveRows (no live enrichment on GET)', () => {
    const persistedActiveRows = jest.fn();
    const activeRows = jest.fn();   // live-enrichment handler — must NOT be wired to GET /active
    const router = createSignalPositionLedgerRouter({
      health: jest.fn(),
      activeRows,
      closedRows: jest.fn(),
      persistedActiveRows,
      persistedClosedRows: jest.fn(),
      refreshActiveRows: jest.fn(),
    } as any);

    // Find the GET /signals/position-ledger/active layer
    const activeLayer: any = router.stack.find(
      (layer: any) => layer.route?.path === '/signals/position-ledger/active' && layer.route?.methods?.get,
    );
    expect(activeLayer).toBeDefined();
    // The handler registered for that route must be persistedActiveRows, not activeRows
    const handlers: Function[] = activeLayer!.route!.stack.map((s: any) => s.handle);
    expect(handlers).toContain(persistedActiveRows);
    expect(handlers).not.toContain(activeRows);
  });

  it('trader GET /closed is wired to persistedClosedRows (no live enrichment on GET)', () => {
    const persistedClosedRows = jest.fn();
    const closedRows = jest.fn();
    const router = createSignalPositionLedgerRouter({
      health: jest.fn(),
      activeRows: jest.fn(),
      closedRows,
      persistedActiveRows: jest.fn(),
      persistedClosedRows,
      refreshActiveRows: jest.fn(),
    } as any);

    const closedLayer: any = router.stack.find(
      (layer: any) => layer.route?.path === '/signals/position-ledger/closed' && layer.route?.methods?.get,
    );
    expect(closedLayer).toBeDefined();
    const handlers: Function[] = closedLayer!.route!.stack.map((s: any) => s.handle);
    expect(handlers).toContain(persistedClosedRows);
    expect(handlers).not.toContain(closedRows);
  });

  it('POST /active/refresh is still wired to refreshActiveRows (live path kept behind POST)', () => {
    const refreshActiveRows = jest.fn();
    const router = createSignalPositionLedgerRouter({
      health: jest.fn(),
      activeRows: jest.fn(),
      closedRows: jest.fn(),
      persistedActiveRows: jest.fn(),
      persistedClosedRows: jest.fn(),
      refreshActiveRows,
    } as any);

    const refreshLayer: any = router.stack.find(
      (layer: any) => layer.route?.path === '/signals/position-ledger/active/refresh' && layer.route?.methods?.post,
    );
    expect(refreshLayer).toBeDefined();
    const handlers: Function[] = refreshLayer!.route!.stack.map((s: any) => s.handle);
    expect(handlers).toContain(refreshActiveRows);
  });
});
