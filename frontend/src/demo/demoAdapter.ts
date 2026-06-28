/**
 * Demo-mode axios adapter (GitHub Pages static build only).
 *
 * Every feature service calls the default `axios` with a relative `/api/...` URL,
 * and a single global request interceptor (marketScopeInterceptor) appends
 * region/assetType query params. By swapping `axios.defaults.adapter` for this in
 * demo mode (see main.tsx) we resolve EVERY request from baked JSON instead of an
 * HTTP call — no backend, no ~30 service edits.
 *
 * Matching is region-aware: for scoped endpoints the manifest key is
 * `path?region=XX`, falling back to the bare path for non-scoped endpoints.
 * The region is read from config.params (set by marketScopeInterceptor).
 * Unknown paths (uncaptured detail ids, refresh/mutation POSTs) resolve to a
 * benign 200 {} so the UI degrades to empty states rather than erroring.
 *
 * Only installed when import.meta.env.VITE_DEMO === '1'; a normal build never
 * imports this module.
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

interface ManifestEntry {
  file: string;
  status: number;
}
type Manifest = Record<string, ManifestEntry>;

const base = import.meta.env.BASE_URL || '/';

/** Normalize a request URL to the same path key the capture script writes. */
function normalizePath(rawUrl: string): string {
  let path = (rawUrl || '').split('?')[0].split('#')[0];
  // Absolute URL (defensive — services use relative paths): keep only the path.
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      /* leave as-is */
    }
  }
  // Strip the deployed base prefix if it leaked into the URL (defensive).
  if (base !== '/' && path.startsWith(base)) {
    path = '/' + path.slice(base.length);
  }
  if (!path.startsWith('/')) path = '/' + path;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

let manifestPromise: Promise<Manifest> | null = null;
function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${base}demo-api/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : ({} as Manifest)))
      .catch(() => ({} as Manifest));
  }
  return manifestPromise;
}

function makeResponse(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status: number,
): AxiosResponse {
  return {
    data,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : String(status),
    headers: {},
    config,
    request: {},
  } as AxiosResponse;
}

function resolveEntry(
  manifest: Manifest,
  path: string,
  params: Record<string, unknown> | undefined,
): ManifestEntry | undefined {
  const region = (params?.region ?? params?.market) as string | undefined;
  const secondary = (params?.sector ?? params?.index ?? params?.signalDirection) as
    | string
    | undefined;
  const secondaryKey = params?.sector
    ? 'sector'
    : params?.index
      ? 'index'
      : params?.signalDirection
        ? 'signalDirection'
        : null;
  if (region && secondary && secondaryKey) {
    const key = `${path}?region=${region}&${secondaryKey}=${secondary}`;
    if (manifest[key]) return manifest[key];
  }
  if (region) {
    const key = `${path}?region=${region}`;
    if (manifest[key]) return manifest[key];
  }
  return manifest[path];
}

export const demoAdapter: AxiosAdapter = async (config) => {
  const manifest = await loadManifest();
  const path = normalizePath(config.url || '');
  const entry = resolveEntry(manifest, path, config.params as Record<string, unknown> | undefined);
  if (entry) {
    try {
      const res = await fetch(`${base}demo-api/${entry.file}`);
      if (res.ok) {
        const data = await res.json();
        return makeResponse(config, data, entry.status || 200);
      }
    } catch {
      /* fall through to benign empty */
    }
  }
  // Uncaptured endpoint (non-curated detail id, refresh/mutation) — never error the UI.
  return makeResponse(config, {}, 200);
};
