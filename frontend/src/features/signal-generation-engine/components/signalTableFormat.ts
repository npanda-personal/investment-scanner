/**
 * Shared value formatters for the signals table and its detail drawer.
 * Extracted from SignalTable.tsx so the table component, the column builder
 * (signalTableColumns.tsx) and the drawer can all reuse them without a cycle.
 */
export const formatMoney = (value: number | null, currency: string | null): string => {
  if (value === null) return 'N/A';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency || ''} ${value.toFixed(2)}`.trim();
  }
};

export const formatPercent = (value: number | null): string =>
  value === null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

export const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString() : 'N/A';
