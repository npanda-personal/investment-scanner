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
  /**
   * One-line, plain-English explanation of what the setup matches — surfaced as a tab tooltip so
   * users can tell the sub-tabs apart. Research-support wording (candidate / signal quality), never
   * advice. Should describe the evidence the setup screens for, matching the backend SETUP_DEFS.
   */
  description: string;
}

export const BULLISH_SETUPS: ScreenerSetupOption[] = [
  {
    code: 'TREND_MOMENTUM', label: 'Trend Momentum',
    description: 'Uptrend that is also accelerating: price above its 50-day average (or a rising 50/200 structure) AND positive 1–6 month momentum. Trend leaders, not names merely drifting up.',
  },
  {
    code: 'BREAKOUT', label: 'Breakout',
    description: 'Pushing into new high ground — near 52-week highs or clearing resistance on confirmed volume.',
  },
  {
    code: 'PULLBACK', label: 'Pullback / Oversold',
    description: 'Bullish names bouncing from an oversold dip (RSI turning up, lower-Bollinger reclaim) — a pause within an uptrend rather than a fresh high.',
  },
  {
    code: 'RELATIVE_STRENGTH', label: 'Relative Strength',
    description: 'Outperforming sector and market peers on a relative basis.',
  },
  {
    code: 'QUALITY', label: 'Quality',
    description: 'Fundamentally sound: healthy net margins, or an attractive valuation versus peers / its own history.',
  },
  {
    code: 'GROWTH', label: 'Growth',
    description: 'Improving fundamentals — year-over-year growth in revenue, EPS, or margins.',
  },
  {
    code: 'OVEREXTENDED', label: 'Overextended',
    description: 'Bullish but stretched — overbought RSI, a parabolic run-up, or far above the 50-day average. A caution lens on a long bias, not an entry signal.',
  },
  {
    code: 'SMART_MONEY_ACCUMULATION', label: 'Smart-Money Accumulation',
    description: 'Delivery / institutional accumulation flagged by the smart-money signal.',
  },
  {
    code: 'SECTOR_LEADERSHIP', label: 'Sector Leadership',
    description: 'Belongs to a sector that is currently leading or improving in relative strength.',
  },
];

export const BEARISH_SETUPS: ScreenerSetupOption[] = [
  {
    code: 'TREND_BEARISH', label: 'Trend Bearish',
    description: 'Downtrend that is also losing momentum: price below its 50-day average (or a bearish MACD cross) AND negative 1–3 month momentum. Weakening names, not a single down day.',
  },
  {
    code: 'BREAKDOWN', label: 'Breakdown',
    description: 'Breaking down on heavy selling volume, or failing a prior breakout.',
  },
  {
    code: 'OVERBOUGHT_REVERSAL', label: 'Overbought Reversal',
    description: 'Rolling over from an overbought extreme — a momentum reversal off the highs.',
  },
  {
    code: 'RELATIVE_WEAKNESS', label: 'Relative Weakness',
    description: 'Underperforming sector and market peers on a relative basis.',
  },
  {
    code: 'WEAK_FUNDAMENTALS', label: 'Weak Fundamentals',
    description: 'Negative earnings or margins, or a valuation stretched versus its own history.',
  },
  {
    code: 'EARNINGS_DECLINE', label: 'Earnings Decline',
    description: 'Deteriorating fundamentals — year-over-year decline in revenue, EPS, or margins.',
  },
  {
    code: 'SMART_MONEY_DISTRIBUTION', label: 'Smart-Money Distribution',
    description: 'Delivery / institutional distribution flagged by the smart-money signal.',
  },
];

/** Tooltip copy for the "All Bullish" / "All Bearish" tab (the unfiltered direction list). */
export const ALL_DIRECTION_DESCRIPTION: Record<'BULLISH' | 'BEARISH', string> = {
  BULLISH: 'Every bullish candidate — the full list before narrowing to a specific setup.',
  BEARISH: 'Every bearish candidate — the full list before narrowing to a specific setup.',
};

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
