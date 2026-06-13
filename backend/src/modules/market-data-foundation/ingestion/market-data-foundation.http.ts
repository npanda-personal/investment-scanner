/**
 * Market Data Foundation — SHARED HTTP CLIENT
 * ===========================================
 *
 * One configurable fetch helper for every external data-source call in the
 * module. Before this, each source file re-implemented the same AbortController
 * timeout dance, invented its own (inconsistent) User-Agent string, and
 * re-derived the max-download-byte guard. That duplication is consolidated
 * here.
 *
 * Behaviour is preserved per call site: callers pass the exact `userAgent`,
 * `referer`, and `accept` they need (some hosts are picky — Yahoo wants a
 * browser-like UA, SEC wants a contact string, NSE wants a referer), while the
 * timeout/abort/size-guard plumbing is shared and centrally configurable.
 *
 * Nothing here is provider-specific and no paid provider is ever called.
 */

/** Module-wide default UA, overridable via env. Individual calls may override. */
export const DEFAULT_MARKET_DATA_USER_AGENT =
  process.env.MARKET_DATA_HTTP_USER_AGENT?.trim() ||
  'Mozilla/5.0 (compatible; investment-scanner-market-data/1.0)';

/** Default per-request timeout (ms), overridable via env. */
export const DEFAULT_MARKET_DATA_HTTP_TIMEOUT_MS = (() => {
  const parsed = Number(process.env.MARKET_DATA_HTTP_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20_000;
})();

export interface MarketDataFetchOptions {
  /** Accept header (defaults to JSON for json helper, text for text helper). */
  accept?: string;
  /** User-Agent override; defaults to DEFAULT_MARKET_DATA_USER_AGENT. */
  userAgent?: string;
  /** Referer header (some bot-protected hosts require it). */
  referer?: string;
  /** Accept-Language header. */
  acceptLanguage?: string;
  /** Per-request timeout in ms (defaults to DEFAULT_MARKET_DATA_HTTP_TIMEOUT_MS). */
  timeoutMs?: number;
  /** Extra/override headers merged last. */
  headers?: Record<string, string>;
  /** Caller-supplied abort signal (combined with the internal timeout). */
  signal?: AbortSignal;
}

const buildHeaders = (options: MarketDataFetchOptions, defaultAccept: string): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: options.accept ?? defaultAccept,
    'User-Agent': options.userAgent ?? DEFAULT_MARKET_DATA_USER_AGENT,
  };
  if (options.referer) headers.Referer = options.referer;
  if (options.acceptLanguage) headers['Accept-Language'] = options.acceptLanguage;
  return { ...headers, ...(options.headers ?? {}) };
};

/**
 * Low-level fetch with a timeout/abort guard. Throws on non-2xx with a
 * descriptive message that includes the URL (callers depend on the
 * `HTTP <status>` prefix for retry classification).
 */
export async function marketDataFetch(
  url: string,
  options: MarketDataFetchOptions & { defaultAccept?: string } = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_MARKET_DATA_HTTP_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: buildHeaders(options, options.defaultAccept ?? 'application/json,text/plain,*/*'),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
    if (options.signal) options.signal.removeEventListener('abort', onExternalAbort);
  }
}

/** Fetch and parse JSON. */
export async function marketDataFetchJson<T = unknown>(
  url: string,
  options: MarketDataFetchOptions = {}
): Promise<T> {
  const response = await marketDataFetch(url, { ...options, defaultAccept: 'application/json' });
  return (await response.json()) as T;
}

export interface MarketDataFetchTextOptions extends MarketDataFetchOptions {
  /** Reject the download if its byte length exceeds this cap. */
  maxBytes?: number;
}

/**
 * Fetch text with an optional max-byte guard (checked against both the
 * Content-Length header and the decoded body, matching the previous inline
 * guards in the service/catalog download paths).
 */
export async function marketDataFetchText(
  url: string,
  options: MarketDataFetchTextOptions = {}
): Promise<string> {
  const response = await marketDataFetch(url, { ...options, defaultAccept: 'text/plain,*/*' });
  if (options.maxBytes && options.maxBytes > 0) {
    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > options.maxBytes) {
      throw new Error('download exceeds configured max size');
    }
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > options.maxBytes) {
      throw new Error('download exceeds configured max size');
    }
    return text;
  }
  return response.text();
}

/** Fetch raw bytes (for ZIP archives etc.) with an optional max-byte guard. */
export async function marketDataFetchBuffer(
  url: string,
  options: MarketDataFetchTextOptions = {}
): Promise<Buffer> {
  const response = await marketDataFetch(url, {
    ...options,
    defaultAccept: 'application/zip,application/octet-stream,*/*',
  });
  if (options.maxBytes && options.maxBytes > 0) {
    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > options.maxBytes) {
      throw new Error('download exceeds configured max size');
    }
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (options.maxBytes && options.maxBytes > 0 && buffer.byteLength > options.maxBytes) {
    throw new Error('download exceeds configured max size');
  }
  return buffer;
}
