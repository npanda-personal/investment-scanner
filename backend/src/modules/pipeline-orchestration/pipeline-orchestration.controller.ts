import type { Request, Response } from 'express';
import { PipelineOrchestrationService } from './pipeline-orchestration.service';
import { parsePipelineStatusQuery } from './pipeline-orchestration.validation';

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
}
