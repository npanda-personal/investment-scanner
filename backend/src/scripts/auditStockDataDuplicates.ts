import prisma from '../db/prisma';

type AuditConfig = {
  model: string;
  table: string;
  keyDescription: string;
  keySelect: string;
  partitionBy: string;
  fallbackKeySelect?: string;
  fallbackPartitionBy?: string;
  fallbackColumn?: string;
  cleanupAllowed: boolean;
  appendOnly?: boolean;
  orderBy?: string;
};

type DuplicateSummary = {
  model: string;
  keyDescription: string;
  duplicateGroups: number;
  duplicateRows: number;
  cleanupAllowed: boolean;
  appendOnly: boolean;
  suggestedAction: string;
  samples: unknown[];
};

const configs: AuditConfig[] = [
  {
    model: 'Stock',
    table: 'stocks',
    keyDescription: 'symbol (symbol + exchange is preferred long term)',
    keySelect: '"symbol"',
    partitionBy: '"symbol"',
    cleanupAllowed: false,
  },
  {
    model: 'PriceTick',
    table: 'price_ticks',
    keyDescription: 'symbol + normalized daily timestamp',
    keySelect: '"symbol", date_trunc(\'day\', "timestamp") AS "timestampDay"',
    partitionBy: '"symbol", date_trunc(\'day\', "timestamp")',
    cleanupAllowed: true,
    orderBy: 'CASE "dataStatus" WHEN \'COMPLETE\' THEN 0 WHEN \'PARTIAL\' THEN 1 ELSE 2 END, "lastUpdatedTimestamp" DESC, "ingestionTimestamp" DESC, "id" ASC',
  },
  {
    model: 'LatestPrice',
    table: 'latest_prices',
    keyDescription: 'symbol',
    keySelect: '"symbol"',
    partitionBy: '"symbol"',
    cleanupAllowed: false,
  },
  {
    model: 'Fundamental',
    table: 'fundamentals',
    keyDescription: 'stockId + periodType + normalized periodEndDate + source',
    keySelect: '"stockId", "periodType", date_trunc(\'day\', "periodEndDate") AS "periodEndDay", "source"',
    partitionBy: '"stockId", "periodType", date_trunc(\'day\', "periodEndDate"), "source"',
    cleanupAllowed: true,
    orderBy: 'CASE "dataStatus" WHEN \'COMPLETE\' THEN 0 WHEN \'PARTIAL\' THEN 1 ELSE 2 END, "lastUpdatedTimestamp" DESC, "ingestionTimestamp" DESC, "id" ASC',
  },
  {
    model: 'CorporateAction',
    table: 'corporate_actions',
    keyDescription: 'stockId + actionType + normalized effectiveDate + amount/splitRatio + source',
    keySelect: '"stockId", "actionType", date_trunc(\'day\', "effectiveDate") AS "effectiveDay", COALESCE("amount"::text, \'\') AS "amount", COALESCE("splitRatio"::text, \'\') AS "splitRatio", "source"',
    partitionBy: '"stockId", "actionType", date_trunc(\'day\', "effectiveDate"), COALESCE("amount"::text, \'\'), COALESCE("splitRatio"::text, \'\'), "source"',
    cleanupAllowed: true,
    orderBy: 'CASE "dataStatus" WHEN \'COMPLETE\' THEN 0 WHEN \'PARTIAL\' THEN 1 ELSE 2 END, "lastUpdatedTimestamp" DESC, "ingestionTimestamp" DESC, "id" ASC',
  },
  {
    model: 'FxRate',
    table: 'fx_rates',
    keyDescription: 'pair',
    keySelect: '"pair"',
    partitionBy: '"pair"',
    cleanupAllowed: false,
  },
  {
    model: 'SignalResult',
    table: 'signal_results',
    keyDescription: 'instrumentId + modelVersion + generatedDate/trading day',
    keySelect: '"instrumentId", "modelVersion", COALESCE("generatedDate", date_trunc(\'day\', "generatedAt")) AS "signalDay"',
    partitionBy: '"instrumentId", "modelVersion", COALESCE("generatedDate", date_trunc(\'day\', "generatedAt"))',
    fallbackColumn: 'generatedDate',
    fallbackKeySelect: '"instrumentId", "modelVersion", date_trunc(\'day\', "generatedAt") AS "signalDay"',
    fallbackPartitionBy: '"instrumentId", "modelVersion", date_trunc(\'day\', "generatedAt")',
    cleanupAllowed: true,
    orderBy: 'CASE "dataStatus" WHEN \'COMPLETE\' THEN 0 WHEN \'PARTIAL\' THEN 1 ELSE 2 END, "updatedAt" DESC, "createdAt" DESC, "id" ASC',
  },
  {
    model: 'SignalCalibrationResult',
    table: 'signal_calibration_results',
    keyDescription: 'signalResultId + calibrationModelVersion',
    keySelect: '"signalResultId", "calibrationModelVersion"',
    partitionBy: '"signalResultId", "calibrationModelVersion"',
    cleanupAllowed: true,
    orderBy: '"updatedAt" DESC, "createdAt" DESC, "id" ASC',
  },
  {
    model: 'DataQualityEvaluation',
    table: 'data_quality_evaluations',
    keyDescription: 'instrumentId',
    keySelect: '"instrumentId"',
    partitionBy: '"instrumentId"',
    cleanupAllowed: false,
  },
  {
    model: 'MarketContextSnapshot',
    table: 'market_context_snapshots',
    keyDescription: 'normalized snapshotDate',
    keySelect: 'date_trunc(\'day\', "snapshotDate") AS "snapshotDay"',
    partitionBy: 'date_trunc(\'day\', "snapshotDate")',
    cleanupAllowed: true,
    orderBy: 'CASE "dataStatus" WHEN \'COMPLETE\' THEN 0 WHEN \'PARTIAL\' THEN 1 ELSE 2 END, "updatedAt" DESC, "createdAt" DESC, "id" ASC',
  },
  {
    model: 'SectorContextSnapshot',
    table: 'sector_context_snapshots',
    keyDescription: 'normalized snapshotDate + sector',
    keySelect: 'date_trunc(\'day\', "snapshotDate") AS "snapshotDay", "sector"',
    partitionBy: 'date_trunc(\'day\', "snapshotDate"), "sector"',
    cleanupAllowed: true,
    orderBy: 'CASE "dataStatus" WHEN \'COMPLETE\' THEN 0 WHEN \'PARTIAL\' THEN 1 ELSE 2 END, "updatedAt" DESC, "createdAt" DESC, "id" ASC',
  },
  {
    model: 'CountryContextSnapshot',
    table: 'country_context_snapshots',
    keyDescription: 'normalized snapshotDate + country',
    keySelect: 'date_trunc(\'day\', "snapshotDate") AS "snapshotDay", "country"',
    partitionBy: 'date_trunc(\'day\', "snapshotDate"), "country"',
    cleanupAllowed: true,
    orderBy: 'CASE "dataStatus" WHEN \'COMPLETE\' THEN 0 WHEN \'PARTIAL\' THEN 1 ELSE 2 END, "updatedAt" DESC, "createdAt" DESC, "id" ASC',
  },
  {
    model: 'SmartMoneyContextSnapshot',
    table: 'smart_money_context_snapshots',
    keyDescription: 'normalized snapshotDate + instrumentId',
    keySelect: 'date_trunc(\'day\', "snapshotDate") AS "snapshotDay", "instrumentId"',
    partitionBy: 'date_trunc(\'day\', "snapshotDate"), "instrumentId"',
    cleanupAllowed: true,
    orderBy: 'CASE "dataStatus" WHEN \'COMPLETE\' THEN 0 WHEN \'PARTIAL\' THEN 1 ELSE 2 END, "updatedAt" DESC, "createdAt" DESC, "id" ASC',
  },
  {
    model: 'DataQualitySnapshot',
    table: 'data_quality_snapshots',
    keyDescription: 'normalized snapshotDate + instrumentId',
    keySelect: 'date_trunc(\'day\', "snapshotDate") AS "snapshotDay", "instrumentId"',
    partitionBy: 'date_trunc(\'day\', "snapshotDate"), "instrumentId"',
    cleanupAllowed: true,
    orderBy: 'CASE "dataStatus" WHEN \'COMPLETE\' THEN 0 WHEN \'PARTIAL\' THEN 1 ELSE 2 END, "updatedAt" DESC, "createdAt" DESC, "id" ASC',
  },
  {
    model: 'BacktestRun',
    table: 'backtest_runs',
    keyDescription: 'append-only run history',
    keySelect: '"id"',
    partitionBy: '"id"',
    cleanupAllowed: false,
    appendOnly: true,
  },
  {
    model: 'AlertEvent',
    table: 'alert_events',
    keyDescription: 'append-only event history with module-level duplicate suppression',
    keySelect: '"id"',
    partitionBy: '"id"',
    cleanupAllowed: false,
    appendOnly: true,
  },
  {
    model: 'NotificationEvent',
    table: 'notification_events',
    keyDescription: 'append-only delivery history',
    keySelect: '"id"',
    partitionBy: '"id"',
    cleanupAllowed: false,
    appendOnly: true,
  },
];

function numeric(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function jsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  }
  return value;
}

async function summarize(config: AuditConfig, cleanup: boolean): Promise<DuplicateSummary> {
  const hasFallbackColumn = config.fallbackColumn
    ? await columnExists(config.table, config.fallbackColumn)
    : true;
  const keySelect = hasFallbackColumn ? config.keySelect : config.fallbackKeySelect ?? config.keySelect;
  const partitionBy = hasFallbackColumn ? config.partitionBy : config.fallbackPartitionBy ?? config.partitionBy;
  const [{ duplicateGroups, duplicateRows }] = await prisma.$queryRawUnsafe<Array<{ duplicateGroups: unknown; duplicateRows: unknown }>>(`
    SELECT COUNT(*)::int AS "duplicateGroups", COALESCE(SUM(row_count - 1), 0)::int AS "duplicateRows"
    FROM (
      SELECT COUNT(*) AS row_count
      FROM "${config.table}"
      GROUP BY ${partitionBy}
      HAVING COUNT(*) > 1
    ) duplicate_groups
  `);

  const samples = await prisma.$queryRawUnsafe<unknown[]>(`
    SELECT ${keySelect}, COUNT(*)::int AS "rowCount"
    FROM "${config.table}"
    GROUP BY ${partitionBy}
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 5
  `);

  const duplicateRowCount = numeric(duplicateRows);
  if (cleanup && config.cleanupAllowed && duplicateRowCount > 0) {
    await prisma.$executeRawUnsafe(`
      WITH ranked AS (
        SELECT "id", ROW_NUMBER() OVER (
          PARTITION BY ${partitionBy}
          ORDER BY ${config.orderBy ?? '"id" ASC'}
        ) AS row_number
        FROM "${config.table}"
      )
      DELETE FROM "${config.table}"
      WHERE "id" IN (
        SELECT "id"
        FROM ranked
        WHERE row_number > 1
      )
    `);
  }

  return {
    model: config.model,
    keyDescription: config.keyDescription,
    duplicateGroups: numeric(duplicateGroups),
    duplicateRows: duplicateRowCount,
    cleanupAllowed: config.cleanupAllowed,
    appendOnly: Boolean(config.appendOnly),
    suggestedAction: config.appendOnly
      ? 'Append-only by design; do not dedupe globally.'
      : config.cleanupAllowed
        ? 'Run with --cleanup after reviewing dry-run samples.'
        : 'DB constraint should prevent duplicates; investigate schema if duplicates appear.',
    samples: jsonSafe(samples) as unknown[],
  };
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${table.replace(/'/g, "''")}'
        AND column_name = '${column.replace(/'/g, "''")}'
    ) AS "exists"
  `);
  return Boolean(rows[0]?.exists);
}

async function main() {
  const args = process.argv.slice(2);
  const cleanup = args.includes('--cleanup');
  const modelArg = args.find((arg) => arg.startsWith('--model='));
  const selectedModel = modelArg?.split('=')[1]?.toLowerCase();
  const selected = selectedModel ? configs.filter((config) => config.model.toLowerCase() === selectedModel) : configs;

  if (selected.length === 0) {
    throw new Error(`Unknown model filter: ${selectedModel}`);
  }

  console.log(cleanup ? 'Duplicate audit running with cleanup enabled.' : 'Duplicate audit dry run. Pass --cleanup to delete extras for cleanup-enabled models.');
  const summaries: DuplicateSummary[] = [];
  for (const config of selected) {
    try {
      summaries.push(await summarize(config, cleanup));
    } catch (error) {
      summaries.push({
        model: config.model,
        keyDescription: config.keyDescription,
        duplicateGroups: 0,
        duplicateRows: 0,
        cleanupAllowed: config.cleanupAllowed,
        appendOnly: Boolean(config.appendOnly),
        suggestedAction: `Audit failed: ${error instanceof Error ? error.message : String(error)}`,
        samples: [],
      });
    }
  }

  console.table(summaries.map(({ model, duplicateGroups, duplicateRows, cleanupAllowed, appendOnly, suggestedAction }) => ({
    model,
    duplicateGroups,
    duplicateRows,
    cleanupAllowed,
    appendOnly,
    suggestedAction,
  })));
  console.log(JSON.stringify(summaries, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
