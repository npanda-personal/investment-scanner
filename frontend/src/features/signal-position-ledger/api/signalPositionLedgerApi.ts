import axios from 'axios';
import type { SignalPositionLedgerActiveListResponse, SignalPositionLedgerActiveQuery } from '../types';

const API_BASE = '/api/v1/signals/position-ledger';

export async function fetchSignalPositionLedgerActiveRows(
  query: SignalPositionLedgerActiveQuery,
): Promise<SignalPositionLedgerActiveListResponse> {
  const response = await axios.get<SignalPositionLedgerActiveListResponse>(`${API_BASE}/active`, { params: query });
  return response.data;
}
