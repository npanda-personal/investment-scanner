import { TodayTradeReviewController } from '../../../src/modules/today-trade-review';

const response = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

describe('TodayTradeReviewController', () => {
  it('handles GET /today-review/latest', async () => {
    const service = { latest: jest.fn().mockResolvedValue({ run: null, groups: {}, scope: { region: 'IN', assetType: 'STOCK' } }) };
    const controller = new TodayTradeReviewController(service as any);
    const res = response();

    await controller.latest({ query: { region: 'IN', assetType: 'STOCK' } } as any, res);

    expect(service.latest).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK', limit: undefined, offset: undefined });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ scope: { region: 'IN', assetType: 'STOCK' } }));
  });

  it('handles GET /today-review/runs', async () => {
    const service = { runs: jest.fn().mockResolvedValue({ items: [], pagination: { total: 0, limit: 10, offset: 0, nextOffset: null, hasMore: false } }) };
    const controller = new TodayTradeReviewController(service as any);
    const res = response();

    await controller.runs({ query: { limit: '10', offset: '0' } } as any, res);

    expect(service.runs).toHaveBeenCalledWith({ region: undefined, assetType: undefined, limit: 10, offset: 0 });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ items: [] }));
  });

  it('handles GET /today-review/runs/:id', async () => {
    const service = { runById: jest.fn().mockResolvedValue({ run: { id: 'run-1' } }) };
    const controller = new TodayTradeReviewController(service as any);
    const res = response();

    await controller.runById({ params: { id: 'run-1' } } as any, res);

    expect(service.runById).toHaveBeenCalledWith('run-1');
    expect(res.json).toHaveBeenCalledWith({ run: { id: 'run-1' } });
  });

  it('handles GET /today-review/candidates/:id', async () => {
    const service = { candidate: jest.fn().mockResolvedValue({ id: 'candidate-1', state: 'BLOCKED' }) };
    const controller = new TodayTradeReviewController(service as any);
    const res = response();

    await controller.candidate({ params: { id: 'candidate-1' } } as any, res);

    expect(service.candidate).toHaveBeenCalledWith('candidate-1');
    expect(res.json).toHaveBeenCalledWith({ id: 'candidate-1', state: 'BLOCKED' });
  });

  it('handles POST /today-review/run', async () => {
    const service = { run: jest.fn().mockResolvedValue({ run: { id: 'run-1', status: 'COMPLETED' } }) };
    const controller = new TodayTradeReviewController(service as any);
    const res = response();

    await controller.run({ query: {}, body: { region: 'IN', assetType: 'STOCK' } } as any, res);

    expect(service.run).toHaveBeenCalledWith({ region: 'IN', assetType: 'STOCK' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ run: { id: 'run-1', status: 'COMPLETED' } });
  });

  it('returns 404 for missing run or candidate records', async () => {
    const service = { runById: jest.fn().mockResolvedValue(null), candidate: jest.fn().mockResolvedValue(null) };
    const controller = new TodayTradeReviewController(service as any);
    const runRes = response();
    const candidateRes = response();

    await controller.runById({ params: { id: 'missing-run' } } as any, runRes);
    await controller.candidate({ params: { id: 'missing-candidate' } } as any, candidateRes);

    expect(runRes.status).toHaveBeenCalledWith(404);
    expect(candidateRes.status).toHaveBeenCalledWith(404);
  });
});
