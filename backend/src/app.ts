import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { registerApiModules } from './api/routes';
import { errorHandler, notFoundHandler } from './shared/middleware';

export const createApp = (): express.Express => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  registerApiModules(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
