import type { Request, Response } from 'express';
import { SubscriptionBillingProvider } from './subscription-billing.provider';
import { SubscriptionBillingService } from './subscription-billing.service';
import { getParam, requireAdmin } from './subscription-billing.validation';

const currentUserId = (req: Request) => (req as any).user?.id || 'default-user';

export class SubscriptionBillingController {
  constructor(
    private readonly service = new SubscriptionBillingService(),
    private readonly provider = new SubscriptionBillingProvider()
  ) {}

  me = async (req: Request, res: Response) => this.respond(res, () => this.service.me(currentUserId(req)));
  plans = async (_req: Request, res: Response) => this.respond(res, () => this.service.plans());
  usage = async (req: Request, res: Response) => this.respond(res, () => this.service.usage(currentUserId(req)));
  features = async (req: Request, res: Response) => this.respond(res, () => this.service.features(currentUserId(req)));
  providerStatus = async (_req: Request, res: Response) => this.respond(res, () => this.provider.providerStatus());

  changePlan = async (req: Request, res: Response) => this.respond(res, () =>
    this.service.changePlan(req.body, currentUserId(req))
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
