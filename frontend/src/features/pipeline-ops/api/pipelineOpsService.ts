import axios from 'axios';
import type {
  PipelineCommandCatalogResponse,
  PipelineCommandRequest,
  PipelineCommandResponse,
  PipelineStatusQuery,
  PipelineStatusSnapshot,
} from '../types';

const STATUS_API_BASE = '/api/v1/pipeline/status';
const COMMAND_CATALOG_API_BASE = '/api/v1/pipeline/commands/catalog';
const COMMAND_API_BASE = '/api/v1/pipeline/commands';

export async function fetchPipelineStatus(query: PipelineStatusQuery): Promise<PipelineStatusSnapshot> {
  const response = await axios.get<PipelineStatusSnapshot>(STATUS_API_BASE, {
    params: {
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      limit: 100,
      ...query,
    },
  });
  return response.data;
}

export async function fetchPipelineCommandCatalog(query: PipelineStatusQuery): Promise<PipelineCommandCatalogResponse> {
  const response = await axios.get<PipelineCommandCatalogResponse>(COMMAND_CATALOG_API_BASE, {
    params: {
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      ...query,
    },
  });
  return response.data;
}

export async function executePipelineCommand(request: PipelineCommandRequest): Promise<PipelineCommandResponse> {
  const response = await axios.post<PipelineCommandResponse>(COMMAND_API_BASE, {
    timeframe: '1d',
    pipelineKey: 'market-intelligence',
    ...request,
  });
  return response.data;
}
