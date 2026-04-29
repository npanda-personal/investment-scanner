/// <reference types="@types/jest" />
import { requireString } from '../../../src/modules/ai-investment-copilot';

describe('ai investment copilot validation', () => {
  it('requires non-empty ids', () => {
    expect(() => requireString('', 'instrumentId')).toThrow('instrumentId is required');
    expect(requireString(' abc ', 'instrumentId')).toBe('abc');
  });
});
