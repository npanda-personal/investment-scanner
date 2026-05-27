/// <reference types="@types/jest" />
import { apiModules } from '../../../src/api/routes';
import { createSignalPositionLedgerRouter, signalPositionLedgerRouter } from '../../../src/modules/signal-position-ledger';

const routePaths = (router: any) =>
  router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

describe('signal position ledger routes', () => {
  it('registers health, active, and refresh endpoints', () => {
    const router = createSignalPositionLedgerRouter({
      health: jest.fn(),
      activeRows: jest.fn(),
      refreshActiveRows: jest.fn(),
    } as any);

    expect(routePaths(router)).toEqual([
      'GET /signals/position-ledger/health',
      'GET /signals/position-ledger/active',
      'POST /signals/position-ledger/active/refresh',
    ]);
  });

  it('mounts the accepted router through the api module registry', () => {
    expect(apiModules.some((module) => module.path === '/api/v1' && module.router === signalPositionLedgerRouter)).toBe(true);
  });
});
