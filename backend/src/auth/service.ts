import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, RegisterRequest, LoginRequest, AuthResponse } from '../types/user';

// In‑memory store (replace with database later)
const users: User[] = [];

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

export class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const existing = users.find(u => u.email === data.email);
    if (existing) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user: User = {
      id: `user_${Date.now()}`,
      email: data.email,
      username: data.username,
      displayName: data.displayName || data.email.split('@')[0],
      passwordHash,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(user);

    const token = this.generateToken(user);
    return {
      user: this.omitPassword(user),
      token,
    };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const user = users.find(u => u.email === data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }
    user.lastLoginAt = new Date();
    const token = this.generateToken(user);
    return {
      user: this.omitPassword(user),
      token,
    };
  }

  async getUser(id: string): Promise<User | null> {
    return users.find(u => u.id === id) || null;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  private omitPassword(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}