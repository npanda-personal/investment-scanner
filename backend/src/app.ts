import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { registerApiModules } from './api/routes';
import { errorHandler, notFoundHandler } from './shared/middleware';
import { poolContext } from './db/prisma';

export const createApp = (): express.Express => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Every HTTP request runs in the 'api' pool context, so user-facing queries use
  // the dedicated API connection pool. Background/pipeline work (no context) uses
  // the pipeline pool by default — see src/db/prisma.ts.
  app.use((_req, _res, next) => poolContext.run('api', () => next()));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  registerApiModules(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
