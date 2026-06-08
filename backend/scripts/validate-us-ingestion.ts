/**
 * validate-us-ingestion.ts — READ-ONLY end-to-end validation of the US equity
 * data ingestion. Emits a coverage / integrity / freshness / sanity report and
 * exits non-zero on any HARD-GATE failure (integrity, sanity, freshness).
 *
 * It NEVER writes to the DB and never calls a provider — pure persisted reads.
 *
 * Run (from backend/):
 *   npx ts-node --transpile-only scripts/validate-us-ingestion.ts
 *   US_MIN_PRICED_PCT=85 npx ts-node --transpile-only scripts/validate-us-ingestion.ts
 *
 * Gates:
 *  - INTEGRITY (hard): no cross-region contamination, USD currency, valid exchange.
 *  - SANITY    (hard): OHLC ordering, positive prices, plausible adj-close & actions.
 *  - FRESHNESS (hard): latest US bar within N days of the latest IN bar.
 *  - COVERAGE  (soft): priced / fundamentals / sector — reported, warns under target
 *    (SEC CIK gaps for micro-caps & ETFs are structural, not a correctness failure).
 */
import prisma from '../src/db/prisma';

const ALLOWED_US_EXCHANGES = ['NASDAQ', 'NYSE', 'AMEX', 'ARCA', 'BATS', 'IEX', 'NYSE_ARCA', 'NYSE_AMERICAN', 'US_INDEX', 'NYSEARCA'];
const FRESHNESS_MAX_LAG_DAYS = Number(process.env.US_FRESHNESS_MAX_LAG_DAYS || 5);
const MIN_PRICED_PCT = Number(process.env.US_MIN_PRICED_PCT || 80);

type Row = Record<string, unknown>;
const n = (v: unknown): number => Number((v as any) ?? 0);

async function q<T = Row>(sql: string): Promise<T[]> {
  return prisma.$queryRawUnsafe<T[]>(sql);
}

async function main() {
  const hardFailures: string[] = [];
  const softWarnings: string[] = [];
  const line = (s = '') => console.log(s);

  line('═══════════════════════════════════════════════════════════');
  line(' US INGESTION VALIDATION REPORT');
  line('═══════════════════════════════════════════════════════════');

  // ── COVERAGE ──────────────────────────────────────────────────────────────
  const [cov] = await q(`
    SELECT
      (SELECT COUNT(*) FROM stocks WHERE region='US') AS total,
      (SELECT COUNT(*) FROM stocks WHERE region='US' AND "isActive"=true AND "isDelisted"=false) AS active,
      (SELECT COUNT(*) FROM stocks WHERE region='US' AND sector IS NOT NULL) AS with_sector,
      (SELECT COUNT(*) FROM stocks WHERE region='US' AND "marketCap" IS NOT NULL) AS with_mcap,
      (SELECT COUNT(DISTINCT symbol) FROM price_ticks WHERE region='US') AS priced,
      (SELECT COUNT(*) FROM price_ticks WHERE region='US') AS price_rows,
      (SELECT COUNT(DISTINCT "stockId") FROM fundamentals f WHERE EXISTS (SELECT 1 FROM stocks s WHERE s.id=f."stockId" AND s.region='US')) AS with_fundamentals,
      (SELECT COUNT(*) FROM corporate_actions ca WHERE EXISTS (SELECT 1 FROM stocks s WHERE s.id=ca."stockId" AND s.region='US')) AS corp_actions,
      (SELECT COUNT(DISTINCT ca."stockId") FROM corporate_actions ca WHERE EXISTS (SELECT 1 FROM stocks s WHERE s.id=ca."stockId" AND s.region='US')) AS corp_action_symbols,
      (SELECT COUNT(*) FROM fundamentals f WHERE f."officialResultDate" IS NOT NULL AND EXISTS (SELECT 1 FROM stocks s WHERE s.id=f."stockId" AND s.region='US')) AS earnings_dates,
      (SELECT COUNT(DISTINCT "instrumentId") FROM signal_results sr WHERE EXISTS (SELECT 1 FROM stocks s WHERE s.id=sr."instrumentId" AND s.region='US')) AS signals
  `);
  const active = n(cov.active);
  const priced = n(cov.priced);
  const pricedPct = active ? (priced / active) * 100 : 0;
  line('\n── COVERAGE ──');
  line(`  Catalog stocks (US):        ${n(cov.total)}  (active ${active})`);
  line(`  Priced (distinct symbols):  ${priced}  (${pricedPct.toFixed(1)}% of active) — ${n(cov.price_rows).toLocaleString()} price rows`);
  line(`  With sector:                ${n(cov.with_sector)}`);
  line(`  With market cap:            ${n(cov.with_mcap)}`);
  line(`  With fundamentals:          ${n(cov.with_fundamentals)}`);
  line(`  Corporate actions:          ${n(cov.corp_actions)}  across ${n(cov.corp_action_symbols)} symbols`);
  line(`  Earnings dates (official):  ${n(cov.earnings_dates)}`);
  line(`  Signals (distinct):         ${n(cov.signals)}`);
  if (pricedPct < MIN_PRICED_PCT) softWarnings.push(`Priced coverage ${pricedPct.toFixed(1)}% < target ${MIN_PRICED_PCT}%`);
  if (n(cov.corp_actions) === 0) softWarnings.push('No corporate actions ingested.');
  if (n(cov.with_fundamentals) === 0) softWarnings.push('No US fundamentals ingested.');
  if (n(cov.earnings_dates) === 0) softWarnings.push('No US earnings dates ingested.');

  // ── INTEGRITY (hard) ──────────────────────────────────────────────────────
  line('\n── INTEGRITY (hard gate) ──');
  // Hard integrity gate scopes to the INGESTED US universe (catalogSource set by this
  // pipeline). Pre-existing legacy rows from other imports (catalogSource IS NULL) are
  // reported separately as a soft warning so they're surfaced, not hidden, and don't
  // fail the ingestion signoff on data this process did not create.
  const allowedExch = ALLOWED_US_EXCHANGES.map((e) => `'${e}'`).join(',');
  const [integ] = await q(`
    SELECT
      (SELECT COUNT(*) FROM stocks WHERE region='US' AND "catalogSource" IS NOT NULL AND currency IS NOT NULL AND currency<>'USD') AS bad_currency,
      (SELECT COUNT(*) FROM stocks WHERE region='US' AND "catalogSource" IS NOT NULL AND exchange IS NOT NULL AND exchange <> ALL(ARRAY[${allowedExch}])) AS bad_exchange,
      (SELECT COUNT(*) FROM stocks WHERE region IN ('IN') AND exchange IN ('NASDAQ','NYSE','AMEX')) AS in_with_us_exchange,
      (SELECT COUNT(DISTINCT pt.symbol) FROM price_ticks pt WHERE pt.region='US'
         AND EXISTS (SELECT 1 FROM stocks s WHERE s.symbol=pt.symbol AND s.region IS NOT NULL AND s.region<>'US')) AS us_ticks_on_nonus_stock,
      (SELECT COUNT(*) FROM stocks WHERE region='US' AND "catalogSource" IS NULL
         AND "isActive"=true AND "isDelisted"=false
         AND ((exchange IS NOT NULL AND exchange <> ALL(ARRAY[${allowedExch}])) OR (currency IS NOT NULL AND currency<>'USD'))) AS legacy_anomalies
  `);
  const legacyAnomalies = n(integ.legacy_anomalies);
  if (legacyAnomalies > 0) softWarnings.push(`${legacyAnomalies} pre-existing legacy US row(s) with non-US exchange/currency (catalogSource NULL, from a prior import) — owner cleanup, outside this ingestion.`);
  const integChecks: Array<[string, number]> = [
    ['US stocks with non-USD currency', n(integ.bad_currency)],
    ['US stocks with disallowed exchange', n(integ.bad_exchange)],
    ['IN stocks tagged with a US exchange (leak)', n(integ.in_with_us_exchange)],
    ["US price ticks whose symbol's stock is non-US (contamination)", n(integ.us_ticks_on_nonus_stock)],
  ];
  for (const [label, count] of integChecks) {
    line(`  ${count === 0 ? 'PASS' : 'FAIL'}  ${label}: ${count}`);
    if (count !== 0) hardFailures.push(`INTEGRITY: ${label} = ${count}`);
  }

  // ── SANITY (hard) ─────────────────────────────────────────────────────────
  line('\n── SANITY (hard gate) ──');
  const [san] = await q(`
    SELECT
      (SELECT COUNT(*) FROM price_ticks WHERE region='US' AND (high < low OR high < open OR high < close OR low > open OR low > close)) AS ohlc_disorder,
      (SELECT COUNT(*) FROM price_ticks WHERE region='US' AND (open<=0 OR high<=0 OR low<=0 OR close<=0)) AS nonpositive,
      (SELECT COUNT(*) FROM price_ticks WHERE region='US' AND "adjustedClose" IS NOT NULL AND "adjustedClose" > close * 1.01) AS adj_above_close,
      (SELECT COUNT(*) FROM corporate_actions ca WHERE EXISTS (SELECT 1 FROM stocks s WHERE s.id=ca."stockId" AND s.region='US')
         AND ((ca."actionType" IN ('split','reverse_split') AND (ca."splitRatio" IS NULL OR ca."splitRatio"<=0))
           OR (ca."actionType"='dividend' AND (ca.amount IS NULL OR ca.amount<=0)))) AS bad_actions
  `);
  const sanChecks: Array<[string, number]> = [
    ['Bars with OHLC ordering violations', n(san.ohlc_disorder)],
    ['Bars with non-positive prices', n(san.nonpositive)],
    ['Bars with adjustedClose > close (impossible)', n(san.adj_above_close)],
    ['Corporate actions with invalid amount/ratio', n(san.bad_actions)],
  ];
  for (const [label, count] of sanChecks) {
    line(`  ${count === 0 ? 'PASS' : 'FAIL'}  ${label}: ${count}`);
    if (count !== 0) hardFailures.push(`SANITY: ${label} = ${count}`);
  }

  // ── FRESHNESS (hard) ──────────────────────────────────────────────────────
  line('\n── FRESHNESS (hard gate) ──');
  const [fresh] = await q(`
    SELECT
      (SELECT MAX(timestamp) FROM price_ticks WHERE region='US') AS us_latest,
      (SELECT MAX(timestamp) FROM price_ticks WHERE region='IN') AS in_latest
  `);
  const usLatest = fresh.us_latest ? new Date(fresh.us_latest as string) : null;
  const inLatest = fresh.in_latest ? new Date(fresh.in_latest as string) : null;
  line(`  US latest bar: ${usLatest ? usLatest.toISOString().slice(0, 10) : 'NONE'}`);
  line(`  IN latest bar: ${inLatest ? inLatest.toISOString().slice(0, 10) : 'NONE'}`);
  if (!usLatest) {
    hardFailures.push('FRESHNESS: no US price data at all');
    line('  FAIL  no US price data');
  } else if (inLatest) {
    const lagDays = Math.round((inLatest.getTime() - usLatest.getTime()) / 86400000);
    const ok = Math.abs(lagDays) <= FRESHNESS_MAX_LAG_DAYS;
    line(`  ${ok ? 'PASS' : 'FAIL'}  US lag vs IN: ${lagDays} day(s) (max ${FRESHNESS_MAX_LAG_DAYS})`);
    if (!ok) hardFailures.push(`FRESHNESS: US latest bar lags IN by ${lagDays} days`);
  }

  // ── VERDICT ───────────────────────────────────────────────────────────────
  line('\n═══════════════════════════════════════════════════════════');
  if (softWarnings.length) {
    line(' SOFT WARNINGS (coverage — non-blocking):');
    softWarnings.forEach((w) => line(`   • ${w}`));
  }
  if (hardFailures.length === 0) {
    line(' VERDICT: PASS ✓  (all hard gates green)');
    line('═══════════════════════════════════════════════════════════');
  } else {
    line(` VERDICT: FAIL ✗  (${hardFailures.length} hard-gate failure(s))`);
    hardFailures.forEach((f) => line(`   ✗ ${f}`));
    line('═══════════════════════════════════════════════════════════');
    process.exitCode = 1;
  }
}

main()
  .catch((e) => { console.error('[validate-us] Fatal:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
