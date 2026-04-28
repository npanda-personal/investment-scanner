import { BacktestingStrategyLabController } from './backtesting-strategy-lab.controller';
import { BacktestingStrategyLabRepository } from './backtesting-strategy-lab.repository';
import { backtestingStrategyLabRouter } from './backtesting-strategy-lab.router';
import { BacktestingStrategyLabService } from './backtesting-strategy-lab.service';

export const backtestingStrategyLabModule = {
  name: 'backtesting-strategy-lab',
  router: backtestingStrategyLabRouter,
  controller: BacktestingStrategyLabController,
  service: BacktestingStrategyLabService,
  repository: BacktestingStrategyLabRepository,
};
