import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  cacheEnabled: boolean;
  redisUrl: string;
}

const parsePort = (value: string | undefined): number => {
  const fallbackPort = 3000;
  if (!value) {
    return fallbackPort;
  }

  const parsedPort = Number(value);
  return Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : fallbackPort;
};

export const appConfig: AppConfig = {
  port: parsePort(process.env.PORT),
  cacheEnabled: process.env.CACHE_ENABLED === 'true',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
};
