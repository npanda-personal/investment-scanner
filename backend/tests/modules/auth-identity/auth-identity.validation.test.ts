/// <reference types="@types/jest" />
import { validateLogin, validateSignup } from '../../../src/modules/auth-identity';

describe('auth identity validation', () => {
  it('validates email and password length', () => {
    expect(validateLogin({ email: 'bad', password: 'short' })).toEqual([
      'valid email is required',
      'password must be at least 8 characters',
    ]);
    expect(validateSignup({ email: 'user@example.com', password: 'password123', name: 'User' })).toEqual([]);
  });
});
