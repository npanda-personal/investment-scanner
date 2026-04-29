import type { Request, Response } from 'express';
import { SubscriptionBillingProvider } from './subscription-billing.provider';
import { SubscriptionBillingService } from './subscription-billing.service';
import { getParam, getUserId, requireAdmin } from './subscription-billing.validation';

export class SubscriptionBillingController {
  constructor(
    private readonly service = new SubscriptionBillingService(),
    private readonly provider = new SubscriptionBillingProvider()
  ) {}

  me = async (req: Request, res: Response) => this.respond(res, () => this.service.me(getUserId(req.headers['x-user-id'])));
  plans = async (_req: Request, res: Response) => this.respond(res, () => this.service.plans());
  usage = async (req: Request, res: Response) => this.respond(res, () => this.service.usage(getUserId(req.headers['x-user-id'])));
  features = async (req: Request, res: Response) => this.respond(res, () => this.service.features(getUserId(req.headers['x-user-id'])));
  providerStatus = async (_req: Request, res: Response) => this.respond(res, () => this.provider.providerStatus());

  changePlan = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.changePlan(req.body, getUserId(req.headers['x-user-id']))
  );

  adminChangePlan = async (req: Request, res: Response) => this.respond(res, () => {
    requireAdmin(req.headers);
    const userId = getParam(req.params.userId);
    return this.service.changePlan({ ...req.body, userId }, userId);
  });

  private async respond(res: Response, fn: () => Promise<unknown> | unknown) {
    try {
      return res.json(await fn());
    } catch (error: any) {
      const message = error.message || 'Subscription request failed';
      const status = message.includes('Admin access') || message.includes('not configured') ? 403 : 400;
      return res.status(status).json({ error: message });
    }
  }
}
