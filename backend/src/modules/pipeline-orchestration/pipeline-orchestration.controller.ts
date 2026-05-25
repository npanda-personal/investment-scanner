import type { Request, Response } from 'express';
import { PipelineCommandError, PipelineOrchestrationService } from './pipeline-orchestration.service';
import {
  parsePipelineCommandCatalogQuery,
  parsePipelineCommandRequest,
  parsePipelineStatusQuery,
} from './pipeline-orchestration.validation';

export class PipelineOrchestrationController {
  constructor(private readonly service = new PipelineOrchestrationService()) {}

  status = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await this.service.status(parsePipelineStatusQuery(req.query as Record<string, unknown>)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load pipeline status';
      return res.status(400).json({ error: message });
    }
  };

  commandCatalog = async (req: Request, res: Response) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(this.service.commandCatalog(parsePipelineCommandCatalogQuery(req.query as Record<string, unknown>)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load pipeline command catalog';
      return res.status(400).json({ error: message });
    }
  };

  executeCommand = async (req: Request, res: Response) => {
    let payload;
    try {
      payload = parsePipelineCommandRequest({ ...(req.body as Record<string, unknown> || {}), ...(req.query as Record<string, unknown> || {}) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid pipeline command payload';
      return res.status(400).json({ error: message });
    }

    try {
      const requestedByUserId = String((req as any)?.user?.id || '').trim() || 'local-manual-operator';
      const result = await this.service.executeCommand(payload, { requestedByUserId });
      return res.json(result);
    } catch (error) {
      if (error instanceof PipelineCommandError) {
        if (error.payload) return res.status(error.statusCode).json(error.payload);
        return res.status(error.statusCode).json({ error: error.message });
      }
      const message = error instanceof Error ? error.message : 'Failed to execute pipeline command';
      return res.status(500).json({ error: message });
    }
  };
}
