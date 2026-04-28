import marketDataFoundationRouter from './market-data-foundation.router';
import { MarketDataFoundationService } from './market-data-foundation.service';
import { MarketDataFoundationRepository } from './market-data-foundation.repository';
import { MarketDataFoundationController } from './market-data-foundation.controller';

export const marketDataFoundationModule = {
  router: marketDataFoundationRouter,
  service: MarketDataFoundationService,
  repository: MarketDataFoundationRepository,
  controller: MarketDataFoundationController,
};
