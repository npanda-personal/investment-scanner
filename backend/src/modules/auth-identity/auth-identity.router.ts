import express from 'express';
import { AuthIdentityController } from './auth-identity.controller';
import { requireAuth } from './auth-identity.service';
import { loginRateLimiter, signupRateLimiter } from '../../shared/middleware/auth-rate-limiter';

export const createAuthIdentityRouter = (
  controller = new AuthIdentityController()
) => {
  const router = express.Router();

  router.post('/auth/signup', signupRateLimiter, controller.signup);
  router.post('/auth/login', loginRateLimiter, controller.login);
  router.post('/auth/logout', requireAuth, controller.logout);
  router.get('/auth/me', requireAuth, controller.me);
  router.patch('/auth/me', requireAuth, controller.updateMe);

  return router;
};

export const authIdentityRouter = createAuthIdentityRouter();
export default authIdentityRouter;
