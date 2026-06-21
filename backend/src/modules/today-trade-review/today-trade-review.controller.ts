import type { Request, Response } from 'express';
import { TodayTradeReviewService } from './today-trade-review.service';
import { parseTodayReviewQuery, parseTodayReviewRunRequest, requireTodayReviewId } from './today-trade-review.validation';
import { cacheService, type CacheService } from '../../cache/cache.service';
import { todayReviewKey } from '../../cache/cache-keys';

export class TodayTradeReviewController {
  constructor(
    private readonly service = new TodayTradeReviewService(),
    private readonly cache: CacheService = cacheService,
  ) {}

  latest = async (req: Request, res: Response) => {
    try {
      const query = parseTodayReviewQuery(req.query);
      return res.json(await this.cache.cacheReadThrough(
        todayReviewKey(query),
        () => this.service.latest(query),
        undefined,
        (v: any) => v?.run !== null,
      ));
    } catch (error) {
      return this.error(res, error, 'Failed to load latest Today review.');
    }
  };

  runs = async (req: Request, res: Response) => {
    try {
      return res.json(await this.service.runs(parseTodayReviewQuery(req.query)));
    } catch (error) {
      return this.error(res, error, 'Failed to load Today review runs.');
    }
  };

  runById = async (req: Request, res: Response) => {
    try {
      const result = await this.service.runById(requireTodayReviewId(req.params.id));
      return result ? res.json(result) : res.status(404).json({ error: 'Today review run not found.' });
    } catch (error) {
      return this.error(res, error, 'Failed to load Today review run.');
    }
  };

  candidate = async (req: Request, res: Response) => {
    try {
      const result = await this.service.candidate(requireTodayReviewId(req.params.id));
      return result ? res.json(result) : res.status(404).json({ error: 'Today review candidate not found.' });
    } catch (error) {
      return this.error(res, error, 'Failed to load Today review candidate.');
    }
  };

  run = async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await this.service.run(parseTodayReviewRunRequest(req.query, req.body)));
    } catch (error) {
      return this.error(res, error, 'Failed to build Today review.');
    }
  };

  private error(res: Response, error: unknown, message: string) {
    console.error(message, error);
    return res.status(500).json({ error: message });
  }
}
