import type { LoginRequest, SignupRequest, UpdateProfileRequest } from './auth-identity.types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function validateSignup(input: SignupRequest): string[] {
  const errors = validateLogin(input);
  if (input.name !== undefined && input.name !== null && input.name.trim().length > 120) errors.push('name must be 120 characters or fewer');
  return errors;
}

export function validateLogin(input: LoginRequest): string[] {
  const errors: string[] = [];
  if (!input.email || !EMAIL_RE.test(String(input.email).trim())) errors.push('valid email is required');
  if (!input.password || String(input.password).length < MIN_PASSWORD_LENGTH) errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  return errors;
}

export function validateProfile(input: UpdateProfileRequest): string[] {
  const errors: string[] = [];
  if (input.name !== undefined && input.name !== null && input.name.trim().length > 120) errors.push('name must be 120 characters or fewer');
  return errors;
}

export function bearerToken(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
