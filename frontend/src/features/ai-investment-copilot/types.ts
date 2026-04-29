export type CopilotDataStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';

export interface CopilotSummaryResponse {
  title: string;
  summary: string;
  keyTakeaways: string[];
  bullishFactors: string[];
  bearishFactors: string[];
  riskFactors: string[];
  dataGaps: string[];
  suggestedNextReviews: string[];
  sourceModules: string[];
  generatedAt: string;
  dataStatus: CopilotDataStatus;
}
