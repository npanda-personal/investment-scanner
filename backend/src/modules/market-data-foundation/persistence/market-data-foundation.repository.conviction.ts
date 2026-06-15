import { Prisma, PrismaClient } from '@prisma/client';
import { normalizeMarketRegion } from '../../../shared/utils/market-scope';
import {
  CONVICTION_MIN_SIGNAL_SCORE,
  CONVICTION_MIN_SMART_MONEY_SCORE,
  CONVICTION_RESULT_LIMIT,
} from '../analytics/conviction-score';

/**
 * High-conviction confluence read.
 *
 * Surfaces the narrow set of stocks where the signal engine AND smart-money
 * accumulation agree strongly across every tracked horizon. A candidate
 * qualifies ONLY when its latest signal score is >= 70 AND its latest
 * smart-money score is > 70 in ALL THREE ranges (1M / 3M / 6M) — the
 * INNER JOINs enforce "present in every range" and the WHERE enforces the bar.
 *
 * The thresholds are fixed product constants, never request parameters: the
 * tab is defined by the conviction bar, so relaxing it would change what the
 * feature means. Entirely persisted-read — no generation on GET. Reads the
 * smart-money snapshot table directly via raw SQL, consistent with how the
 * sibling screener already reads signal_results / fno_ban_list.
 */
export class ConvictionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async conviction(options: {
    region?: string;
    onlyFnoEligible?: boolean;
  } = {}): Promise<Array<{
    instrumentId: string;
    symbol: string;
    companyName: string;
    signalDirection: string | null;
    signalScore: number | null;
    sm1m: number | null;
    sm3m: number | null;
    sm6m: number | null;
  }>> {
    const filters: Prisma.Sql[] = [
      Prisma.sql`s."isActive" = TRUE`,
      Prisma.sql`s."isDelisted" = FALSE`,
      Prisma.sql`UPPER(COALESCE(s."providerSupportStatus", 'UNSUPPORTED')) = 'SUPPORTED'`,
    ];

    const normalizedRegion = normalizeMarketRegion(options.region);
    if (normalizedRegion) {
      filters.push(Prisma.sql`UPPER(COALESCE(s."region", '')) = ${normalizedRegion}`);
    }
    if (options.onlyFnoEligible) {
      filters.push(Prisma.sql`s."derivativesEligible" = TRUE`);
    }

    const whereClause = Prisma.join(filters, ' AND ');

    // Latest smart-money snapshot per instrument for a given range.
    const latestSmByRange = (range: string) => Prisma.sql`
      SELECT DISTINCT ON ("instrumentId") "instrumentId", "smartMoneyScore" AS s
      FROM smart_money_context_snapshots
      WHERE "range" = ${range}
      ORDER BY "instrumentId", "snapshotDate" DESC
    `;

    type Row = {
      instrumentId: string;
      symbol: string;
      companyName: string;
      signalDirection: string | null;
      signalScore: Prisma.Decimal | number | null;
      sm1m: Prisma.Decimal | number | null;
      sm3m: Prisma.Decimal | number | null;
      sm6m: Prisma.Decimal | number | null;
    };

    const query = Prisma.sql`
      WITH latest_signal AS MATERIALIZED (
        SELECT DISTINCT ON (sr."instrumentId")
          sr."instrumentId", sr.direction AS "signalDirection", sr.score AS "signalScore"
        FROM signal_results sr
        WHERE sr."generatedDate" IS NOT NULL
        ORDER BY sr."instrumentId", sr."generatedDate" DESC
      ),
      sm_1m AS (${latestSmByRange('1M')}),
      sm_3m AS (${latestSmByRange('3M')}),
      sm_6m AS (${latestSmByRange('6M')})
      SELECT
        s.id AS "instrumentId", s.symbol, COALESCE(s.name, s.symbol) AS "companyName",
        ls."signalDirection", ls."signalScore",
        sm_1m.s AS "sm1m", sm_3m.s AS "sm3m", sm_6m.s AS "sm6m"
      FROM stocks s
      JOIN latest_signal ls ON ls."instrumentId" = s.id
      JOIN sm_1m ON sm_1m."instrumentId" = s.id
      JOIN sm_3m ON sm_3m."instrumentId" = s.id
      JOIN sm_6m ON sm_6m."instrumentId" = s.id
      WHERE ${whereClause}
        AND ls."signalScore" >= ${CONVICTION_MIN_SIGNAL_SCORE}
        AND sm_1m.s > ${CONVICTION_MIN_SMART_MONEY_SCORE}
        AND sm_3m.s > ${CONVICTION_MIN_SMART_MONEY_SCORE}
        AND sm_6m.s > ${CONVICTION_MIN_SMART_MONEY_SCORE}
      ORDER BY ls."signalScore" DESC
      LIMIT ${CONVICTION_RESULT_LIMIT}
    `;

    const rows = await this.prisma.$queryRaw<Array<Row>>(query);

    const num = (v: Prisma.Decimal | number | null): number | null => (v != null ? Number(v) : null);

    return rows.map((row) => ({
      instrumentId: row.instrumentId,
      symbol: row.symbol,
      companyName: row.companyName,
      signalDirection: row.signalDirection ?? null,
      signalScore: num(row.signalScore),
      sm1m: num(row.sm1m),
      sm3m: num(row.sm3m),
      sm6m: num(row.sm6m),
    }));
  }
}
