import type {
  CreateHoldingRequest,
  CreatePortfolioRequest,
  CreateTransactionRequest,
  PortfolioTransactionType,
  UpdateHoldingRequest,
  UpdatePortfolioRequest,
} from './portfolio-management.types';

const TRANSACTION_TYPES: PortfolioTransactionType[] = ['BUY', 'SELL', 'CASH_IN', 'CASH_OUT'];

export function validatePortfolioInput(input: CreatePortfolioRequest | UpdatePortfolioRequest, partial = false): string[] {
  const errors: string[] = [];
  if (!partial || input.name !== undefined) {
    if (!input.name || input.name.trim().length === 0) errors.push('portfolio name is required');
  }
  if (!partial || input.baseCurrency !== undefined) {
    if (!input.baseCurrency || input.baseCurrency.trim().length === 0) errors.push('baseCurrency is required');
  }
  return errors;
}

export function validateHoldingInput(input: CreateHoldingRequest | UpdateHoldingRequest, partial = false): string[] {
  const errors: string[] = [];
  if (!partial || 'instrumentId' in input) {
    if (!('instrumentId' in input) || !input.instrumentId || input.instrumentId.trim().length === 0) errors.push('instrumentId is required');
  }
  if (!partial || input.quantity !== undefined) {
    if (typeof input.quantity !== 'number' || !Number.isFinite(input.quantity) || input.quantity <= 0) errors.push('quantity must be greater than 0');
  }
  if (!partial || input.averageCost !== undefined) {
    if (typeof input.averageCost !== 'number' || !Number.isFinite(input.averageCost) || input.averageCost < 0) errors.push('averageCost must be greater than or equal to 0');
  }
  if (!partial || input.currency !== undefined) {
    if (!input.currency || input.currency.trim().length === 0) errors.push('currency is required');
  }
  return errors;
}

export function validateTransactionInput(input: CreateTransactionRequest): string[] {
  const errors: string[] = [];
  if (!TRANSACTION_TYPES.includes(input.type)) errors.push('transaction type is invalid');
  if (!input.currency || input.currency.trim().length === 0) errors.push('currency is required');
  if (!input.transactionDate || Number.isNaN(new Date(input.transactionDate).getTime())) errors.push('transactionDate must be a valid date');

  if (input.type === 'BUY' || input.type === 'SELL') {
    if (!input.instrumentId || input.instrumentId.trim().length === 0) errors.push('instrumentId is required for BUY and SELL');
    if (typeof input.quantity !== 'number' || !Number.isFinite(input.quantity) || input.quantity <= 0) errors.push('quantity must be greater than 0 for BUY and SELL');
    if (typeof input.price !== 'number' || !Number.isFinite(input.price) || input.price < 0) errors.push('price must be greater than or equal to 0 for BUY and SELL');
  }

  if (input.type === 'CASH_IN' || input.type === 'CASH_OUT') {
    if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) errors.push('amount must be greater than 0 for CASH transactions');
  }

  return errors;
}

export function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}

