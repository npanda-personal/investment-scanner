import type { HistoricalPrice, ValidationResult } from '../types/market-data.types';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

export const validateHistoricalPrice = (price: HistoricalPrice): string[] => {
  const errors: string[] = [];

  if (!price.symbol || typeof price.symbol !== 'string') {
    errors.push('symbol is required');
  }
  if (!isValidDate(price.date)) {
    errors.push('date must be a valid Date');
  }
  if (!isFiniteNumber(price.open)) {
    errors.push('open must be a finite number');
  }
  if (!isFiniteNumber(price.high)) {
    errors.push('high must be a finite number');
  }
  if (!isFiniteNumber(price.low)) {
    errors.push('low must be a finite number');
  }
  if (!isFiniteNumber(price.close)) {
    errors.push('close must be a finite number');
  }
  if (price.volume !== undefined && !isFiniteNumber(price.volume)) {
    errors.push('volume must be a finite number when provided');
  }
  if (isFiniteNumber(price.low) && isFiniteNumber(price.high) && price.low > price.high) {
    errors.push('low cannot be greater than high');
  }

  return errors;
};

export const partitionHistoricalPrices = (
  prices: HistoricalPrice[]
): ValidationResult<HistoricalPrice> => {
  return prices.reduce<ValidationResult<HistoricalPrice>>(
    (result, price) => {
      const errors = validateHistoricalPrice(price);
      if (errors.length > 0) {
        result.invalid.push({ item: price, errors });
      } else {
        result.valid.push(price);
      }
      return result;
    },
    { valid: [], invalid: [] }
  );
};

export const validateRequiredString = (value: unknown, fieldName: string): string | null => {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return `${fieldName} is required`;
  }

  return null;
};
