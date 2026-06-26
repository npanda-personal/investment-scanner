import type { ScreenerSetup, ScreenerSignalDirection } from '../../types';

/**
 * Frontend mirror of the backend setup taxonomy (backend signal-setups.ts SETUP_DEFS).
 * Drives the Screener's setup sub-tabs and the per-row Setup chip labels. Codes and grouping
 * MUST stay in lockstep with the backend — the backend remains the validation authority
 * (rejects unknown setup codes with 400).
 */
export interface ScreenerSetupOption {
  code: ScreenerSetup;
  label: string;
}

export const BULLISH_SETUPS: ScreenerSetupOption[] = [
  { code: 'TREND_MOMENTUM', label: 'Trend Momentum' },
  { code: 'BREAKOUT', label: 'Breakout' },
  { code: 'PULLBACK', label: 'Pullback / Oversold' },
  { code: 'RELATIVE_STRENGTH', label: 'Relative Strength' },
  { code: 'QUALITY', label: 'Quality' },
  { code: 'GROWTH', label: 'Growth' },
  { code: 'OVEREXTENDED', label: 'Overextended' },
  { code: 'SMART_MONEY_ACCUMULATION', label: 'Smart-Money Accumulation' },
  { code: 'SECTOR_LEADERSHIP', label: 'Sector Leadership' },
];

export const BEARISH_SETUPS: ScreenerSetupOption[] = [
  { code: 'TREND_BEARISH', label: 'Trend Bearish' },
  { code: 'BREAKDOWN', label: 'Breakdown' },
  { code: 'OVERBOUGHT_REVERSAL', label: 'Overbought Reversal' },
  { code: 'RELATIVE_WEAKNESS', label: 'Relative Weakness' },
  { code: 'WEAK_FUNDAMENTALS', label: 'Weak Fundamentals' },
  { code: 'EARNINGS_DECLINE', label: 'Earnings Decline' },
  { code: 'SMART_MONEY_DISTRIBUTION', label: 'Smart-Money Distribution' },
];

/** Setup options available for a given direction selection ('ALL' shows no setup sub-tabs). */
export function setupsForDirection(direction: ScreenerDirectionTab): ScreenerSetupOption[] {
  if (direction === 'BULLISH') return BULLISH_SETUPS;
  if (direction === 'BEARISH') return BEARISH_SETUPS;
  return [];
}

/** Short label for a setup code (used by the per-row Setup chips). */
export const SETUP_LABEL: Record<string, string> = [...BULLISH_SETUPS, ...BEARISH_SETUPS].reduce(
  (acc, o) => {
    acc[o.code] = o.label;
    return acc;
  },
  {} as Record<string, string>,
);

/** The Screener direction selector: 'ALL' plus the two persisted signal directions used as tabs. */
export type ScreenerDirectionTab = 'ALL' | Extract<ScreenerSignalDirection, 'BULLISH' | 'BEARISH'>;
