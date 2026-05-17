/// <reference types="@types/jest" />
import { PortfolioManagementController } from '../../../src/modules/portfolio-management/portfolio-management.controller';
import { PortfolioManagementService } from '../../../src/modules/portfolio-management/portfolio-management.service';

const portfolio = {
  id: 'portfolio-user-a',
  name: 'User A Portfolio',
  baseCurrency: 'USD',
  description: null,
  createdAt: '2026-05-17T00:00:00.000Z',
  updatedAt: '2026-05-17T00:00:00.000Z',
};

const holdingInput = {
  quantity: 12,
  averageCost: 100,
  currency: 'USD',
  notes: 'reviewed',
};

const invalidHoldingInput = {
  quantity: 0,
  averageCost: -1,
  currency: '',
};

const invalidCreateHoldingInput = {
  instrumentId: '',
  quantity: 0,
  averageCost: -1,
  currency: '',
};

const transactionInput = {
  type: 'CASH_IN' as const,
  amount: 1000,
  currency: 'USD',
  transactionDate: '2026-05-17',
};

const invalidTransactionInput = {
  type: 'BUY' as const,
  currency: '',
  transactionDate: 'not-a-date',
};

const createService = () => {
  const repository = {
    getPortfolio: jest.fn(async (portfolioId: string, userId: string) => {
      if (portfolioId === 'portfolio-user-a' && userId === 'user-a') return portfolio;
      return null;
    }),
    updatePortfolio: jest.fn(async (_portfolioId, input) => ({ ...portfolio, ...input })),
    deletePortfolio: jest.fn().mockResolvedValue(undefined),
    addHolding: jest.fn(async (portfolioId, input) => ({
      id: 'holding-user-a',
      portfolioId,
      instrumentId: input.instrumentId,
      symbol: 'ABC',
      companyName: 'ABC Co',
      ...input,
      createdAt: '2026-05-17T00:00:00.000Z',
      updatedAt: '2026-05-17T00:00:00.000Z',
    })),
    updateHolding: jest.fn(async (portfolioId, holdingId, input) => ({
      id: holdingId,
      portfolioId,
      instrumentId: 'stock-1',
      symbol: 'ABC',
      companyName: 'ABC Co',
      ...input,
      createdAt: '2026-05-17T00:00:00.000Z',
      updatedAt: '2026-05-17T00:00:00.000Z',
    })),
    removeHolding: jest.fn().mockResolvedValue(undefined),
    listTransactions: jest.fn().mockResolvedValue([{ id: 'transaction-1', portfolioId: 'portfolio-user-a' }]),
    createTransaction: jest.fn(async (portfolioId, input) => ({ id: 'transaction-2', portfolioId, ...input })),
  };
  const marketDataService = {
    getInstrument: jest.fn().mockResolvedValue({ id: 'stock-1', symbol: 'ABC', company_name: 'ABC Co' }),
  };
  const service = new PortfolioManagementService(
    repository as any,
    marketDataService as any,
    { latestForInstrument: jest.fn() } as any,
    { assertAllowed: jest.fn() } as any
  );
  return { service, repository, marketDataService };
};

const createResponse = () => {
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res;
};

describe('portfolio management child-resource ownership', () => {
  it('updates holdings only after resolving the parent portfolio for the current user', async () => {
    const { service, repository } = createService();

    await expect(service.updateHolding('portfolio-user-a', 'holding-user-a', holdingInput, 'user-a')).resolves.toMatchObject({
      id: 'holding-user-a',
      portfolioId: 'portfolio-user-a',
    });

    expect(repository.getPortfolio).toHaveBeenCalledWith('portfolio-user-a', 'user-a');
    expect(repository.updateHolding).toHaveBeenCalledWith('portfolio-user-a', 'holding-user-a', holdingInput);
    expect(repository.getPortfolio.mock.invocationCallOrder[0]).toBeLessThan(repository.updateHolding.mock.invocationCallOrder[0]);
  });

  it('does not read or mutate a holding when the portfolio belongs to another user', async () => {
    const { service, repository } = createService();

    await expect(service.updateHolding('portfolio-user-a', 'holding-user-a', holdingInput, 'user-b')).rejects.toThrow('Portfolio not found');
    await expect(service.removeHolding('portfolio-user-a', 'holding-user-a', 'user-b')).rejects.toThrow('Portfolio not found');

    expect(repository.getPortfolio).toHaveBeenCalledWith('portfolio-user-a', 'user-b');
    expect(repository.updateHolding).not.toHaveBeenCalled();
    expect(repository.removeHolding).not.toHaveBeenCalled();
  });

  it('proves portfolio ownership before validating child create and update input', async () => {
    const { service, repository, marketDataService } = createService();

    await expect(service.addHolding('portfolio-user-a', invalidCreateHoldingInput as any, 'user-b')).rejects.toThrow('Portfolio not found');
    await expect(service.updateHolding('portfolio-user-a', 'holding-user-a', invalidHoldingInput as any, 'user-b')).rejects.toThrow('Portfolio not found');
    await expect(service.createTransaction('portfolio-user-a', invalidTransactionInput as any, 'user-b')).rejects.toThrow('Portfolio not found');

    expect(repository.getPortfolio).toHaveBeenCalledWith('portfolio-user-a', 'user-b');
    expect(repository.addHolding).not.toHaveBeenCalled();
    expect(repository.updateHolding).not.toHaveBeenCalled();
    expect(repository.createTransaction).not.toHaveBeenCalled();
    expect(marketDataService.getInstrument).not.toHaveBeenCalled();
  });

  it('proves portfolio ownership before validating portfolio updates', async () => {
    const { service, repository } = createService();

    await expect(service.updatePortfolio('portfolio-user-a', { name: '' }, 'user-b')).rejects.toThrow('Portfolio not found');

    expect(repository.getPortfolio).toHaveBeenCalledWith('portfolio-user-a', 'user-b');
    expect(repository.updatePortfolio).not.toHaveBeenCalled();
  });

  it('does not list or create transactions when the portfolio belongs to another user', async () => {
    const { service, repository, marketDataService } = createService();

    await expect(service.listTransactions('portfolio-user-a', 'user-b')).rejects.toThrow('Portfolio not found');
    await expect(service.createTransaction('portfolio-user-a', transactionInput, 'user-b')).rejects.toThrow('Portfolio not found');

    expect(repository.getPortfolio).toHaveBeenCalledWith('portfolio-user-a', 'user-b');
    expect(repository.listTransactions).not.toHaveBeenCalled();
    expect(repository.createTransaction).not.toHaveBeenCalled();
    expect(marketDataService.getInstrument).not.toHaveBeenCalled();
  });

  it('allows owned-user transaction flows after parent ownership is proven', async () => {
    const { service, repository } = createService();

    await expect(service.listTransactions('portfolio-user-a', 'user-a')).resolves.toEqual([{ id: 'transaction-1', portfolioId: 'portfolio-user-a' }]);
    await expect(service.createTransaction('portfolio-user-a', transactionInput, 'user-a')).resolves.toMatchObject({
      id: 'transaction-2',
      portfolioId: 'portfolio-user-a',
    });

    expect(repository.listTransactions).toHaveBeenCalledWith('portfolio-user-a');
    expect(repository.createTransaction).toHaveBeenCalledWith('portfolio-user-a', transactionInput);
  });

  it('propagates the authenticated user through child-resource controller methods', async () => {
    const service = {
      updateHolding: jest.fn().mockResolvedValue({ id: 'holding-user-a' }),
      removeHolding: jest.fn().mockResolvedValue(undefined),
      listTransactions: jest.fn().mockResolvedValue([]),
      createTransaction: jest.fn().mockResolvedValue({ id: 'transaction-1' }),
    };
    const controller = new PortfolioManagementController(service as any);
    const req = {
      params: { id: 'portfolio-user-a', holdingId: 'holding-user-a' },
      body: transactionInput,
      user: { id: 'user-a' },
    };

    await controller.updateHolding({ ...req, body: holdingInput } as any, createResponse() as any);
    await controller.removeHolding(req as any, createResponse() as any);
    await controller.listTransactions(req as any, createResponse() as any);
    await controller.createTransaction(req as any, createResponse() as any);

    expect(service.updateHolding).toHaveBeenCalledWith('portfolio-user-a', 'holding-user-a', holdingInput, 'user-a');
    expect(service.removeHolding).toHaveBeenCalledWith('portfolio-user-a', 'holding-user-a', 'user-a');
    expect(service.listTransactions).toHaveBeenCalledWith('portfolio-user-a', 'user-a');
    expect(service.createTransaction).toHaveBeenCalledWith('portfolio-user-a', transactionInput, 'user-a');
  });

  it('returns non-leaking 404 responses for controller ownership misses', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = {
      updatePortfolio: jest.fn().mockRejectedValue(new Error('Portfolio not found')),
      deletePortfolio: jest.fn().mockRejectedValue(new Error('Portfolio not found')),
      addHolding: jest.fn().mockRejectedValue(new Error('Portfolio not found')),
      updateHolding: jest.fn().mockRejectedValue(new Error('Portfolio not found')),
      removeHolding: jest.fn().mockRejectedValue(new Error('Portfolio not found')),
      listTransactions: jest.fn().mockRejectedValue(new Error('Portfolio not found')),
      createTransaction: jest.fn().mockRejectedValue(new Error('Portfolio not found')),
    };
    const controller = new PortfolioManagementController(service as any);
    const req = {
      params: { id: 'portfolio-user-a', holdingId: 'holding-user-a' },
      body: invalidTransactionInput,
      user: { id: 'user-b' },
    };

    try {
      for (const handler of [
        controller.updatePortfolio,
        controller.deletePortfolio,
        controller.addHolding,
        controller.updateHolding,
        controller.removeHolding,
        controller.listTransactions,
        controller.createTransaction,
      ]) {
        const res = createResponse();
        await handler(req as any, res as any);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Portfolio not found' });
      }
    } finally {
      consoleError.mockRestore();
    }
  });
});
