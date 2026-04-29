/// <reference types="@types/jest" />
import { createAuthIdentityRouter } from '../../../src/modules/auth-identity';

describe('auth identity routes', () => {
  it('registers MVP endpoints', () => {
    const router = createAuthIdentityRouter({
      signup: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      me: jest.fn(),
      updateMe: jest.fn(),
    } as any);
    const routes = router.stack.filter((layer: any) => layer.route).map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toEqual([
      'POST /auth/signup',
      'POST /auth/login',
      'POST /auth/logout',
      'GET /auth/me',
      'PATCH /auth/me',
    ]);
  });
});
