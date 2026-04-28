import type { AlertScope, AlertType, CreateAlertRuleRequest, UpdateAlertRuleRequest } from './alerts-monitoring.types';

export const ALERT_TYPES: AlertType[] = [
  'PRICE_ABOVE',
  'PRICE_BELOW',
  'DAILY_MOVE_ABOVE',
  'DAILY_MOVE_BELOW',
  'SIGNAL_SCORE_ABOVE',
  'SIGNAL_DIRECTION_CHANGED',
  'PORTFOLIO_HOLDING_DRAWDOWN',
  'PORTFOLIO_BEARISH_SIGNAL',
  'WATCHLIST_SIGNAL_SCORE_ABOVE',
  'WATCHLIST_PRICE_ABOVE',
  'WATCHLIST_PRICE_BELOW',
];

export const ALERT_SCOPES: AlertScope[] = ['STOCK', 'PORTFOLIO', 'WATCHLIST'];

const STOCK_TYPES = ['PRICE_ABOVE', 'PRICE_BELOW', 'DAILY_MOVE_ABOVE', 'DAILY_MOVE_BELOW', 'SIGNAL_SCORE_ABOVE', 'SIGNAL_DIRECTION_CHANGED'];
const PORTFOLIO_TYPES = ['PORTFOLIO_HOLDING_DRAWDOWN', 'PORTFOLIO_BEARISH_SIGNAL'];
const WATCHLIST_TYPES = ['WATCHLIST_SIGNAL_SCORE_ABOVE', 'WATCHLIST_PRICE_ABOVE', 'WATCHLIST_PRICE_BELOW'];

export function validateAlertRuleInput(input: CreateAlertRuleRequest | UpdateAlertRuleRequest, partial = false): string[] {
  const errors: string[] = [];
  if (!partial || input.name !== undefined) {
    if (!input.name || input.name.trim().length === 0) errors.push('alert name is required');
  }
  if (!partial || input.type !== undefined) {
    if (!input.type || !ALERT_TYPES.includes(input.type)) errors.push('type is required');
  }
  if (!partial || input.scope !== undefined) {
    if (!input.scope || !ALERT_SCOPES.includes(input.scope)) errors.push('scope is required');
  }
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') errors.push('enabled must be boolean');
  const type = input.type;
  const scope = input.scope;
  const condition = input.condition;
  if (!partial || condition !== undefined) {
    if (!condition || typeof condition !== 'object') errors.push('condition is required');
  }
  if (type && scope) {
    if (scope === 'STOCK' && !STOCK_TYPES.includes(type)) errors.push('type does not match STOCK scope');
    if (scope === 'PORTFOLIO' && !PORTFOLIO_TYPES.includes(type)) errors.push('type does not match PORTFOLIO scope');
    if (scope === 'WATCHLIST' && !WATCHLIST_TYPES.includes(type)) errors.push('type does not match WATCHLIST scope');
  }
  if (scope === 'STOCK' && !input.instrumentId) errors.push('stock-scoped rules require instrumentId');
  if (scope === 'PORTFOLIO' && !input.portfolioId) errors.push('portfolio-scoped rules require portfolioId');
  if (scope === 'WATCHLIST' && !input.watchlistId) errors.push('watchlist-scoped rules require watchlistId');
  if (type && condition) {
    const threshold = Number(condition.threshold);
    if (['PRICE_ABOVE', 'PRICE_BELOW', 'WATCHLIST_PRICE_ABOVE', 'WATCHLIST_PRICE_BELOW'].includes(type) && (!Number.isFinite(threshold) || threshold <= 0)) {
      errors.push('price threshold must be positive');
    }
    if (['DAILY_MOVE_ABOVE', 'DAILY_MOVE_BELOW', 'PORTFOLIO_HOLDING_DRAWDOWN'].includes(type) && !Number.isFinite(threshold)) {
      errors.push('percent threshold must be numeric');
    }
    if (['SIGNAL_SCORE_ABOVE', 'WATCHLIST_SIGNAL_SCORE_ABOVE'].includes(type) && (!Number.isFinite(threshold) || threshold < 0 || threshold > 100)) {
      errors.push('signal score threshold must be 0-100');
    }
    if (type === 'SIGNAL_DIRECTION_CHANGED' && condition.direction && !['BULLISH', 'NEUTRAL', 'BEARISH'].includes(condition.direction)) {
      errors.push('direction must be BULLISH, NEUTRAL, or BEARISH');
    }
  }
  return errors;
}

export function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}
