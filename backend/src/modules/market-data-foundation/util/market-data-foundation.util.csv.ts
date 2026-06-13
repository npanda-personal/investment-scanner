// CSV parsing / row-reading leaf utilities extracted from MarketDataFoundationService.
// Free functions, no instance/repository state. Behavior is byte-identical to the prior methods.

export function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

export function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toUpperCase());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
  return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || '']));
  });
}

export function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function readCsv(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key.toUpperCase()];
    if (value?.trim()) return value.trim();
  }
  return '';
}

export function readObjectString(record: Record<string, unknown>, keys: string[]): string {
  const normalized = new Map(Object.entries(record).map(([key, value]) => [key.trim().toUpperCase(), value]));
  for (const key of keys) {
    const value = normalized.get(key.trim().toUpperCase());
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}
