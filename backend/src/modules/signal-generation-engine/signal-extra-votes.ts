/**
 * signal-extra-votes.ts
 *
 * Additional TECHNICAL confirmation votes that the composite previously ignored even
 * though the indicators were already implemented (signal-indicators.ts): a MACD
 * signal-line cross and Bollinger %B band touches.  Kept here (not inlined into the
 * near-cap signal-scoring.ts) as a small pure unit.
 *
 * Decorrelation note (v4): these deliberately reuse EXISTING factor families —
 * MACD → MOMENTUM, Bollinger → MEAN_REVERSION / OVEREXTENSION — so they REINFORCE the
 * strength-weighted category score (more evidence ⇒ stronger lean) without inflating the
 * v4 family count (which is a Set).  They are confirmation, not independent breadth, and
 * the SG-9 breadth gate still requires a second analysis category for a directional call.
 */
import type { SignalItem, SignalPricePoint } from './signal-generation-engine.types';
import { macd, bollingerPercentB } from './signal-indicators';

export interface ExtraVotes {
  signals: SignalItem[];
  negativeSignals: SignalItem[];
}

const tech = (code: string, label: string): SignalItem => ({ code, label, category: 'TECHNICAL' });

/**
 * MACD signal-line cross + Bollinger %B band-touch votes over a newest-first price window.
 * Pure; returns empty lists when there is insufficient history (indicators return null).
 *
 * MACD emits ONLY on a fresh cross (histogram sign flip vs the prior bar) — a discrete,
 * informative event — rather than on the raw histogram sign every bar, to avoid spamming a
 * persistent-trend vote.  Bollinger emits on a band touch (mean-reversion setup).
 */
export function extraTechnicalVotes(prices: SignalPricePoint[]): ExtraVotes {
  const signals: SignalItem[] = [];
  const negativeSignals: SignalItem[] = [];

  const cur = macd(prices);
  const prev = macd(prices.slice(1));
  if (cur && prev) {
    if (prev.histogram <= 0 && cur.histogram > 0) {
      signals.push(tech('MACD_BULLISH_CROSS', 'MACD crossed above its signal line (bullish momentum cross)'));
    } else if (prev.histogram >= 0 && cur.histogram < 0) {
      negativeSignals.push(tech('MACD_BEARISH_CROSS', 'MACD crossed below its signal line (bearish momentum cross)'));
    }
  }

  const pctB = bollingerPercentB(prices);
  if (pctB !== null) {
    if (pctB <= 0.05) {
      signals.push(tech('BOLLINGER_OVERSOLD', 'price is at/below the lower Bollinger band (oversold — mean-reversion setup)'));
    } else if (pctB >= 0.95) {
      negativeSignals.push(tech('BOLLINGER_OVERBOUGHT', 'price is at/above the upper Bollinger band (overbought — stretched)'));
    }
  }

  return { signals, negativeSignals };
}
