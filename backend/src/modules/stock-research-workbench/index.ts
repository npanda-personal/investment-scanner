export { stockResearchWorkbenchModule } from './stock-research-workbench.module';
export {
  createStockResearchWorkbenchRouter,
  default as stockResearchWorkbenchRouter,
  stockResearchWorkbenchRouter as stockResearchWorkbenchRouterInstance,
} from './stock-research-workbench.router';
export { StockResearchWorkbenchController } from './stock-research-workbench.controller';
export { StockResearchWorkbenchService, WORKBENCH_NOT_YET_COMPUTED } from './stock-research-workbench.service';
export { WorkbenchRefreshService } from './workbench-refresh.service';
export { WorkbenchSnapshotRepository } from './workbench-snapshot.repository';
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
