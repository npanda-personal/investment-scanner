export type AlertType =
  | 'PRICE_ABOVE' | 'PRICE_BELOW' | 'DAILY_MOVE_ABOVE' | 'DAILY_MOVE_BELOW'
  | 'SIGNAL_SCORE_ABOVE' | 'SIGNAL_DIRECTION_CHANGED'
  | 'PORTFOLIO_HOLDING_DRAWDOWN' | 'PORTFOLIO_BEARISH_SIGNAL'
  | 'WATCHLIST_SIGNAL_SCORE_ABOVE' | 'WATCHLIST_PRICE_ABOVE' | 'WATCHLIST_PRICE_BELOW';
export type AlertScope = 'STOCK' | 'PORTFOLIO' | 'WATCHLIST';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AlertCondition { threshold?: number; direction?: string }
export interface AlertRule {
  id: string; name: string; type: AlertType; scope: AlertScope;
  instrumentId: string | null; portfolioId: string | null; watchlistId: string | null;
  condition: AlertCondition; enabled: boolean; createdAt: string; updatedAt: string;
}
export interface AlertEvent {
  id: string; alertRuleId: string; type: AlertType; severity: AlertSeverity;
  title: string; message: string; instrumentId: string | null; portfolioId: string | null; watchlistId: string | null;
  metadata: Record<string, unknown>; triggeredAt: string; readAt: string | null; dismissedAt: string | null;
}
export interface CreateAlertRuleInput {
  name: string; type: AlertType; scope: AlertScope; instrumentId?: string | null; portfolioId?: string | null; watchlistId?: string | null; condition: AlertCondition; enabled?: boolean;
}
export interface AlertEvaluationResult {
  evaluated: number; created: number; skippedDuplicates: number; errors: string[]; events: AlertEvent[]; evaluatedAt: string;
}
