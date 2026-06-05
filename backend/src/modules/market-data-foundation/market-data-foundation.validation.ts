import type { HistoricalPrice, ValidationResult } from './market-data-foundation.types';
import type { V1CreateInstrumentRequest } from './market-data-foundation.types';

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
  if (price.volume !== undefined && isFiniteNumber(price.volume) && price.volume < 0) {
    errors.push('volume cannot be negative');
  }
  for (const field of ['open', 'high', 'low', 'close'] as const) {
    if (isFiniteNumber(price[field]) && price[field] <= 0) {
      errors.push(`${field} must be greater than 0`);
    }
  }
  if (isFiniteNumber(price.low) && isFiniteNumber(price.high) && price.low > price.high) {
    errors.push('low cannot be greater than high');
  }
  if (
    isFiniteNumber(price.open) &&
    isFiniteNumber(price.low) &&
    isFiniteNumber(price.high) &&
    (price.open < price.low || price.open > price.high)
  ) {
    errors.push('open must be within low/high range');
  }
  if (
    isFiniteNumber(price.close) &&
    isFiniteNumber(price.low) &&
    isFiniteNumber(price.high) &&
    (price.close < price.low || price.close > price.high)
  ) {
    errors.push('close must be within low/high range');
  }

  return errors;
};

export const partitionHistoricalPrices = (
  prices: HistoricalPrice[],
  spikeThreshold = defaultSpikeRejectionThreshold()
): ValidationResult<HistoricalPrice> => {
  const result: ValidationResult<HistoricalPrice> = { valid: [], invalid: [] };
  let duplicateProviderRowsSkipped = 0;

  // First pass: validation and grouping by symbol:date
  const validByDate = new Map<string, HistoricalPrice>();
  const allInvalid: { item: HistoricalPrice; errors: string[] }[] = [];

  for (const price of prices) {
    const errors = validateHistoricalPrice(price);
    if (errors.length > 0) {
      allInvalid.push({ item: price, errors });
      continue;
    }

    // Normalize date to UTC midnight for grouping
    const normalizedDate = new Date(price.date);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    const key = `${price.symbol}:${normalizedDate.toISOString()}`;

    const existing = validByDate.get(key);
    if (!existing) {
      validByDate.set(key, price);
    } else {
      duplicateProviderRowsSkipped++;
      // Determine the best row. We prefer rows with valid OHLCV and adjustedClose.
      const existingScore = (isFiniteNumber(existing.adjustedClose) ? 1 : 0) + (isFiniteNumber(existing.volume) ? 1 : 0);
      const newScore = (isFiniteNumber(price.adjustedClose) ? 1 : 0) + (isFiniteNumber(price.volume) ? 1 : 0);
      
      if (newScore > existingScore) {
        validByDate.set(key, price);
        allInvalid.push({ item: existing, errors: ['duplicate price bar in batch'] });
      } else if (newScore === existingScore) {
        // If equal, prefer the later provider timestamp if they differ in time
        if (price.date.getTime() > existing.date.getTime()) {
          validByDate.set(key, price);
          allInvalid.push({ item: existing, errors: ['duplicate price bar in batch'] });
        } else {
          allInvalid.push({ item: price, errors: ['duplicate price bar in batch'] });
        }
      } else {
        allInvalid.push({ item: price, errors: ['duplicate price bar in batch'] });
      }
    }
  }

  // Second pass: sort valid rows and check for price spikes
  const sorted = Array.from(validByDate.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  const previousValidCloseBySymbol = new Map<string, number>();

  for (const price of sorted) {
    const previousClose = previousValidCloseBySymbol.get(price.symbol);
    if (
      spikeThreshold > 0 &&
      previousClose !== undefined &&
      previousClose > 0 &&
      Math.abs(price.close - previousClose) / previousClose > spikeThreshold
    ) {
      allInvalid.push({
        item: price,
        errors: [`abnormal price spike exceeds threshold ${spikeThreshold}`],
      });
    } else {
      result.valid.push(price);
      previousValidCloseBySymbol.set(price.symbol, price.close);
    }
  }

  result.invalid = allInvalid;
  (result as any).duplicateProviderRowsSkipped = duplicateProviderRowsSkipped;
  return result;
};

// Spike rejection is DEFAULT ON at 50% to guard against bhavcopy decimal errors that
// would otherwise poison adjustedClose recomputes for all prior bars.
//
// Corporate-action days (splits, bonuses) can produce raw moves well above 50% on the
// unadjusted series, but those are handled by the corporate-actions back-adjustment
// pipeline which adjusts prior bars rather than the raw price row itself. This guard
// operates on the raw close-to-close ratio, so a legitimately recorded raw price that
// exceeds the threshold is flagged/rejected here. The threshold is deliberately set at
// 50% — well above NSE/BSE circuit limits (5/10/20%) — so normal trading-day moves
// are never affected. Use MARKET_DATA_SPIKE_THRESHOLD (fractional, e.g. "1.0" = 100%)
// to loosen or use MARKET_DATA_REJECT_PRICE_SPIKES=0 to disable entirely.
const defaultSpikeRejectionThreshold = (): number => {
  // Explicit opt-out: MARKET_DATA_REJECT_PRICE_SPIKES=0|false|no|off disables the guard.
  if (/^(0|false|no|off)$/i.test(String(process.env.MARKET_DATA_REJECT_PRICE_SPIKES ?? ''))) {
    return 0;
  }
  // Allow the threshold to be overridden (tighter or looser) via env without disabling.
  const envThreshold = process.env.MARKET_DATA_SPIKE_THRESHOLD;
  if (envThreshold !== undefined) {
    const parsed = Number(envThreshold);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0.5;
  }
  return 0.5;
};

export const validateRequiredString = (value: unknown, fieldName: string): string | null => {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return `${fieldName} is required`;
  }

  return null;
};

export const validateInstrumentInput = (
  value: Partial<V1CreateInstrumentRequest>
): string[] => {
  const errors = [
    validateRequiredString(value.symbol, 'symbol'),
    validateRequiredString(value.exchange, 'exchange'),
    validateRequiredString(value.currency, 'currency'),
    validateRequiredString(value.asset_type, 'asset_type'),
  ].filter((error): error is string => Boolean(error));

  if (!value.company_name || typeof value.company_name !== 'string' || value.company_name.trim().length === 0) {
    errors.push('company_name is required');
  }

  return errors;
};
