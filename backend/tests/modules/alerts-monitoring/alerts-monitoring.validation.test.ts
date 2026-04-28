/// <reference types="@types/jest" />
import { validateAlertRuleInput } from '../../../src/modules/alerts-monitoring';

describe('alerts monitoring validation', () => {
  it('validates required stock price rule fields', () => {
    expect(validateAlertRuleInput({
      name: '',
      type: 'PRICE_ABOVE',
      scope: 'STOCK',
      condition: { threshold: -1 },
    } as any)).toEqual(expect.arrayContaining([
      'alert name is required',
      'stock-scoped rules require instrumentId',
      'price threshold must be positive',
    ]));
  });

  it('validates scope/type pairing', () => {
    expect(validateAlertRuleInput({
      name: 'Bad',
      type: 'PRICE_ABOVE',
      scope: 'PORTFOLIO',
      portfolioId: 'p1',
      condition: { threshold: 10 },
    })).toContain('type does not match PORTFOLIO scope');
  });
});
