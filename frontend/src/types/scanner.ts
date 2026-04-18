export type LogicalOperator = 'and' | 'or' | 'not';

export interface PriceCondition {
  type: 'price';
  field: 'open' | 'high' | 'low' | 'close' | 'volume';
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: number;
}

export interface IndicatorCondition {
  type: 'indicator';
  name: 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BB' | 'STOCH' | 'ADX' | 'ATR' | 'OBV' | 'WILLR' | 'CCI' | 'ROC';
  parameters: Record<string, any>;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: number;
}

export interface ChangeCondition {
  type: 'change';
  period: '1d' | '1w' | '1m';
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: number;
}

export interface FundamentalCondition {
  type: 'fundamental';
  field: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  value: number;
}

export type PrimitiveCondition = PriceCondition | IndicatorCondition | ChangeCondition | FundamentalCondition;

export interface LogicalCondition {
  operator: LogicalOperator;
  conditions: ConditionNode[];
}

export type ConditionNode = PrimitiveCondition | LogicalCondition;

export function isLogicalCondition(node: ConditionNode): node is LogicalCondition {
  return 'operator' in node && 'conditions' in node;
}