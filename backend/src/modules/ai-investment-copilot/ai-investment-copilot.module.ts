import { AiInvestmentCopilotController } from './ai-investment-copilot.controller';
import { aiInvestmentCopilotRouter } from './ai-investment-copilot.router';
import { AiInvestmentCopilotService } from './ai-investment-copilot.service';

export const aiInvestmentCopilotModule = {
  name: 'ai-investment-copilot',
  router: aiInvestmentCopilotRouter,
  controller: AiInvestmentCopilotController,
  service: AiInvestmentCopilotService,
};
