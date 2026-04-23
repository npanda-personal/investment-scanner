import axios from 'axios';

const API_BASE = '/api'; // proxy to backend
const TEST_USER_ID = 'test-user-id';

export interface ScannerRule {
  id: string;
  name: string;
  description: string | null;
  condition: any; // JSON condition
  sourceWatchlistId: string | null;
  sourceSymbols: any | null; // JSON array of symbols
  targetWatchlistId: string;
  isActive: boolean;
  schedule: string | null;
  nextScanAt: string | null;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  targetWatchlist: {
    id: string;
    name: string;
    symbols: string[];
  };
  sourceWatchlist?: {
    id: string;
    name: string;
    symbols: string[];
  } | null;
  ScanLog?: ScanLog[];
}

export interface ScanLog {
  id: string;
  ruleId: string;
  symbol: string;
  matchedData: any | null;
  triggeredAt: string;
  addedToWatchlist: boolean;
  error: string | null;
}

export interface CreateScannerRuleRequest {
  name: string;
  description?: string;
  condition: any;
  sourceWatchlistId?: string;
  sourceSymbols?: string[];
  targetWatchlistId: string;
  isActive?: boolean;
  schedule?: string;
  nextScanAt?: Date;
}

export interface UpdateScannerRuleRequest {
  name?: string;
  description?: string;
  condition?: any;
  sourceWatchlistId?: string | null;
  sourceSymbols?: string[] | null;
  targetWatchlistId?: string;
  isActive?: boolean;
  schedule?: string | null;
  nextScanAt?: Date | null;
}

/**
 * Fetch all scanner rules for the current user.
 */
export async function fetchScannerRules(): Promise<ScannerRule[]> {
  const response = await axios.get<ScannerRule[]>(`${API_BASE}/scanners`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Create a new scanner rule.
 */
export async function createScannerRule(data: CreateScannerRuleRequest): Promise<ScannerRule> {
  const response = await axios.post<ScannerRule>(`${API_BASE}/scanners`, data, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Fetch a specific scanner rule by ID.
 */
export async function fetchScannerRule(id: string): Promise<ScannerRule> {
  const response = await axios.get<ScannerRule>(`${API_BASE}/scanners/${id}`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Update a scanner rule.
 */
export async function updateScannerRule(
  id: string,
  data: UpdateScannerRuleRequest
): Promise<ScannerRule> {
  const response = await axios.put<ScannerRule>(`${API_BASE}/scanners/${id}`, data, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Delete a scanner rule.
 */
export async function deleteScannerRule(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/scanners/${id}`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
}

/**
 * Trigger a manual scan for a rule.
 */
export async function triggerScan(id: string): Promise<{ triggered: boolean; symbol?: string; data?: any }> {
  const response = await axios.post(`${API_BASE}/scanners/${id}/scan`, {}, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Fetch scan logs for a rule.
 */
export async function fetchScanLogs(ruleId: string, limit = 50): Promise<ScanLog[]> {
  const response = await axios.get<ScanLog[]>(`${API_BASE}/scanners/${ruleId}/logs`, {
    params: { limit },
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Trigger scanning for all active rules.
 */
export async function scanAllActiveRules(): Promise<{ message: string; results: any[] }> {
  const response = await axios.post(`${API_BASE}/scanners/scan/all`, {}, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

// ── Scan Run API (persisted scanner results) ──

export interface ScanResultItem {
  id: string;
  symbol: string;
  signalType: string;
  strength: number;
  description: string;
  explanation: string;
  stocks: string[];
  timestamp: string;
}

export interface ScanRunResponse {
  id: string;
  userId: string;
  createdAt: string;
  results: ScanResultItem[];
  noNewData?: boolean;
}

/**
 * Run a scan and persist results.
 */
export async function runScan(): Promise<ScanRunResponse> {
  const response = await axios.post<ScanRunResponse>(`${API_BASE}/scanner/run`, {}, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Fetch a stored scan run by ID.
 */
export async function fetchScanRun(id: string): Promise<ScanRunResponse> {
  const response = await axios.get<ScanRunResponse>(`${API_BASE}/scanner/${id}`, {
    headers: { 'x-user-id': TEST_USER_ID },
  });
  return response.data;
}

/**
 * Fetch the latest scan run for the current user.
 */
export async function fetchLatestScanRun(): Promise<ScanRunResponse | null> {
  try {
    const response = await axios.get<ScanRunResponse>(`${API_BASE}/scanner/latest`, {
      headers: { 'x-user-id': TEST_USER_ID },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}
