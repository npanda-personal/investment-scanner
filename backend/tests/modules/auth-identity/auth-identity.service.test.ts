/// <reference types="@types/jest" />
import { AuthIdentityService, requireAuth } from '../../../src/modules/auth-identity';

const now = new Date('2026-04-29T00:00:00.000Z');
const userRecord = (overrides: any = {}) => ({
  id: overrides.id || 'user-1',
  email: overrides.email || 'user@example.com',
  displayName: overrides.displayName ?? 'User',
  passwordHash: overrides.passwordHash || null,
  createdAt: now,
  updatedAt: now,
  lastLoginAt: overrides.lastLoginAt ?? null,
});

describe('AuthIdentityService', () => {
  it('signs up a user and hashes password', async () => {
    const repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      createUser: jest.fn(async (input) => userRecord({ email: input.email, displayName: input.name, passwordHash: input.passwordHash })),
    };
    const service = new AuthIdentityService(repository as any);

    const result = await service.signup({ email: 'USER@example.com', password: 'password123', name: 'User' });

    expect(result.user.email).toBe('user@example.com');
    expect(result).toHaveProperty('accessToken');
    expect(repository.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user@example.com',
      name: 'User',
    }));
    const storedHash = repository.createUser.mock.calls[0][0].passwordHash;
    expect(storedHash).not.toBe('password123');
    expect(storedHash).toContain('scrypt$');
  });

  it('logs in with correct password and fails with wrong password', async () => {
    const hash = await new AuthIdentityService({} as any).hashPassword('password123');
    const repository = {
      findByEmail: jest.fn().mockResolvedValue(userRecord({ passwordHash: hash })),
      updateLastLogin: jest.fn().mockResolvedValue(userRecord({ passwordHash: hash, lastLoginAt: now })),
    };
    const service = new AuthIdentityService(repository as any);

    await expect(service.login({ email: 'user@example.com', password: 'password123' })).resolves.toHaveProperty('accessToken');
    await expect(service.login({ email: 'user@example.com', password: 'wrongpass' })).rejects.toThrow('Invalid email or password');
  });

  it('returns safe user DTO without password hash', () => {
    const dto = new AuthIdentityService({} as any).toUserDto(userRecord({ passwordHash: 'secret' }));
    expect(dto).not.toHaveProperty('passwordHash');
  });

  it('requireAuth rejects missing token', async () => {
    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
