// Official-exchange download + ZIP-extraction + URL-safety leaf utilities extracted from
// MarketDataFoundationService. Free functions, no instance/repository state. Behavior is
// byte-identical to the prior private/public methods.
import net from 'net';
import { inflateRawSync } from 'zlib';
import { nseDefaultReferer } from '../ingestion/market-data-foundation.endpoints';

export function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isBlockedCatalogHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;
  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4) {
    const parts = hostname.split('.').map((part) => Number(part));
    return parts[0] === 10
      || parts[0] === 127
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168)
      || (parts[0] === 169 && parts[1] === 254)
      || parts[0] === 0;
  }
  if (ipVersion === 6) {
    return hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80');
  }
  return false;
}

export function validateConfiguredCatalogUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('Configured catalog URL must use https.');
  }
  const hostname = url.hostname.toLowerCase();
  if (isBlockedCatalogHostname(hostname)) {
    throw new Error('Configured catalog URL host is not allowed.');
  }
}

export function isZipBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50;
}

export function findZipEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

export function extractZipEntry(buffer: Buffer, entry: {
  fileName: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
  sourceUrl: string;
}): Buffer {
  const localOffset = entry.localHeaderOffset;
  if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error(`zip local header is malformed for ${entry.fileName}`);
  }
  const fileNameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) throw new Error(`zip entry exceeds archive bounds for ${entry.fileName}`);
  const compressed = buffer.subarray(dataStart, dataEnd);
  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) return inflateRawSync(compressed);
  throw new Error(`unsupported zip compression ${entry.compressionMethod} for ${entry.fileName} from ${entry.sourceUrl}`);
}

export function extractFirstCsvFromZip(buffer: Buffer, sourceUrl: string, maxBytes: number): string {
  const eocdOffset = findZipEndOfCentralDirectory(buffer);
  if (eocdOffset < 0) throw new Error('zip end-of-central-directory was not found');
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let cursor = buffer.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('zip central directory is malformed');
    }
    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileName = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString('utf8');

    if (fileName.toLowerCase().endsWith('.csv') && !fileName.endsWith('/')) {
      if (uncompressedSize > maxBytes) throw new Error(`${fileName} exceeds configured max size`);
      const csvBuffer = extractZipEntry(buffer, {
        fileName,
        compressionMethod,
        compressedSize,
        localHeaderOffset,
        sourceUrl,
      });
      if (csvBuffer.length > maxBytes) throw new Error(`${fileName} exceeds configured max size`);
      return csvBuffer.toString('utf8');
    }

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error(`no CSV entry found in zip ${sourceUrl}`);
}

export async function downloadOfficialExchangeText(url: string): Promise<string> {
  validateConfiguredCatalogUrl(url);
  const maxBytes = Math.max(100_000, Math.min(readPositiveNumber(process.env.MARKET_DATA_EXCHANGE_EOD_MAX_DOWNLOAD_BYTES, 15_000_000), 50_000_000));
  const timeoutMs = Math.max(1_000, Math.min(readPositiveNumber(process.env.MARKET_DATA_EXCHANGE_EOD_TIMEOUT_MS, 20_000), 120_000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'text/csv, text/plain, application/zip, application/octet-stream, */*',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': 'investment-scanner-market-data-foundation/1.0',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > maxBytes) throw new Error('download exceeds configured max size');
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) throw new Error('download exceeds configured max size');
    if (url.toLowerCase().endsWith('.zip') || isZipBuffer(buffer)) {
      return extractFirstCsvFromZip(buffer, url, maxBytes);
    }
    return buffer.toString('utf8');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('download timed out');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function downloadOfficialExchangeJson(url: string): Promise<any> {
  validateConfiguredCatalogUrl(url);
  const maxBytes = Math.max(10_000, Math.min(readPositiveNumber(process.env.MARKET_DATA_EXCHANGE_JSON_MAX_DOWNLOAD_BYTES, 2_000_000), 10_000_000));
  const timeoutMs = Math.max(1_000, Math.min(readPositiveNumber(process.env.MARKET_DATA_EXCHANGE_EOD_TIMEOUT_MS, 20_000), 120_000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        referer: nseDefaultReferer(),
        'user-agent': 'Mozilla/5.0 investment-scanner-market-data-foundation/1.0',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > maxBytes) throw new Error('download exceeds configured max size');
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('download exceeds configured max size');
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('download timed out');
    if (error instanceof SyntaxError) throw new Error('official exchange JSON response was not parseable');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
