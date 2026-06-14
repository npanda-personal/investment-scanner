/**
 * signal-peer-aggregates.ts
 *
 * SG-4: derive region-scoped peer context (relative valuation + relative strength) from
 * the in-memory batch context, so the DEFAULT (LIGHTWEIGHT batch) generation path gets
 * the same peer inputs the single-symbol FULL path gets from the Stock Research Workbench.
 *
 * Before this, batch generation left peerAveragePe / peerAverageYield / relativeToPeers
 * null, so OUTPERFORMING_PEERS / PE_BELOW_PEERS / YIELD_ABOVE_PEERS never fired at scale —
 * mass-generated signals were materially weaker than a single-symbol re-run of the same
 * stock, and the two paths disagreed.  This recovers parity with no extra DB calls.
 *
 * Peers = other instruments of the SAME sector already loaded in the batch context.  The
 * batch is region/asset-scoped upstream, so peers stay within the cohort (no IN/US/EU
 * cross-contamination — consistent with SG-1 region isolation).
 *
 * Pure: imports only the shared math helper; structural context type (no dependency on
 * the service's god-file).
 */
import { average } from './signal-math';

/** Structural view of the batch context this module needs (avoids importing from the service). */
export interface PeerBatchContextLike {
  instrumentsById: Map<string, any>;
  fundamentalsByInstrumentId: Map<string, any>;
  priceWindowsByInstrumentId: Map<string, any[]>;
}

export interface PeerContext {
  peerAveragePe: number | null;
  peerAverageYield: number | null;
  relativeToPeers: number | null;
}

const EMPTY_PEER_CONTEXT: PeerContext = { peerAveragePe: null, peerAverageYield: null, relativeToPeers: null };

/** Trailing peer-relative window for relative strength (≈ 3 months of trading days). */
const RELATIVE_STRENGTH_OFFSET = 63;

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sectorOf(instrument: any): string | null {
  return instrument?.sector ?? instrument?.sector_name ?? null;
}

/** N-day return from a newest-first price window (raw bulk rows carry adjusted_close). */
function windowReturn(window: any[] | undefined, offset: number): number | null {
  if (!window || window.length <= offset) return null;
  const latest = num(window[0]?.adjusted_close ?? window[0]?.close);
  const prior = num(window[offset]?.adjusted_close ?? window[offset]?.close);
  if (latest === null || prior === null || prior <= 0) return null;
  return (latest - prior) / prior;
}

export function peerAggregates(ctx: PeerBatchContextLike | undefined, instrument: any): PeerContext {
  if (!ctx || !instrument) return EMPTY_PEER_CONTEXT;
  const sector = sectorOf(instrument);
  if (!sector) return EMPTY_PEER_CONTEXT;

  const selfId = instrument.id;
  const peerPes: number[] = [];
  const peerYields: number[] = [];
  const peerReturns: number[] = [];

  for (const peer of ctx.instrumentsById.values()) {
    if (!peer || peer.id === selfId || sectorOf(peer) !== sector) continue;
    const fund = ctx.fundamentalsByInstrumentId.get(peer.id)?.records?.[0];
    const pe = num(fund?.pe_ratio);
    if (pe !== null && pe > 0) peerPes.push(pe);
    const dy = num(fund?.dividend_yield);
    if (dy !== null) peerYields.push(dy);
    const ret = windowReturn(ctx.priceWindowsByInstrumentId.get(peer.id), RELATIVE_STRENGTH_OFFSET);
    if (ret !== null) peerReturns.push(ret);
  }

  const peerAverageReturn = average(peerReturns);
  const selfReturn = windowReturn(ctx.priceWindowsByInstrumentId.get(selfId), RELATIVE_STRENGTH_OFFSET);
  const relativeToPeers = selfReturn !== null && peerAverageReturn !== null ? selfReturn - peerAverageReturn : null;

  return {
    peerAveragePe: average(peerPes),
    peerAverageYield: average(peerYields),
    relativeToPeers,
  };
}
