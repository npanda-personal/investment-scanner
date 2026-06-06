import axios from 'axios';
import type { ResearchRange, ResearchWorkbenchResponse } from '../types';

const API_BASE = '/api/v1/research';

/**
 * Returned when the backend has not yet computed a workbench snapshot for this
 * instrument (HTTP 202 with _status = 'NOT_YET_COMPUTED').  The FE must show
 * a friendly "being prepared" state rather than treating this as an error.
 */
export interface WorkbenchNotYetComputedResult {
  _status: 'NOT_YET_COMPUTED';
  message: string;
}

export function isWorkbenchNotYetComputed(
  result: ResearchWorkbenchResponse | WorkbenchNotYetComputedResult,
): result is WorkbenchNotYetComputedResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    '_status' in result &&
    (result as WorkbenchNotYetComputedResult)._status === 'NOT_YET_COMPUTED'
  );
}

export async function fetchStockResearchWorkbench(
  instrumentId: string,
  range: ResearchRange = '1Y'
): Promise<ResearchWorkbenchResponse | WorkbenchNotYetComputedResult> {
  // axios does NOT throw on 2xx status codes, so HTTP 202 lands here as a
  // normal response.  We check for the sentinel shape and return it typed.
  const response = await axios.get<ResearchWorkbenchResponse | WorkbenchNotYetComputedResult>(
    `${API_BASE}/stocks/${instrumentId}/workbench`,
    { params: { range } },
  );
  return response.data;
}
