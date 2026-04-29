import type { Response } from 'express';
import { AuthenticatedRequest, AuthIdentityService } from './auth-identity.service';

export class AuthIdentityController {
  constructor(private readonly service = new AuthIdentityService()) {}

  signup = async (req: AuthenticatedRequest, res: Response) => this.respond(res, () => this.service.signup(req.body), 201);
  login = async (req: AuthenticatedRequest, res: Response) => this.respond(res, () => this.service.login(req.body));
  logout = async (_req: AuthenticatedRequest, res: Response) => this.respond(res, () => this.service.logout());
  me = async (req: AuthenticatedRequest, res: Response) => this.respondMaybeFound(res, () => this.service.me(req.user!.id));
  updateMe = async (req: AuthenticatedRequest, res: Response) => this.respond(res, () => this.service.updateProfile(req.user!.id, req.body));

  private async respond(res: Response, fn: () => Promise<unknown> | unknown, status = 200) {
    try {
      return res.status(status).json(await fn());
    } catch (error: any) {
      const message = error.message || 'Authentication request failed';
      const statusCode = message.includes('Invalid email') ? 401 : 400;
      return res.status(statusCode).json({ error: message });
    }
  }

  private async respondMaybeFound(res: Response, fn: () => Promise<unknown | null> | unknown | null) {
    const result = await fn();
    if (!result) return res.status(404).json({ error: 'User not found' });
    return res.json(result);
  }
}
