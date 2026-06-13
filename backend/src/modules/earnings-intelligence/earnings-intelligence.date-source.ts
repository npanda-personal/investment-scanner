/**
 * Region-pluggable earnings-date ingestion.
 *
 * Two providers populate `Fundamental.officialResultDate` today — the NSE
 * board-meetings calendar (India) and SEC EDGAR filing dates (US) — but they had
 * no shared contract: each was reached through its own bespoke call path, so
 * adding a third market meant wiring a third special case end to end.
 *
 * This module defines one `EarningsDateSource` interface and a region→source
 * registry.  Callers resolve a provider by region and get a normalised summary
 * back, regardless of which market it is.  Adding EU later is a `registerEarnings
 * DateSource({ region: 'EU', ... })` call — no controller/service edits.
 *
 * The concrete adapters wrap the existing `ingestNseBoardMeetings` function and
 * `UsEarningsDateAdapter` so their original exports (used by the CLI scripts)
 * keep working unchanged.
 */
import { ingestNseBoardMeetings } from './earnings-intelligence.board-meetings-ingest';
import { UsEarningsDateAdapter } from './earnings-intelligence.us-sec-source';
import { normalizeRegionCode } from './earnings-intelligence.region-config';

export type EarningsDateIngestStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'BLOCKED' | 'SKIPPED';

export interface EarningsDateIngestOptions {
  /** Restrict to these symbols (uppercase). Omit for the region's full universe. */
  symbols?: string[];
  /** Window start, provider-native format. */
  fromDate?: string;
  /** Window end, provider-native format. */
  toDate?: string;
  /** Parse + match but do not write. */
  dryRun?: boolean;
  /** Cap the number of instruments processed (providers that support it). */
  limit?: number;
}

export interface EarningsDateIngestSummary {
  region: string;
  /** Provider identifier, e.g. 'NSE_BOARD_MEETINGS' or 'SEC_EDGAR_FILING_DATE'. */
  source: string;
  status: EarningsDateIngestStatus;
  /** Records the provider considered. */
  processed: number;
  /** Fundamental rows whose officialResultDate was newly written. */
  updated: number;
  /** Rows already carrying the same date (no-op). */
  alreadySet: number;
  /** Records that could not be matched to a fundamental row. */
  noMatch: number;
  warnings: string[];
  /** Top-level error when the provider aborted early (e.g. bot-block). */
  error?: string;
  /** The provider's native result, for callers that want full detail. */
  raw?: unknown;
}

export interface EarningsDateSource {
  region: string;
  label: string;
  ingest(options?: EarningsDateIngestOptions): Promise<EarningsDateIngestSummary>;
}

// ── Registry ────────────────────────────────────────────────────────────────

const REGISTRY = new Map<string, EarningsDateSource>();

export function registerEarningsDateSource(source: EarningsDateSource): void {
  REGISTRY.set(normalizeRegionCode(source.region), source);
}

export function resolveEarningsDateSource(region: string | null | undefined): EarningsDateSource | null {
  return REGISTRY.get(normalizeRegionCode(region)) ?? null;
}

export function supportedEarningsDateSourceRegions(): string[] {
  return [...REGISTRY.keys()];
}

// ── Built-in adapters ─────────────────────────────────────────────────────────

/** India — NSE corporate board-meetings calendar. */
const nseBoardMeetingsSource: EarningsDateSource = {
  region: 'IN',
  label: 'NSE board-meetings calendar',
  async ingest(options: EarningsDateIngestOptions = {}): Promise<EarningsDateIngestSummary> {
    const result = await ingestNseBoardMeetings({
      fromDate: options.fromDate,
      toDate: options.toDate,
      dryRun: options.dryRun,
      symbol: options.symbols?.[0],
    });
    return {
      region: 'IN',
      source: 'NSE_BOARD_MEETINGS',
      status: result.status,
      processed: result.parsedMeetings,
      updated: result.written,
      alreadySet: result.alreadySet,
      noMatch: result.noMatch + result.noFundamental,
      warnings: result.warnings,
      error: result.error,
      raw: result,
    };
  },
};

/** United States — SEC EDGAR filing dates. */
const usSecFilingSource: EarningsDateSource = {
  region: 'US',
  label: 'SEC EDGAR filing dates',
  async ingest(options: EarningsDateIngestOptions = {}): Promise<EarningsDateIngestSummary> {
    const adapter = new UsEarningsDateAdapter();
    const summary = await adapter.ingest({ symbols: options.symbols, limit: options.limit });
    const status: EarningsDateIngestStatus =
      summary.processed === 0
        ? 'SKIPPED'
        : summary.updated > 0 || summary.alreadySet > 0
          ? 'COMPLETED'
          : 'PARTIAL';
    return {
      region: 'US',
      source: summary.source,
      status,
      processed: summary.processed,
      updated: summary.updated,
      alreadySet: summary.alreadySet,
      noMatch: summary.noCik + summary.noFacts,
      warnings: summary.warnings,
      raw: summary,
    };
  },
};

let _builtInsRegistered = false;

/** Register the built-in IN/US providers. Idempotent; called from the module. */
export function registerBuiltInEarningsDateSources(): void {
  if (_builtInsRegistered) return;
  registerEarningsDateSource(nseBoardMeetingsSource);
  registerEarningsDateSource(usSecFilingSource);
  _builtInsRegistered = true;
}

// Register on import so any consumer of the registry sees the built-ins.
registerBuiltInEarningsDateSources();
