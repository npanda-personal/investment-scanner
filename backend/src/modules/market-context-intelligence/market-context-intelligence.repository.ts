import { PrismaClient } from '@prisma/client';
import prisma from '../../db/prisma';
import type { 
  MarketContextSummary, 
  MarketRegimeSummary, 
  SectorRotationItem, 
  MarketBreadth, 
  CountryStrengthItem,
  MacroSnapshot
} from './market-context-intelligence.types';

export class MarketContextIntelligenceRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async latestSnapshot(): Promise<MarketContextSummary | null> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [market, sectors, countries] = await Promise.all([
      this.db.marketContextSnapshot.findUnique({ where: { snapshotDate: today } }),
      this.db.sectorContextSnapshot.findMany({ where: { snapshotDate: today }, orderBy: { relativeStrengthScore: 'desc' } }),
      this.db.countryContextSnapshot.findMany({ where: { snapshotDate: today }, orderBy: { relativeStrengthScore: 'desc' } })
    ]);

    if (!market) return null;

    const regime: MarketRegimeSummary = {
      regime: market.regime as any,
      score: market.regimeScore,
      explanation: market.explanation || '',
      updatedAt: market.updatedAt.toISOString(),
      dataStatus: market.dataStatus as any,
    };

    const breadth: MarketBreadth = {
      percentAboveSma50: market.breadthPercentAboveSma50,
      percentAboveSma200: market.breadthPercentAboveSma200,
      advanceDeclineRatio: market.advanceDeclineRatio,
      newHigh52WeekCount: market.newHighCount || 0,
      newLow52WeekCount: market.newLowCount || 0,
      bullishSignalCount: 0, // This isn't on the market snapshot model directly, but could be.
      bearishSignalCount: 0,
      instrumentCount: 0,
      dataStatus: market.dataStatus as any,
    };

    const mappedSectors: SectorRotationItem[] = sectors.map(s => ({
      sector: s.sector,
      return1M: s.oneMonthReturn,
      return3M: s.threeMonthReturn,
      return6M: s.sixMonthReturn,
      relativeStrengthScore: s.relativeStrengthScore,
      instrumentCount: s.instrumentCount,
      bullishSignalCount: s.bullishSignalCount || 0,
      bearishSignalCount: s.bearishSignalCount || 0,
      leadershipStatus: s.leadershipStatus as any,
    }));

    const mappedCountries: CountryStrengthItem[] = countries.map(c => ({
      country: c.country,
      return1M: c.oneMonthReturn,
      return3M: c.threeMonthReturn,
      return6M: c.sixMonthReturn,
      relativeStrengthScore: c.relativeStrengthScore,
      instrumentCount: 0,
      bullishSignalCount: c.bullishSignalCount || 0,
    }));

    const macro: MacroSnapshot = {
      interestRateProxy: null,
      inflationProxy: null,
      usdStrengthProxy: null,
      commodityProxy: null,
      macroStatus: (market.macroStatus as any) || 'UNKNOWN',
      dataStatus: 'MISSING',
      explanation: 'Macro providers are not configured yet.',
    };

    return {
      regime,
      topSectors: mappedSectors.slice(0, 5),
      weakSectors: mappedSectors.slice(-5).reverse(),
      breadth,
      countryStrength: mappedCountries.slice(0, 8),
      macro,
      explanation: [market.explanation || ''],
      updatedAt: market.updatedAt.toISOString(),
      dataStatus: market.dataStatus as any,
    };
  }

  async saveSnapshot(summary: MarketContextSummary): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.db.$transaction([
      this.db.marketContextSnapshot.upsert({
        where: { snapshotDate: today },
        create: {
          snapshotDate: today,
          regime: summary.regime.regime,
          regimeScore: summary.regime.score,
          breadthPercentAboveSma50: summary.breadth.percentAboveSma50,
          breadthPercentAboveSma200: summary.breadth.percentAboveSma200,
          advanceDeclineRatio: summary.breadth.advanceDeclineRatio,
          newHighCount: summary.breadth.newHigh52WeekCount,
          newLowCount: summary.breadth.newLow52WeekCount,
          macroStatus: summary.macro.macroStatus,
          explanation: summary.regime.explanation,
          source: 'market-context-intelligence',
          dataStatus: summary.regime.dataStatus,
        },
        update: {
          regime: summary.regime.regime,
          regimeScore: summary.regime.score,
          breadthPercentAboveSma50: summary.breadth.percentAboveSma50,
          breadthPercentAboveSma200: summary.breadth.percentAboveSma200,
          advanceDeclineRatio: summary.breadth.advanceDeclineRatio,
          newHighCount: summary.breadth.newHigh52WeekCount,
          newLowCount: summary.breadth.newLow52WeekCount,
          macroStatus: summary.macro.macroStatus,
          explanation: summary.regime.explanation,
          dataStatus: summary.regime.dataStatus,
        }
      }),
      ...summary.topSectors.concat(summary.weakSectors).map(s => 
        this.db.sectorContextSnapshot.upsert({
          where: {
            snapshotDate_sector: {
              snapshotDate: today,
              sector: s.sector
            }
          },
          create: {
            snapshotDate: today,
            sector: s.sector,
            oneMonthReturn: s.return1M,
            threeMonthReturn: s.return3M,
            sixMonthReturn: s.return6M,
            relativeStrengthScore: s.relativeStrengthScore,
            instrumentCount: s.instrumentCount,
            bullishSignalCount: s.bullishSignalCount,
            bearishSignalCount: s.bearishSignalCount,
            leadershipStatus: s.leadershipStatus,
            source: 'market-context-intelligence',
            dataStatus: 'COMPLETE',
          },
          update: {
            oneMonthReturn: s.return1M,
            threeMonthReturn: s.return3M,
            sixMonthReturn: s.return6M,
            relativeStrengthScore: s.relativeStrengthScore,
            instrumentCount: s.instrumentCount,
            bullishSignalCount: s.bullishSignalCount,
            bearishSignalCount: s.bearishSignalCount,
            leadershipStatus: s.leadershipStatus,
          }
        })
      ),
      ...summary.countryStrength.map(c => 
        this.db.countryContextSnapshot.upsert({
          where: {
            snapshotDate_country: {
              snapshotDate: today,
              country: c.country
            }
          },
          create: {
            snapshotDate: today,
            country: c.country,
            oneMonthReturn: c.return1M,
            threeMonthReturn: c.return3M,
            sixMonthReturn: c.return6M,
            relativeStrengthScore: c.relativeStrengthScore,
            bullishSignalCount: c.bullishSignalCount,
            bearishSignalCount: 0,
            source: 'market-context-intelligence',
            dataStatus: 'COMPLETE',
          },
          update: {
            oneMonthReturn: c.return1M,
            threeMonthReturn: c.return3M,
            sixMonthReturn: c.return6M,
            relativeStrengthScore: c.relativeStrengthScore,
            bullishSignalCount: c.bullishSignalCount,
          }
        })
      )
    ]);
  }
}
