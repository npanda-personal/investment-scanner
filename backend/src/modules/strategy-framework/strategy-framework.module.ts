import { strategyFrameworkRouter } from './strategy-framework.router';
import { StrategyFrameworkService } from './strategy-framework.service';

export const strategyFrameworkModule = {
  name: 'strategy-framework',
  router: strategyFrameworkRouter,
  service: new StrategyFrameworkService(),
};
