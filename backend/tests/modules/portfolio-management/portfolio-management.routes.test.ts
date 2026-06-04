/// <reference types="@types/jest" />
import { createPortfolioManagementRouter } from '../../../src/modules/portfolio-management';

describe('portfolio management routes', () => {
  it('registers portfolio MVP endpoints', () => {
    const controller = {
      listPortfolios: jest.fn(),
      createPortfolio: jest.fn(),
      getPortfolio: jest.fn(),
      updatePortfolio: jest.fn(),
      deletePortfolio: jest.fn(),
      addHolding: jest.fn(),
      updateHolding: jest.fn(),
      removeHolding: jest.fn(),
      summary: jest.fn(),
      allocation: jest.fn(),
      portfolioChanges: jest.fn(),
      listTransactions: jest.fn(),
      createTransaction: jest.fn(),
    };
    const router = createPortfolioManagementRouter(controller as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /portfolios',
      'POST /portfolios',
      'GET /portfolios/:id',
      'PATCH /portfolios/:id',
      'DELETE /portfolios/:id',
      'POST /portfolios/:id/holdings',
      'PATCH /portfolios/:id/holdings/:holdingId',
      'DELETE /portfolios/:id/holdings/:holdingId',
      'GET /portfolios/:id/summary',
      'GET /portfolios/:id/allocation',
      'GET /portfolios/:id/changes',
      'GET /portfolios/:id/transactions',
      'POST /portfolios/:id/transactions',
    ]);
  });
});
