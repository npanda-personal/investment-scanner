/**
 * Seed script: refreshPortfolioIntelligence for all real portfolios.
 * Run: npx ts-node src/scripts/seedPortfolioIntelligence.ts
 */
import prisma from '../db/prisma';
import { PortfolioIntelligenceService } from '../modules/portfolio-intelligence/portfolio-intelligence.service';

async function main() {
  const portfolios = await prisma.portfolio.findMany({ select: { id: true, name: true } });
  console.log(`Found ${portfolios.length} portfolio(s).`);

  const svc = new PortfolioIntelligenceService();

  for (const p of portfolios) {
    console.log(`\nRefreshing "${p.name}" (${p.id}) ...`);
    const result = await svc.refreshPortfolioIntelligence(p.id, 'default-user');
    if (!result) {
      console.log('  -> null (portfolio has no holdings or not found)');
    } else {
      console.log(`  -> healthScore=${result.healthScore} status=${result.status} holdings=${result.holdings.length} redFlags=${result.redFlags.length} generatedAt=${result.generatedAt}`);
    }
  }

  // Verify rows persisted
  const rows = await prisma.portfolioIntelligenceSnapshot.findMany({
    select: { portfolioId: true, healthScore: true, status: true, computedAt: true },
  });
  console.log(`\nRows in portfolio_intelligence_snapshots: ${rows.length}`);
  for (const row of rows) {
    console.log(`  portfolioId=${row.portfolioId} healthScore=${row.healthScore} status=${row.status} computedAt=${row.computedAt.toISOString()}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
