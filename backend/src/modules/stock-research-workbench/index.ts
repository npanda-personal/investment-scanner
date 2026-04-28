export { stockResearchWorkbenchModule } from './stock-research-workbench.module';
export {
  createStockResearchWorkbenchRouter,
  default as stockResearchWorkbenchRouter,
  stockResearchWorkbenchRouter as stockResearchWorkbenchRouterInstance,
} from './stock-research-workbench.router';
export { StockResearchWorkbenchController } from './stock-research-workbench.controller';
export { StockResearchWorkbenchService } from './stock-research-workbench.service';
export {
  normalizeResearchRange,
  RESEARCH_RANGES,
  validateInstrumentId,
} from './stock-research-workbench.validation';
export type {
  ResearchPerformanceMetrics,
  ResearchPricePoint,
  ResearchRange,
  ResearchWorkbenchResponse,
} from './stock-research-workbench.types';
