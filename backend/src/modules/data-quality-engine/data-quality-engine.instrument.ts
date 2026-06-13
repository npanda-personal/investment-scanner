/**
 * Instrument normalization adapter.
 *
 * Upstream instruments arrive as loosely-typed `any` objects whose fields are
 * sometimes snake_case (DB rows) and sometimes camelCase (mapped DTOs). The
 * service previously read every field as `raw.snake ?? raw.camel`, dozens of
 * times. This adapter does that coercion once, at the boundary, and hands the
 * rest of the engine a single typed shape.
 */
import { optionalText } from './data-quality-engine.utils';

export interface NormalizedInstrument {
  id: string;
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  currency: string | null;
  region: string | null;
  assetType: string | null;
  catalogSource: string | null;
  trustedBaselineResidualState: string | null;
  requiredHistoryStatus: string | null;
  listingDateStatus: string | null;
  trustedBaselineBlockerCodes: string[];
  /** The original object, retained for predicates that need raw fields. */
  raw: any;
}

function pick(raw: any, ...keys: string[]): unknown {
  for (const key of keys) {
    if (raw?.[key] !== undefined && raw?.[key] !== null) return raw[key];
  }
  return undefined;
}

export function normalizeInstrument(raw: any): NormalizedInstrument {
  const blockerCodesRaw = pick(raw, 'trusted_baseline_blocker_codes', 'trustedBaselineBlockerCodes');
  const trustedBaselineBlockerCodes = Array.isArray(blockerCodesRaw)
    ? blockerCodesRaw.map((value: unknown) => String(value))
    : [];

  return {
    id: String(raw?.id ?? ''),
    symbol: String(raw?.symbol ?? ''),
    companyName: optionalText(pick(raw, 'company_name', 'companyName', 'name')),
    sector: optionalText(raw?.sector),
    industry: optionalText(raw?.industry),
    country: optionalText(raw?.country),
    currency: optionalText(raw?.currency),
    region: optionalText(raw?.region),
    assetType: optionalText(pick(raw, 'asset_type', 'assetType')),
    catalogSource: optionalText(pick(raw, 'catalog_source', 'catalogSource')),
    trustedBaselineResidualState:
      optionalText(pick(raw, 'trusted_baseline_residual_state', 'trustedBaselineResidualState'))?.toUpperCase() ?? null,
    requiredHistoryStatus:
      optionalText(pick(raw, 'required_history_status', 'requiredHistoryStatus'))?.toUpperCase() ?? null,
    listingDateStatus:
      optionalText(pick(raw, 'listing_date_status', 'listingDateStatus'))?.toUpperCase() ?? null,
    trustedBaselineBlockerCodes,
    raw,
  };
}
