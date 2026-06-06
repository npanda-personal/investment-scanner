import prisma from '../../db/prisma';
import type { PortfolioIntelligenceResponse } from './portfolio-intelligence.types';

/**
 * Thin data-access layer for portfolio_intelligence_snapshots.
 *
 * One snapshot row per portfolio — always upserted on refresh.
 * Reads return the full PortfolioIntelligenceResponse from payloadJson.
 */
export class PortfolioIntelligenceRepository {
  /**
   * Upsert the full intelligence payload for a portfolio.
   * Called by refreshPortfolioIntelligence() — never from a GET path.
   */
  async upsertSnapshot(payload: PortfolioIntelligenceResponse): Promise<void> {
    const now = new Date(payload.generatedAt);
    await prisma.portfolioIntelligenceSnapshot.upsert({
      where: { portfolioId: payload.portfolioId },
      create: {
        id: require('crypto').randomUUID(),
        portfolioId: payload.portfolioId,
        computedAt: now,
        healthScore: payload.healthScore,
        status: payload.status,
        payloadJson: payload as any,
        updatedAt: now,
      },
      update: {
        computedAt: now,
        healthScore: payload.healthScore,
        status: payload.status,
        payloadJson: payload as any,
        updatedAt: now,
      },
    });
  }

  /**
   * Return the latest persisted snapshot for a portfolio, or null when absent.
   */
  async findByPortfolioId(portfolioId: string): Promise<PortfolioIntelligenceResponse | null> {
    const row = await prisma.portfolioIntelligenceSnapshot.findUnique({
      where: { portfolioId },
    });
    if (!row) return null;
    return row.payloadJson as unknown as PortfolioIntelligenceResponse;
  }

  /**
   * Return only the computedAt timestamp for a portfolio's snapshot,
   * without parsing the full payloadJson.  Used by staleness guards.
   * Returns null when no snapshot exists.
   */
  async findComputedAt(portfolioId: string): Promise<Date | null> {
    const row = await prisma.portfolioIntelligenceSnapshot.findUnique({
      where: { portfolioId },
      select: { computedAt: true },
    });
    return row?.computedAt ?? null;
  }
}
