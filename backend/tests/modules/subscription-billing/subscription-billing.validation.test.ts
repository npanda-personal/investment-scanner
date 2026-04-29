/// <reference types="@types/jest" />
import { requireAdmin, validateChangePlan } from '../../../src/modules/subscription-billing';

describe('subscription billing validation', () => {
  it('validates plan and status codes', () => {
    expect(validateChangePlan({ planCode: 'PRO' })).toEqual([]);
    expect(validateChangePlan({ planCode: 'BAD' as any, status: 'NOPE' as any })).toEqual(['planCode is invalid', 'status is invalid']);
  });

  it('blocks admin actions without configured key', () => {
    const original = process.env.ADMIN_API_KEY;
    delete process.env.ADMIN_API_KEY;
    expect(() => requireAdmin({})).toThrow('Admin API key is not configured');
    process.env.ADMIN_API_KEY = original;
  });

  it('blocks admin actions when key is wrong', () => {
    const original = process.env.ADMIN_API_KEY;
    process.env.ADMIN_API_KEY = 'secret';
    expect(() => requireAdmin({ 'x-admin-key': 'wrong' })).toThrow('Admin access required');
    process.env.ADMIN_API_KEY = original;
  });
});
