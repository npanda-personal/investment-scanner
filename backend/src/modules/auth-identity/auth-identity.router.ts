import express from 'express';
import { AuthIdentityController } from './auth-identity.controller';
import { requireAuth } from './auth-identity.service';

export const createAuthIdentityRouter = (
  controller = new AuthIdentityController()
) => {
  const router = express.Router();

  router.post('/auth/signup', controller.signup);
  router.post('/auth/login', controller.login);
  router.post('/auth/logout', requireAuth, controller.logout);
  router.get('/auth/me', requireAuth, controller.me);
  router.patch('/auth/me', requireAuth, controller.updateMe);

  return router;
};

export const authIdentityRouter = createAuthIdentityRouter();
export default authIdentityRouter;
