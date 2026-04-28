import { PortfolioManagementController } from './portfolio-management.controller';
import { PortfolioManagementRepository } from './portfolio-management.repository';
import { portfolioManagementRouter } from './portfolio-management.router';
import { PortfolioManagementService } from './portfolio-management.service';

export const portfolioManagementModule = {
  name: 'portfolio-management',
  router: portfolioManagementRouter,
  controller: PortfolioManagementController,
  service: PortfolioManagementService,
  repository: PortfolioManagementRepository,
};

