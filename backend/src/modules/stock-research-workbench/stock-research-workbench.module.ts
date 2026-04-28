import { StockResearchWorkbenchController } from './stock-research-workbench.controller';
import { stockResearchWorkbenchRouter } from './stock-research-workbench.router';
import { StockResearchWorkbenchService } from './stock-research-workbench.service';

export const stockResearchWorkbenchModule = {
  name: 'stock-research-workbench',
  router: stockResearchWorkbenchRouter,
  controller: StockResearchWorkbenchController,
  service: StockResearchWorkbenchService,
};
