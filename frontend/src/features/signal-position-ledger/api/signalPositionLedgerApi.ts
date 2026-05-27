import axios from 'axios';
import type {
  SignalPositionLedgerActiveListResponse,
  SignalPositionLedgerActiveQuery,
  SignalPositionLedgerRefreshProgress,
} from '../types';

const API_BASE = '/api/v1/signals/position-ledger';

export async function fetchSignalPositionLedgerActiveRows(
  query: SignalPositionLedgerActiveQuery,
): Promise<SignalPositionLedgerActiveListResponse> {
  const response = await axios.get<SignalPositionLedgerActiveListResponse>(`${API_BASE}/active`, { params: query });
  return response.data;
}

export async function refreshSignalPositionLedgerActiveRows(
  query: SignalPositionLedgerActiveQuery,
): Promise<SignalPositionLedgerRefreshProgress> {
  const response = await axios.post<SignalPositionLedgerRefreshProgress>(`${API_BASE}/active/refresh`, query);
  return response.data;
}
