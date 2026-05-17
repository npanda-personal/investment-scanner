import { createHmac } from 'crypto';
import { networkInterfaces } from 'os';
import type { HistoricalPrice, ProviderValidationResult, RegionInfo } from './market-data-foundation.types';
import { partitionHistoricalPrices } from './market-data-foundation.validation';

export interface AngelOneProviderConfig {
  enabled: boolean;
  apiKey: string;
  clientCode: string;
  pin: string;
  totpSecret: string;
  baseUrl: string;
  scripMasterUrl: string;
  clientLocalIp: string;
  clientPublicIp: string;
  clientMacAddress: string;
  historicalThrottleMs: number;
  historicalMaxDays: number;
  failClosed: boolean;
}

interface AngelOneSession {
  jwtToken: string;
  refreshToken?: string;
  feedToken?: string;
  createdAtMs: number;
}

interface AngelOneScrip {
  token?: string | number | null;
  symbol?: string | null;
  name?: string | null;
  exch_seg?: string | null;
  instrumenttype?: string | null;
}

interface AngelOneResponse<T> {
  status?: boolean;
  message?: string;
  errorcode?: string;
  data?: T;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type AngelOneHistoricalOptions = {
  region?: string;
  assetType?: string;
  exchange?: string | null;
};

const LOGIN_ROUTE = '/rest/auth/angelbroking/user/v1/loginByPassword';
const CANDLE_ROUTE = '/rest/secure/angelbroking/historical/v1/getCandleData';
const DEFAULT_SCRIP_MASTER_URL = 'https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json';
const MIN_HISTORICAL_THROTTLE_MS = 350;
// SmartAPI historical candles publish a 3/sec cap, but live access can still throttle bursts.
// Keep the default below the published limit and allow explicit local tuning.
const DEFAULT_HISTORICAL_THROTTLE_MS = 750;
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const ANGEL_RATE_LIMIT_RETRIES = 2;
const ANGEL_EQUITY_SERIES_PRIORITY = [
  'EQ', 'BE', 'BZ', 'BL', 'SM', 'ST', 'MT', 'BT', 'XT', 'Z', 'A', 'B'
];
const ANGEL_EQUITY_SERIES = new Set(ANGEL_EQUITY_SERIES_PRIORITY);

export class AngelOneMarketDataProvider {
  private static historicalThrottleChain: Promise<void> = Promise.resolve();
  private static lastHistoricalRequestAt = 0;
  private session: AngelOneSession | null = null;
  private sessionRequest: Promise<AngelOneSession> | null = null;
  private scripMasterCache: { loadedAtMs: number; rows: AngelOneScrip[] } | null = null;
  private scripMasterRequest: Promise<AngelOneScrip[]> | null = null;

  constructor(
    private readonly config: AngelOneProviderConfig = readAngelOneProviderConfig(),
    private readonly fetchFn: FetchLike = defaultFetch
  ) {}

  isEnabled(): boolean {
    return this.config.enabled && this.hasRequiredCredentials();
  }

  canHandleHistorical(symbol: string, options: AngelOneHistoricalOptions = {}): boolean {
    if (!this.isEnabled()) return false;
    const region = options.region?.trim().toUpperCase();
    const assetType = options.assetType?.trim().toUpperCase() || 'STOCK';
    if (assetType !== 'STOCK') return false;
    if (region && region !== 'IN') return false;
    const exchange = this.resolveExchange(symbol, options.exchange);
    const hasIndianScope = region === 'IN' || exchange !== null || /\.NS$|\.BO$/i.test(symbol.trim());
    return hasIndianScope && Boolean(this.baseSymbolForAngel(symbol));
  }

  shouldFailClosed(): boolean {
    return this.config.failClosed;
  }

  inferRegion(symbol: string): RegionInfo {
    if (symbol.endsWith('.BO')) return { region: 'IN', exchange: 'BSE' };
    if (symbol.endsWith('.NS')) return { region: 'IN', exchange: 'NSE' };
    return { region: 'IN', exchange: 'NSE' };
  }

  async fetchHistorical(
    symbol: string,
    startDate?: Date,
    endDate?: Date,
    options: AngelOneHistoricalOptions = {}
  ): Promise<HistoricalPrice[]> {
    if (!this.canHandleHistorical(symbol, options)) {
      throw new Error(`Angel One historical provider is not enabled or cannot handle ${symbol}.`);
    }

    const instrument = await this.resolveInstrument(symbol, options);
    if (!instrument.token || !instrument.symbol || !instrument.exch_seg) {
      throw new Error(`Angel One scrip master did not contain an NSE/BSE equity token for ${symbol}.`);
    }

    const effectiveStart = this.normalizeUtcDay(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const effectiveEnd = this.normalizeUtcDay(endDate || new Date());
    const chunks = this.dateChunks(effectiveStart, effectiveEnd, this.config.historicalMaxDays);
    const prices: HistoricalPrice[] = [];
    let malformedRowsSkipped = 0;

    for (const chunk of chunks) {
      await this.throttleHistoricalRequests();
      const response = await this.postAngelOne<any[][]>(CANDLE_ROUTE, {
        exchange: instrument.exch_seg,
        symboltoken: String(instrument.token),
        interval: 'ONE_DAY',
        fromdate: this.formatAngelDate(chunk.start, false),
        todate: this.formatAngelDate(chunk.end, true),
      }, true);

      const rows = Array.isArray(response.data) ? response.data : [];
      for (const row of rows) {
        const parsedRow = this.toHistoricalPrice(symbol, row);
        if (parsedRow) {
          prices.push(parsedRow);
        } else {
          malformedRowsSkipped += 1;
        }
      }
    }

    const validation = partitionHistoricalPrices(prices);
    const malformedCount = malformedRowsSkipped + validation.invalid.length;
    if (malformedCount > 0) {
      console.warn(`Skipped ${malformedCount} malformed Angel One historical price rows for ${symbol}`);
    }
    return validation.valid;
  }

  async validateProviderSymbol(symbol: string, options: {
    region?: string;
    assetType?: string;
    exchange?: string | null;
    validationWindowStartDate?: Date;
    validationWindowEndDate?: Date;
  } = {}): Promise<ProviderValidationResult> {
    const started = Date.now();
    const validationWindowStartDate = options.validationWindowStartDate || new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    const validationWindowEndDate = options.validationWindowEndDate || new Date();
    try {
      const prices = await this.fetchHistorical(symbol, validationWindowStartDate, validationWindowEndDate, options);
      return {
        supported: prices.length > 0,
        failed: prices.length === 0,
        classification: prices.length > 0 ? 'SUPPORTED_WITH_CANDLES' : 'FREE_FALLBACK_REQUIRED',
        provider: 'angel_one',
        providerSymbol: symbol,
        candlesFound: prices.length,
        providerCallMs: Date.now() - started,
        validationWindowStartDate: validationWindowStartDate.toISOString().slice(0, 10),
        validationWindowEndDate: validationWindowEndDate.toISOString().slice(0, 10),
        sourceName: 'ANGEL_ONE_HISTORICAL',
        freeFallbackRequired: prices.length === 0,
        message: prices.length > 0 ? undefined : 'Angel One returned no daily candles for the validation window.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Angel One validation failed.';
      return {
        supported: false,
        failed: true,
        classification: this.isRateLimitError(message) ? 'RETRYABLE_RATE_LIMITED' : 'RETRYABLE_PROVIDER_ERROR',
        provider: 'angel_one',
        providerSymbol: symbol,
        candlesFound: 0,
        providerCallMs: Date.now() - started,
        validationWindowStartDate: validationWindowStartDate.toISOString().slice(0, 10),
        validationWindowEndDate: validationWindowEndDate.toISOString().slice(0, 10),
        sourceName: 'ANGEL_ONE_HISTORICAL',
        message,
      };
    }
  }

  private hasRequiredCredentials(): boolean {
    return Boolean(this.config.apiKey && this.config.clientCode && this.config.pin && this.config.totpSecret);
  }

  private async resolveInstrument(
    symbol: string,
    options: Pick<AngelOneHistoricalOptions, 'exchange'> = {}
  ): Promise<Required<Pick<AngelOneScrip, 'token' | 'symbol' | 'exch_seg'>> & AngelOneScrip> {
    const exchange = this.resolveExchange(symbol, options.exchange) || 'NSE';
    const base = this.baseSymbolForAngel(symbol);
    const rows = await this.scripMasterRows();
    const candidates = rows
      .filter((row) => this.isCashEquityRow(row, exchange, base))
      .sort((left, right) => this.equityScripRank(left, base) - this.equityScripRank(right, base));
    const match = candidates[0];

    if (!match?.token || !match.symbol || !match.exch_seg) {
      throw new Error(`Angel One scrip master token not found for ${symbol}.`);
    }
    return match as Required<Pick<AngelOneScrip, 'token' | 'symbol' | 'exch_seg'>> & AngelOneScrip;
  }

  private resolveExchange(symbol: string, exchange?: string | null): 'NSE' | 'BSE' | null {
    const normalizedExchange = String(exchange || '').trim().toUpperCase();
    if (normalizedExchange === 'NSE' || normalizedExchange === 'BSE') return normalizedExchange;
    if (/\.BO$/i.test(symbol.trim())) return 'BSE';
    if (/\.NS$/i.test(symbol.trim())) return 'NSE';
    return null;
  }

  private baseSymbolForAngel(symbol: string): string {
    let normalized = symbol.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
    const lastDash = normalized.lastIndexOf('-');
    if (lastDash > 0) {
      const suffix = normalized.slice(lastDash + 1);
      if (ANGEL_EQUITY_SERIES.has(suffix)) {
        normalized = normalized.slice(0, lastDash);
      }
    }
    return normalized;
  }

  private isCashEquityRow(row: AngelOneScrip, exchange: string, base: string): boolean {
    if (!row.token) return false;
    if (String(row.exch_seg || '').toUpperCase() !== exchange) return false;

    const symbol = String(row.symbol || '').toUpperCase();
    const name = String(row.name || '').toUpperCase();
    if (!symbol) return false;

    const instrumentType = String(row.instrumenttype || '').toUpperCase();
    if (/(OPT|FUT|INDEX|COMDTY|CURR|CURRENCY|CDS|MCX|NFO|BFO)/.test(instrumentType)) return false;

    if (symbol === base) return true;
    const baseSeriesPrefix = `${base}-`;
    if (!symbol.startsWith(baseSeriesPrefix) && name !== base) return false;

    const series = this.extractSeries(symbol, base);
    if (!series) return name === base;
    if (series === 'CE' || series === 'PE' || series === 'FUT') return false;
    return ANGEL_EQUITY_SERIES.has(series);
  }

  private extractSeries(symbol: string, base: string): string | null {
    const prefix = `${base}-`;
    if (!symbol.startsWith(prefix)) return null;
    return symbol.slice(prefix.length).trim() || null;
  }

  private equityScripRank(row: AngelOneScrip, base: string): number {
    const symbol = String(row.symbol || '').toUpperCase();
    const name = String(row.name || '').toUpperCase();
    const series = this.extractSeries(symbol, base);
    const seriesRank = series ? ANGEL_EQUITY_SERIES_PRIORITY.indexOf(series) : -1;
    const normalizedSeriesRank = seriesRank >= 0 ? seriesRank : ANGEL_EQUITY_SERIES_PRIORITY.length;
    const exactSymbolRank = symbol === `${base}-EQ` ? -2 : symbol.startsWith(`${base}-`) ? 0 : 1;
    const exactNameRank = name === base ? 0 : 1;
    return exactSymbolRank * 100 + normalizedSeriesRank * 10 + exactNameRank;
  }

  private async scripMasterRows(): Promise<AngelOneScrip[]> {
    if (this.scripMasterCache && Date.now() - this.scripMasterCache.loadedAtMs < 24 * 60 * 60 * 1000) {
      return this.scripMasterCache.rows;
    }
    if (!this.scripMasterRequest) {
      this.scripMasterRequest = this.loadScripMasterRows();
    }
    try {
      return await this.scripMasterRequest;
    } finally {
      this.scripMasterRequest = null;
    }
  }

  private async loadScripMasterRows(): Promise<AngelOneScrip[]> {
    const response = await this.fetchFn(this.config.scripMasterUrl);
    if (!response.ok) {
      throw new Error(`Angel One scrip master fetch failed with HTTP ${response.status}.`);
    }
    const json = await response.json();
    if (!Array.isArray(json)) {
      throw new Error('Angel One scrip master response was not an array.');
    }
    this.scripMasterCache = { loadedAtMs: Date.now(), rows: json as AngelOneScrip[] };
    return this.scripMasterCache.rows;
  }

  private async postAngelOne<T>(route: string, body: Record<string, unknown>, authenticated: boolean): Promise<AngelOneResponse<T>> {
    for (let attempt = 0; attempt <= ANGEL_RATE_LIMIT_RETRIES; attempt += 1) {
      try {
        return await this.postAngelOneOnce<T>(route, body, authenticated);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!this.isRateLimitError(message) || attempt >= ANGEL_RATE_LIMIT_RETRIES) {
          throw error;
        }
        await this.sleep(this.rateLimitCooldownMs(attempt));
      }
    }
    throw new Error(`Angel One ${route} failed after rate-limit retries.`);
  }

  private async postAngelOneOnce<T>(route: string, body: Record<string, unknown>, authenticated: boolean): Promise<AngelOneResponse<T>> {
    const session = authenticated ? await this.ensureSession() : null;
    const response = await this.fetchFn(`${this.config.baseUrl}${route}`, {
      method: 'POST',
      headers: this.headers(session?.jwtToken),
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let json: AngelOneResponse<T>;
    try {
      json = JSON.parse(text) as AngelOneResponse<T>;
    } catch {
      throw new Error(`Angel One returned non-JSON response from ${route}: ${text.slice(0, 120)}`);
    }
    const errorCode = (json as any).errorcode || (json as any).errorCode;
    const failedStatus = json.status === false || (json as any).success === false;
    const invalidPayload = route === CANDLE_ROUTE && !Array.isArray(json.data);
    if (!response.ok || failedStatus || errorCode || invalidPayload) {
      throw new Error(`Angel One ${route} failed: ${json.message || response.statusText || 'unknown error'}${errorCode ? ` (${errorCode})` : ''}`);
    }
    return json;
  }

  private async ensureSession(): Promise<AngelOneSession> {
    if (this.session && Date.now() - this.session.createdAtMs < SESSION_TTL_MS) {
      return this.session;
    }
    if (!this.sessionRequest) {
      this.sessionRequest = this.createSession();
    }
    try {
      return await this.sessionRequest;
    } finally {
      this.sessionRequest = null;
    }
  }

  private async createSession(): Promise<AngelOneSession> {
    const totp = this.generateTotp();
    const login = await this.postAngelOne<{
      jwtToken?: string;
      refreshToken?: string;
      feedToken?: string;
    }>(LOGIN_ROUTE, {
      clientcode: this.config.clientCode,
      password: this.config.pin,
      totp,
    }, false);
    const jwtToken = login.data?.jwtToken?.replace(/^Bearer\s+/i, '');
    if (!jwtToken) {
      throw new Error('Angel One login did not return a JWT token.');
    }
    const session = {
      jwtToken,
      refreshToken: login.data?.refreshToken,
      feedToken: login.data?.feedToken,
      createdAtMs: Date.now(),
    };
    this.session = session;
    return session;
  }

  private headers(jwtToken?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-ClientLocalIP': this.config.clientLocalIp,
      'X-ClientPublicIP': this.config.clientPublicIp,
      'X-MACAddress': this.config.clientMacAddress,
      'X-PrivateKey': this.config.apiKey,
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
    };
    if (jwtToken) headers.Authorization = `Bearer ${jwtToken}`;
    return headers;
  }

  private toHistoricalPrice(symbol: string, row: any[]): HistoricalPrice | null {
    if (!Array.isArray(row) || row.length < 6) {
      return null;
    }

    const date = this.parseAngelCandleDate(row[0]);
    if (!date) {
      return null;
    }

    const open = this.toHistoricalNumber(row[1]);
    const high = this.toHistoricalNumber(row[2]);
    const low = this.toHistoricalNumber(row[3]);
    const close = this.toHistoricalNumber(row[4]);
    if (open === null || high === null || low === null || close === null) {
      return null;
    }

    const volume = this.parseAngelVolume(row[5]);
    if (volume === null) {
      return null;
    }

    return {
      symbol,
      date,
      open,
      high,
      low,
      close,
      adjustedClose: null,
      ...(volume === undefined ? {} : { volume }),
      source: 'angel_one',
    };
  }

  private toHistoricalNumber(value: unknown): number | null {
    if (value === undefined || value === null || typeof value === 'boolean') return null;
    const text = String(value).trim().replace(/,/g, '');
    if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'nan') return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseAngelVolume(value: unknown): number | undefined | null {
    if (value === undefined || value === null || String(value).trim() === '') {
      return undefined;
    }
    return this.toHistoricalNumber(value);
  }

  private parseAngelCandleDate(value: unknown): Date | null {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    }

    const text = String(value ?? '').trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const parsedDate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
      if (
        parsedDate.getUTCFullYear() !== Number(match[1]) ||
        parsedDate.getUTCMonth() !== Number(match[2]) - 1 ||
        parsedDate.getUTCDate() !== Number(match[3])
      ) {
        return null;
      }
      return parsedDate;
    }
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  private normalizeUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private dateChunks(start: Date, end: Date, maxDays: number): { start: Date; end: Date }[] {
    const chunks: { start: Date; end: Date }[] = [];
    const safeMaxDays = Math.max(1, Math.min(maxDays, 500));
    let cursor = this.normalizeUtcDay(start);
    const finalEnd = this.normalizeUtcDay(end);
    while (cursor <= finalEnd) {
      const chunkEnd = new Date(cursor);
      chunkEnd.setUTCDate(chunkEnd.getUTCDate() + safeMaxDays - 1);
      if (chunkEnd > finalEnd) chunkEnd.setTime(finalEnd.getTime());
      chunks.push({ start: new Date(cursor), end: new Date(chunkEnd) });
      cursor = new Date(chunkEnd);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return chunks;
  }

  private formatAngelDate(date: Date, endOfDay: boolean): string {
    return `${date.toISOString().slice(0, 10)} ${endOfDay ? '23:59' : '00:00'}`;
  }

  private async throttleHistoricalRequests(): Promise<void> {
    const throttle = async () => {
      const delayMs = Math.max(0, this.config.historicalThrottleMs);
      const elapsed = Date.now() - AngelOneMarketDataProvider.lastHistoricalRequestAt;
      if (elapsed < delayMs) {
        await new Promise((resolve) => setTimeout(resolve, delayMs - elapsed));
      }
      AngelOneMarketDataProvider.lastHistoricalRequestAt = Date.now();
    };
    const next = AngelOneMarketDataProvider.historicalThrottleChain.then(throttle, throttle);
    AngelOneMarketDataProvider.historicalThrottleChain = next.catch(() => undefined);
    await next;
  }

  private rateLimitCooldownMs(attempt: number): number {
    return Math.max(3_000, this.config.historicalThrottleMs * 6) * (attempt + 1);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateTotp(nowMs = Date.now()): string {
    const key = base32ToBuffer(this.extractTotpSecret(this.config.totpSecret));
    const counter = Math.floor(nowMs / 1000 / 30);
    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buffer.writeUInt32BE(counter >>> 0, 4);
    const hmac = createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24)
      | ((hmac[offset + 1] & 0xff) << 16)
      | ((hmac[offset + 2] & 0xff) << 8)
      | (hmac[offset + 3] & 0xff);
    return String(binary % 1_000_000).padStart(6, '0');
  }

  private extractTotpSecret(value: string): string {
    if (!value.startsWith('otpauth://')) return value;
    const url = new URL(value);
    return url.searchParams.get('secret') || value;
  }

  private isRateLimitError(message: string): boolean {
    return /rate|throttle|too many requests|access rate|\b429\b/i.test(message);
  }
}

export function readAngelOneProviderConfig(env: NodeJS.ProcessEnv = process.env): AngelOneProviderConfig {
  const primaryStaticIp = readEnv(env, 'ANGEL_ONE_PRIMARY_STATIC_IP');
  return {
    enabled: readBoolean(env.ANGEL_ONE_ENABLE_MARKET_DATA)
      && (env.NODE_ENV !== 'test' || readBoolean(env.ANGEL_ONE_ENABLE_MARKET_DATA_IN_TEST)),
    apiKey: readEnv(env, 'ANGEL_ONE_API_KEY'),
    clientCode: readEnv(env, 'ANGEL_ONE_CLIENT_CODE'),
    pin: readEnv(env, 'ANGEL_ONE_PIN'),
    totpSecret: readEnv(env, 'ANGEL_ONE_TOTP_SECRET'),
    baseUrl: readEnv(env, 'ANGEL_ONE_APICONNECT_BASE_URL') || 'https://apiconnect.angelone.in',
    scripMasterUrl: readEnv(env, 'ANGEL_ONE_SCRIP_MASTER_URL') || DEFAULT_SCRIP_MASTER_URL,
    clientLocalIp: readEnv(env, 'ANGEL_ONE_CLIENT_LOCAL_IP') || firstLocalIpv4() || '127.0.0.1',
    clientPublicIp: readEnv(env, 'ANGEL_ONE_CLIENT_PUBLIC_IP') || primaryStaticIp || '127.0.0.1',
    clientMacAddress: readEnv(env, 'ANGEL_ONE_CLIENT_MAC_ADDRESS') || firstMacAddress() || '00:00:00:00:00:00',
    historicalThrottleMs: Math.max(
      MIN_HISTORICAL_THROTTLE_MS,
      Math.min(readPositiveNumber(env.ANGEL_ONE_HISTORICAL_THROTTLE_MS, DEFAULT_HISTORICAL_THROTTLE_MS), 60_000)
    ),
    historicalMaxDays: Math.max(1, Math.min(readPositiveNumber(env.ANGEL_ONE_HISTORICAL_MAX_DAYS, 500), 500)),
    failClosed: env.ANGEL_ONE_FAIL_CLOSED === undefined ? true : readBoolean(env.ANGEL_ONE_FAIL_CLOSED),
  };
}

function defaultFetch(input: string, init?: RequestInit): Promise<Response> {
  if (!globalThis.fetch) throw new Error('Global fetch is unavailable in this Node runtime.');
  return globalThis.fetch(input, init);
}

function readEnv(env: NodeJS.ProcessEnv, key: string): string {
  return (env[key] || '').trim().replace(/^['"]|['"]$/g, '');
}

function readBoolean(value?: string): boolean {
  return /^(1|true|yes|on)$/i.test(String(value || '').trim());
}

function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function firstMacAddress(): string | null {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      if (!entry.internal && entry.mac && entry.mac !== '00:00:00:00:00:00') return entry.mac;
    }
  }
  return null;
}

function firstLocalIpv4(): string | null {
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      if (!entry.internal && entry.family === 'IPv4' && entry.address) return entry.address;
    }
  }
  return null;
}

function base32ToBuffer(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.replace(/\s+/g, '').replace(/=+$/g, '').toUpperCase();
  let bits = '';
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value < 0) throw new Error('Angel One TOTP secret must be valid base32.');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}
