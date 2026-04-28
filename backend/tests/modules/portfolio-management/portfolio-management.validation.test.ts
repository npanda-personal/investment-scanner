/// <reference types="@types/jest" />
import {
  validateHoldingInput,
  validatePortfolioInput,
  validateTransactionInput,
} from '../../../src/modules/portfolio-management/portfolio-management.validation';

describe('portfolio management validation', () => {
  it('requires portfolio name and base currency', () => {
    expect(validatePortfolioInput({ name: '', baseCurrency: '' })).toEqual([
      'portfolio name is required',
      'baseCurrency is required',
    ]);
  });

  it('validates holdings', () => {
    expect(validateHoldingInput({ instrumentId: '', quantity: 0, averageCost: -1, currency: '' })).toEqual([
      'instrumentId is required',
      'quantity must be greater than 0',
      'averageCost must be greater than or equal to 0',
      'currency is required',
    ]);
  });

  it('validates transaction requirements by type', () => {
    expect(validateTransactionInput({ type: 'BUY', currency: 'USD', transactionDate: '2026-04-28' })).toEqual([
      'instrumentId is required for BUY and SELL',
      'quantity must be greater than 0 for BUY and SELL',
      'price must be greater than or equal to 0 for BUY and SELL',
    ]);

    expect(validateTransactionInput({ type: 'CASH_IN', currency: 'USD', transactionDate: '2026-04-28' })).toEqual([
      'amount must be greater than 0 for CASH transactions',
    ]);
  });
});
