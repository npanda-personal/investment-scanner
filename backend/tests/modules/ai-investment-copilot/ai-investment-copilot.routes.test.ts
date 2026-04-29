/// <reference types="@types/jest" />
import { createAiInvestmentCopilotRouter } from '../../../src/modules/ai-investment-copilot';

describe('ai investment copilot routes', () => {
  it('registers MVP endpoints', () => {
    const router = createAiInvestmentCopilotRouter({
      stockSummary: jest.fn(),
      portfolioSummary: jest.fn(),
      watchlistSummary: jest.fn(),
      marketBrief: jest.fn(),
      alertDigest: jest.fn(),
    } as any);
    const routes = router.stack.filter((layer: any) => layer.route).map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'POST /copilot/stock-summary',
      'POST /copilot/portfolio-summary',
      'POST /copilot/watchlist-summary',
      'GET /copilot/market-brief',
      'GET /copilot/alert-digest',
    ]);
  });
});
