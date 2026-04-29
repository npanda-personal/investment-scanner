import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { AuthIdentityRepository } from './auth-identity.repository';
import type { AuthResponse, AuthTokenPayload, AuthUserDto, LoginRequest, SignupRequest, UpdateProfileRequest } from './auth-identity.types';
import { bearerToken, validateLogin, validateProfile, validateSignup } from './auth-identity.validation';

const TOKEN_TTL_SECONDS = 60 * 60 * 8;
const DEV_SECRET = crypto.randomBytes(32).toString('hex');

export interface AuthenticatedRequest extends Request {
  user?: AuthUserDto;
}

export class AuthIdentityService {
  constructor(private readonly repository = new AuthIdentityRepository()) {}

  async signup(input: SignupRequest): Promise<AuthResponse> {
    this.throwIfErrors(validateSignup(input));
    const email = input.email.trim().toLowerCase();
    const existing = await this.repository.findByEmail(email);
    if (existing) throw new Error('Email is already registered');
    const user = await this.repository.createUser({
      email,
      passwordHash: await this.hashPassword(input.password),
      name: input.name?.trim() || null,
    });
    const dto = this.toUserDto(user);
    return { user: dto, accessToken: this.signToken(dto) };
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    this.throwIfErrors(validateLogin(input));
    const email = input.email.trim().toLowerCase();
    const user = await this.repository.findByEmail(email);
    if (!user?.passwordHash || !(await this.verifyPassword(input.password, user.passwordHash))) {
      throw new Error('Invalid email or password');
    }
    const updated = await this.repository.updateLastLogin(user.id);
    const dto = this.toUserDto(updated);
    return { user: dto, accessToken: this.signToken(dto) };
  }

  logout() {
    return { success: true };
  }

  async me(userId: string): Promise<AuthUserDto | null> {
    const user = await this.repository.findById(userId);
    return user ? this.toUserDto(user) : null;
  }

  async updateProfile(userId: string, input: UpdateProfileRequest): Promise<AuthUserDto> {
    this.throwIfErrors(validateProfile(input));
    return this.toUserDto(await this.repository.updateProfile(userId, { name: input.name?.trim() || null }));
  }

  async authenticateToken(token: string): Promise<AuthUserDto | null> {
    const payload = this.verifyToken(token);
    if (!payload) return null;
    return this.me(payload.sub);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('base64url');
    const hash = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
    });
    return `scrypt$${salt}$${hash.toString('base64url')}`;
  }

  async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const derived = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
    });
    return crypto.timingSafeEqual(Buffer.from(hash, 'base64url'), derived);
  }

  signToken(user: AuthUserDto): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: AuthTokenPayload = { sub: user.id, email: user.email, iat: now, exp: now + TOKEN_TTL_SECONDS };
    const header = this.base64url({ alg: 'HS256', typ: 'JWT' });
    const body = this.base64url(payload);
    const signature = crypto.createHmac('sha256', this.authSecret()).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  verifyToken(token: string): AuthTokenPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expected = crypto.createHmac('sha256', this.authSecret()).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  }

  toUserDto(user: any): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.displayName ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    };
  }

  private authSecret(): string {
    if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
    if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production');
    return DEV_SECRET;
  }

  private base64url(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private throwIfErrors(errors: string[]) {
    if (errors.length > 0) throw new Error(errors.join('; '));
  }
}

const defaultAuthService = new AuthIdentityService();

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = bearerToken(req.headers.authorization);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const user = await defaultAuthService.authenticateToken(token).catch(() => null);
  if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = user;
  return next();
};

export const optionalAuth = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const token = bearerToken(req.headers.authorization);
  if (token) req.user = await defaultAuthService.authenticateToken(token).catch(() => null) || undefined;
  return next();
};
