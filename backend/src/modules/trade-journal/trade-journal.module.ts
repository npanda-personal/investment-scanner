import { TradeJournalController } from './trade-journal.controller';
import { TradeJournalRepository } from './trade-journal.repository';
import { tradeJournalRouter } from './trade-journal.router';
import { TradeJournalService } from './trade-journal.service';

export const tradeJournalModule = {
  name: 'trade-journal',
  router: tradeJournalRouter,
  controller: TradeJournalController,
  service: TradeJournalService,
  repository: TradeJournalRepository,
};
