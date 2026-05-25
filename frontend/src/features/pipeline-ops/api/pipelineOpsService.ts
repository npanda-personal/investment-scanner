import axios from 'axios';
import type { PipelineStatusQuery, PipelineStatusSnapshot } from '../types';

const API_BASE = '/api/v1/pipeline/status';

export async function fetchPipelineStatus(query: PipelineStatusQuery): Promise<PipelineStatusSnapshot> {
  const response = await axios.get<PipelineStatusSnapshot>(API_BASE, {
    params: {
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      limit: 100,
      ...query,
    },
  });
  return response.data;
}
