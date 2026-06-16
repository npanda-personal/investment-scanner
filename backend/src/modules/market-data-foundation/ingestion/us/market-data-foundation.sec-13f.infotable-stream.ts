/**
 * Memory-bounded streaming reader for the SEC 13F INFOTABLE.tsv.
 *
 * A quarter's INFOTABLE is ~400 MB uncompressed (every holding by every filer).
 * The pure `parseInfotableTsv` + `aggregateByCusip` helpers in the 13F service
 * materialise the whole file as one JS string and a millions-row array — fine
 * for unit-test fixtures, but multi-GB (and past V8's string limit) for real
 * data. This module is the production counterpart: it keeps the inflated bytes
 * as an off-heap Buffer (Buffers don't sit on the V8 heap) and walks it
 * line-by-line, aggregating per-CUSIP incrementally so peak heap stays bounded.
 *
 * It MIRRORS the semantics of `aggregateByCusip` exactly — a cross-check unit
 * test feeds the same fixture through both paths and asserts identical output.
 *
 * Research-support only: observed regulatory-filing data, not advice.
 */

import { inflateRawSync } from 'zlib';
import type { CusipAggregate } from './market-data-foundation.sec-13f.service';

/** Hard guard against an absurd inflated size (kept well above real ~400 MB). */
const MAX_INFOTABLE_BYTES = 1536 * 1024 * 1024;
const TOP_HOLDERS_LIMIT = 10;

const LF = 0x0a;
const CR = 0x0d;

/**
 * Return the RAW inflated bytes of the first zip entry whose base name matches
 * `wantedBaseName` (case-insensitive), or null if absent. Unlike the service's
 * `extractNamedEntriesFromZip`, this does NOT decode to a string — the caller
 * streams the Buffer to avoid a giant in-heap allocation.
 */
export function extractZipEntryBuffer(zip: Buffer, wantedBaseName: string): Buffer | null {
  const wanted = wantedBaseName.toLowerCase();
  const eocdOffset = findEndOfCentralDirectory(zip);
  if (eocdOffset < 0) throw new Error('zip end-of-central-directory was not found');
  const totalEntries = zip.readUInt16LE(eocdOffset + 10);
  let cursor = zip.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > zip.length || zip.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('zip central directory is malformed');
    }
    const compressionMethod = zip.readUInt16LE(cursor + 10);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const uncompressedSize = zip.readUInt32LE(cursor + 24);
    const fileNameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30);
    const commentLength = zip.readUInt16LE(cursor + 32);
    const localHeaderOffset = zip.readUInt32LE(cursor + 42);
    const fileName = zip.subarray(cursor + 46, cursor + 46 + fileNameLength).toString('utf8');
    const base = fileName.split('/').pop()?.toLowerCase() ?? '';

    if (base === wanted) {
      if (uncompressedSize > MAX_INFOTABLE_BYTES) throw new Error(`${fileName} exceeds max size`);
      const data = inflateZipEntry(zip, { fileName, compressionMethod, compressedSize, localHeaderOffset });
      if (data.length > MAX_INFOTABLE_BYTES) throw new Error(`${fileName} exceeds max size`);
      return data;
    }
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }
  return null;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function inflateZipEntry(
  buffer: Buffer,
  entry: { fileName: string; compressionMethod: number; compressedSize: number; localHeaderOffset: number },
): Buffer {
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
  if (entry.compressionMethod === 0) return compressed; // stored
  if (entry.compressionMethod === 8) return inflateRawSync(compressed); // deflate
  throw new Error(`unsupported zip compression ${entry.compressionMethod} for ${entry.fileName}`);
}

function headerIndex(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const i = headers.findIndex((h) => h.trim().toUpperCase() === name.toUpperCase());
    if (i >= 0) return i;
  }
  return -1;
}

function toNum(raw: string | undefined): number {
  if (raw === undefined) return 0;
  const s = raw.trim().replace(/,/g, '');
  if (s === '' || s === '-') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

interface CusipAcc {
  cusip: string;
  nameOfIssuer: string;
  totalValue: number;
  totalShares: number;
  managers: Set<string>;
  valueByManager: Map<string, number>;
}

/**
 * Stream the inflated INFOTABLE Buffer line-by-line and aggregate per CUSIP.
 * Mirrors `aggregateByCusip` (holderCount = distinct filing managers resolved
 * via the coverpage accession→manager map; topHolders = largest by summed
 * value). Each line is decoded as a short-lived string, so peak heap is the
 * bounded per-CUSIP map, not the 400 MB file.
 */
export function streamAggregateInfotable(
  infotable: Buffer,
  managerByAccession: Map<string, string>,
): CusipAggregate[] {
  const byCusip = new Map<string, CusipAcc>();

  let headerParsed = false;
  let iAcc = -1;
  let iCusip = -1;
  let iName = -1;
  let iValue = -1;
  let iShares = -1;

  let start = 0;
  const len = infotable.length;
  for (let i = 0; i <= len; i += 1) {
    if (i !== len && infotable[i] !== LF) continue;
    let end = i;
    if (end > start && infotable[end - 1] === CR) end -= 1; // strip trailing \r
    if (end > start) {
      const line = infotable.toString('utf8', start, end);
      if (!headerParsed) {
        const headers = line.split('\t');
        iAcc = headerIndex(headers, 'ACCESSION_NUMBER');
        iCusip = headerIndex(headers, 'CUSIP');
        iName = headerIndex(headers, 'NAMEOFISSUER');
        iValue = headerIndex(headers, 'VALUE');
        iShares = headerIndex(headers, 'SSHPRNAMT');
        headerParsed = true;
        if (iCusip < 0 || iValue < 0) return []; // unrecognised layout
      } else {
        addInfotableLine(byCusip, line.split('\t'), managerByAccession, { iAcc, iCusip, iName, iValue, iShares });
      }
    }
    start = i + 1;
  }

  const out: CusipAggregate[] = [];
  for (const acc of byCusip.values()) {
    const topHolders = [...acc.valueByManager.entries()]
      .map(([manager, value]) => ({ manager, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, TOP_HOLDERS_LIMIT);
    out.push({
      cusip: acc.cusip,
      nameOfIssuer: acc.nameOfIssuer,
      totalValue: acc.totalValue,
      totalShares: acc.totalShares,
      holderCount: acc.managers.size,
      topHolders,
    });
  }
  return out;
}

function addInfotableLine(
  byCusip: Map<string, CusipAcc>,
  cols: string[],
  managerByAccession: Map<string, string>,
  idx: { iAcc: number; iCusip: number; iName: number; iValue: number; iShares: number },
): void {
  const cusip = (cols[idx.iCusip] ?? '').trim().toUpperCase();
  if (!cusip) return;
  const accessionNumber = idx.iAcc >= 0 ? (cols[idx.iAcc] ?? '').trim() || null : null;
  const nameOfIssuer = (idx.iName >= 0 ? cols[idx.iName] : '')?.trim() ?? '';
  const value = toNum(idx.iValue >= 0 ? cols[idx.iValue] : undefined);
  const shares = toNum(idx.iShares >= 0 ? cols[idx.iShares] : undefined);

  let acc = byCusip.get(cusip);
  if (!acc) {
    acc = { cusip, nameOfIssuer, totalValue: 0, totalShares: 0, managers: new Set(), valueByManager: new Map() };
    byCusip.set(cusip, acc);
  }
  if (!acc.nameOfIssuer && nameOfIssuer) acc.nameOfIssuer = nameOfIssuer;
  acc.totalValue += value;
  acc.totalShares += shares;

  const manager = (accessionNumber && managerByAccession.get(accessionNumber)) || accessionNumber || 'UNKNOWN_FILER';
  acc.managers.add(manager);
  acc.valueByManager.set(manager, (acc.valueByManager.get(manager) ?? 0) + value);
}
