import axios from 'axios';
import type { ResearchRange, ResearchWorkbenchResponse } from '../types';

const API_BASE = '/api/v1/research';

export async function fetchStockResearchWorkbench(
  instrumentId: string,
  range: ResearchRange = '1Y'
): Promise<ResearchWorkbenchResponse> {
  const response = await axios.get<ResearchWorkbenchResponse>(`${API_BASE}/stocks/${instrumentId}/workbench`, {
    params: { range },
  });
  return response.data;
}
