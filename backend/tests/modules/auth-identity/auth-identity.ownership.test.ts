/// <reference types="@types/jest" />
import { PortfolioManagementRepository } from '../../../src/modules/portfolio-management';

describe('auth ownership isolation', () => {
  it('filters portfolio lookup by current user or legacy null owner', async () => {
    const db = {
      portfolio: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const repository = new PortfolioManagementRepository(db as any);

    await repository.getPortfolio('portfolio-1', 'user-1');

    expect(db.portfolio.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'portfolio-1',
        OR: [{ userId: 'user-1' }, { userId: null }],
      },
    });
  });
});
