import http from 'http';
import { createApp } from './app';
import { appConfig } from './config/env';

export const createHttpServer = (): http.Server => {
  const app = createApp();
  return http.createServer(app);
};

export const startServer = (port = appConfig.port): http.Server => {
  const server = createHttpServer();

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  return server;
};
