import { AuthIdentityController } from './auth-identity.controller';
import { AuthIdentityRepository } from './auth-identity.repository';
import { authIdentityRouter } from './auth-identity.router';
import { AuthIdentityService } from './auth-identity.service';

export const authIdentityModule = {
  name: 'auth-identity',
  router: authIdentityRouter,
  controller: AuthIdentityController,
  service: AuthIdentityService,
  repository: AuthIdentityRepository,
};
