export { authIdentityModule } from './auth-identity.module';
export {
  authIdentityRouter,
  createAuthIdentityRouter,
  default as authIdentityRouterDefault,
} from './auth-identity.router';
export { AuthIdentityController } from './auth-identity.controller';
export { AuthIdentityRepository } from './auth-identity.repository';
export { AuthIdentityService, optionalAuth, requireAuth } from './auth-identity.service';
export { bearerToken, MIN_PASSWORD_LENGTH, validateLogin, validateProfile, validateSignup } from './auth-identity.validation';
export type {
  AuthResponse,
  AuthTokenPayload,
  AuthUserDto,
  LoginRequest,
  SignupRequest,
  UpdateProfileRequest,
} from './auth-identity.types';
