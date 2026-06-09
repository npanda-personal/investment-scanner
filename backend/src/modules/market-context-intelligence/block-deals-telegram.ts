import { TelegramProvider } from '../notifications-delivery/telegram.provider';
import type { BulkBlockDealRow } from './bulk-block-deals.service';

const telegram = new TelegramProvider();

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtQty(qty: number): string {
  return qty.toLocaleString('en-IN');
}

function fmtCrore(value: number): string {
  const cr = value / 1e7;
  return cr >= 100 ? `₹${Math.round(cr)} Cr` : `₹${cr.toFixed(1)} Cr`;
}

function fmtDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[month - 1]} ${year}`;
}

function dealLine(row: BulkBlockDealRow): string {
  const notional = row.qty * row.avgPrice;
  return (
    `<b>${esc(row.symbol)}</b> | ${esc(row.clientName)}\n` +
    `    ${fmtQty(row.qty)} @ ₹${row.avgPrice.toFixed(2)} → <b>${fmtCrore(notional)}</b>`
  );
}

export function formatBlockDealsHtml(rows: BulkBlockDealRow[]): string {
  if (rows.length === 0) return '';

  const tradeDate = rows[0].tradeDate;
  const blockRows = rows.filter((r) => r.dealType === 'BLOCK' && r.buySell === 'BUY');
  const allBulkRows = rows.filter((r) => r.dealType === 'BULK' && r.buySell === 'BUY')
    .sort((a, b) => (b.qty * b.avgPrice) - (a.qty * a.avgPrice));
  const bulkRows = allBulkRows.slice(0, 5);

  const parts: string[] = [`<b>📊 Block &amp; Bulk Deals — ${fmtDate(tradeDate)}</b>`];

  if (blockRows.length > 0) {
    parts.push(`\n<b>BLOCK DEALS (${blockRows.length})</b>`);
    blockRows.forEach((r) => parts.push(dealLine(r)));
  }

  if (bulkRows.length > 0) {
    const suffix = allBulkRows.length > 5 ? `, top 5 of ${allBulkRows.length} by value` : '';
    parts.push(`\n<b>BULK DEALS (${allBulkRows.length}${suffix})</b>`);
    bulkRows.forEach((r) => parts.push(dealLine(r)));
  }

  return parts.join('\n');
}

export async function sendBlockDealsAlert(rows: BulkBlockDealRow[]): Promise<void> {
  if (!telegram.isConfigured() || rows.length === 0) return;
  const html = formatBlockDealsHtml(rows);
  if (html) await telegram.sendMessage(html);
}
