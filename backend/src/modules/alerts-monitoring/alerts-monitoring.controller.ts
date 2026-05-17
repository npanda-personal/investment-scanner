import type { Request, Response } from 'express';
import { AlertsMonitoringService } from './alerts-monitoring.service';
import { getParam } from './alerts-monitoring.validation';

const currentUserId = (req: Request) => (req as any).user?.id || 'default-user';

export class AlertsMonitoringController {
  constructor(private readonly service = new AlertsMonitoringService()) {}

  listRules = async (req: Request, res: Response) => {
    try { return res.json({ rules: await this.service.listRules(currentUserId(req)) }); }
    catch (error) { return this.error(res, error, 'Failed to list alert rules'); }
  };

  createRule = async (req: Request, res: Response) => {
    try { return res.status(201).json(await this.service.createRule(req.body, currentUserId(req))); }
    catch (error) { return this.error(res, error, 'Failed to create alert rule', 400); }
  };

  getRule = async (req: Request, res: Response) => {
    try {
      const rule = await this.service.getRule(getParam(req.params.id), currentUserId(req));
      if (!rule) return res.status(404).json({ error: 'Alert rule not found' });
      return res.json(rule);
    } catch (error) { return this.error(res, error, 'Failed to load alert rule'); }
  };

  updateRule = async (req: Request, res: Response) => {
    try { return res.json(await this.service.updateRule(getParam(req.params.id), req.body, currentUserId(req))); }
    catch (error) { return this.error(res, error, 'Failed to update alert rule', 400); }
  };

  deleteRule = async (req: Request, res: Response) => {
    try {
      await this.service.deleteRule(getParam(req.params.id), currentUserId(req));
      return res.status(204).send();
    } catch (error) { return this.error(res, error, 'Failed to delete alert rule'); }
  };

  evaluate = async (req: Request, res: Response) => {
    try { return res.json(await this.service.evaluate(currentUserId(req))); }
    catch (error) { return this.error(res, error, 'Failed to evaluate alerts'); }
  };

  listEvents = async (req: Request, res: Response) => {
    try { return res.json({ events: await this.service.listEvents(currentUserId(req)) }); }
    catch (error) { return this.error(res, error, 'Failed to list alert events'); }
  };

  markRead = async (req: Request, res: Response) => {
    try { return res.json(await this.service.markRead(getParam(req.params.id), currentUserId(req))); }
    catch (error) { return this.error(res, error, 'Failed to mark alert event read', 400); }
  };

  dismiss = async (req: Request, res: Response) => {
    try { return res.json(await this.service.dismiss(getParam(req.params.id), currentUserId(req))); }
    catch (error) { return this.error(res, error, 'Failed to dismiss alert event', 400); }
  };

  markAllRead = async (req: Request, res: Response) => {
    try { return res.json(await this.service.markAllRead(currentUserId(req))); }
    catch (error) { return this.error(res, error, 'Failed to mark all alerts read', 400); }
  };

  summary = async (req: Request, res: Response) => {
    try {
      const events = await this.service.listEvents(currentUserId(req));
      return res.json({
        unreadCount: events.filter((event) => !event.readAt && !event.dismissedAt).length,
        criticalCount: events.filter((event) => event.severity === 'CRITICAL' && !event.dismissedAt).length,
      });
    } catch (error) { return this.error(res, error, 'Failed to load alert summary'); }
  };

  private error(res: Response, error: unknown, fallback: string, status = 500) {
    const message = error instanceof Error ? error.message : fallback;
    const responseStatus = message.endsWith('not found') ? 404 : status;
    console.error(fallback, error);
    return res.status(responseStatus).json({ error: message });
  }
}
