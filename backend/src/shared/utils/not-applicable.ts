/**
 * not-applicable.ts
 *
 * Canonical helper for endpoints whose data source is region-scoped (India-only,
 * crypto-only, etc.) and therefore cannot produce a meaningful response for other
 * regions.  Returns a 200 JSON object that the frontend can detect via
 * `notApplicable === true` and render an appropriate empty state — never a 4xx.
 *
 * Matches the inline idiom established in signal-generation-engine.controller.ts
 * (`{ ..., notApplicable: true }`).
 *
 * @param reason   Human-readable explanation surfaced in the UI / logs.
 * @param extra    Optional additional fields to merge into the payload (e.g. the
 *                 empty array key the client already expects: `{ rows: [] }`).
 */
export function notApplicablePayload(
  reason: string,
  extra: Record<string, unknown> = {},
): { notApplicable: true; reason: string; data: never[]; [key: string]: unknown } {
  return { notApplicable: true, reason, data: [], ...extra };
}
