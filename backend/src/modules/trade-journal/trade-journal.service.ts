// Research-support service — records human decisions; does not issue buy/sell recommendations.
import { TradeJournalRepository } from './trade-journal.repository';
import type {
  CreateTradeJournalEntryRequest,
  PostMortemDto,
  TradeJournalListFilters,
  UpdateTradeJournalEntryRequest,
} from './trade-journal.types';
import { validateCreateEntry, validateUpdateEntry } from './trade-journal.validation';

export class TradeJournalService {
  constructor(private readonly repository = new TradeJournalRepository()) {}

  async create(input: CreateTradeJournalEntryRequest, userId: string) {
    const errors = validateCreateEntry(input);
    if (errors.length > 0) throw new Error(errors.join('; '));
    return this.repository.create(input, userId);
  }

  async list(userId: string, filters: TradeJournalListFilters) {
    const { entries, total } = await this.repository.list(userId, filters);
    return {
      entries,
      total,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
      source: 'trade-journal',
      generatedAt: new Date().toISOString(),
    };
  }

  async getById(id: string, userId: string) {
    return this.repository.findById(id, userId);
  }

  async update(id: string, input: UpdateTradeJournalEntryRequest, userId: string) {
    const errors = validateUpdateEntry(input);
    if (errors.length > 0) throw new Error(errors.join('; '));
    return this.repository.update(id, input, userId);
  }

  async delete(id: string, userId: string) {
    return this.repository.delete(id, userId);
  }

  /**
   * Post-mortem: all metrics are computed from PERSISTED journal rows only.
   * No on-GET recomputation of signal logic — read-only from trade_journal_entries.
   *
   * Metrics:
   * - Counts by decision and outcome status
   * - Acted win-rate: (ACTED + CLOSED + realizedReturnPct > 0) / (ACTED + CLOSED)
   * - Avg realized return: mean of realizedReturnPct for ACTED+CLOSED entries
   * - Missed/avoided count: SKIPPED or WATCHING entries with a linked sourceSignalId
   *   (directional awareness — not a quantified edge claim)
   */
  async postMortem(userId: string): Promise<PostMortemDto> {
    const { all } = await this.repository.postMortemRows(userId);

    const totalEntries = all.length;

    // By decision
    const decisionMap: Record<string, number> = {};
    for (const row of all) {
      decisionMap[row.decision] = (decisionMap[row.decision] ?? 0) + 1;
    }
    const byDecision = Object.entries(decisionMap).map(([decision, count]) => ({
      decision: decision as any,
      count,
    }));

    // By outcome
    const outcomeMap: Record<string, number> = {};
    for (const row of all) {
      const key = row.outcomeStatus ?? 'NONE';
      outcomeMap[key] = (outcomeMap[key] ?? 0) + 1;
    }
    const byOutcome = Object.entries(outcomeMap).map(([outcomeStatus, count]) => ({
      outcomeStatus: outcomeStatus as any,
      count,
    }));

    // Acted + Closed rows
    const actedClosed = all.filter((r) => r.decision === 'ACTED' && r.outcomeStatus === 'CLOSED');
    const actedClosedCount = actedClosed.length;
    const actedWinCount = actedClosed.filter((r) => r.realizedReturnPct !== null && r.realizedReturnPct > 0).length;
    const actedWinRate = actedClosedCount > 0 ? actedWinCount / actedClosedCount : null;

    const returnsWithData = actedClosed.filter((r) => r.realizedReturnPct !== null).map((r) => r.realizedReturnPct as number);
    const actedAvgReturnPct =
      returnsWithData.length > 0 ? returnsWithData.reduce((s, v) => s + v, 0) / returnsWithData.length : null;

    // Missed/avoided: SKIPPED or WATCHING entries linked to a signal
    const missedAvoided = all.filter(
      (r) => (r.decision === 'SKIPPED' || r.decision === 'WATCHING') && r.sourceSignalId !== null,
    );
    const missedAvoidedCount = missedAvoided.length;

    return {
      totalEntries,
      byDecision,
      byOutcome,
      actedClosedCount,
      actedWinCount,
      actedWinRate,
      actedAvgReturnPct,
      missedAvoidedCount,
      missedAvoidedNote:
        'Count of SKIPPED/WATCHING entries linked to a signal source. ' +
        'Review these entries manually to reflect on missed opportunities or avoided losses. ' +
        'No automated P&L or edge claim is made from this count.',
      source: 'trade-journal',
      generatedAt: new Date().toISOString(),
      dataNote:
        `Post-mortem computed from ${totalEntries} persisted journal entries for this user. ` +
        `Acted+Closed sample for win-rate: ${actedClosedCount} entries. ` +
        `This module supports research and self-reflection only; it does not constitute investment advice.`,
    };
  }
}
