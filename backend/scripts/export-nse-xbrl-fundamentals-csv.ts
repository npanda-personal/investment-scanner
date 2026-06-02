import path from 'path';
import {
  NseXbrlFundamentalsCsvExporter,
  normalizeSymbols,
} from '../src/modules/market-data-foundation/market-data-foundation.nse-xbrl-fundamentals-exporter';

interface CliOptions {
  symbols: string[];
  outputDir: string;
  maxSymbols: number;
  maxQuarterlyPeriods: number;
  maxAnnualPeriods: number;
  validatedBy?: string;
}

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'tmp', 'nse-xbrl-fundamentals-export');

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const exporter = new NseXbrlFundamentalsCsvExporter();
  const result = await exporter.exportSymbols({
    symbols: options.symbols,
    outputDir: options.outputDir,
    maxSymbols: options.maxSymbols,
    maxQuarterlyPeriods: options.maxQuarterlyPeriods,
    maxAnnualPeriods: options.maxAnnualPeriods,
    validatedBy: options.validatedBy,
  });

  const sampleRows = result.rows.slice(0, 5);
  console.log(JSON.stringify({
    csvFilePath: result.outputFilePath,
    reportFilePath: result.reportFilePath,
    symbolCount: result.report.symbolCount,
    rowsExported: result.report.rowsExported,
    rowsSkipped: result.report.rowsSkipped,
    missingFieldCounts: result.report.missingFieldCounts,
    warnings: result.report.warnings,
    sampleRows,
  }, null, 2));
};

const parseArgs = (args: string[]): CliOptions => {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const inlineValue = key.includes('=') ? key.split('=').slice(1).join('=') : null;
    const normalizedKey = key.includes('=') ? key.split('=')[0] : key;
    const value = inlineValue ?? args[index + 1] ?? '';
    if (inlineValue === null) index += 1;
    values.set(normalizedKey, value);
  }

  const symbols = normalizeSymbols((values.get('symbols') || '').split(','));
  if (symbols.length === 0) {
    throw new Error('Usage: ts-node scripts/export-nse-xbrl-fundamentals-csv.ts --symbols RELIANCE,TCS,INFY [--output-dir tmp/nse-xbrl-fundamentals-export] [--quarters 8] [--annual 3] [--max-symbols 50]');
  }

  const maxSymbols = readPositiveInteger(values.get('max-symbols'), 50);
  const boundedSymbols = symbols.slice(0, maxSymbols);

  return {
    symbols: boundedSymbols,
    outputDir: path.resolve(values.get('output-dir') || DEFAULT_OUTPUT_DIR),
    maxSymbols,
    maxQuarterlyPeriods: readNonNegativeInteger(values.get('quarters'), 8),
    maxAnnualPeriods: readNonNegativeInteger(values.get('annual'), 3),
    validatedBy: values.get('validated-by') || undefined,
  };
};

const readPositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const readNonNegativeInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
