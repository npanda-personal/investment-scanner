/// <reference types="@types/jest" />
import { createPortfolioIntelligenceRouter } from '../../../src/modules/portfolio-intelligence';

describe('portfolio intelligence routes', () => {
  it('registers MVP endpoints', () => {
    const router = createPortfolioIntelligenceRouter({
      intelligence: jest.fn(),
      refresh: jest.fn(),
      redFlags: jest.fn(),
      review: jest.fn(),
    } as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'GET /portfolios/:id/intelligence',
      'POST /portfolios/:id/intelligence/refresh',
      'GET /portfolios/:id/red-flags',
      'GET /portfolios/:id/review',
    ]);
  });
});
