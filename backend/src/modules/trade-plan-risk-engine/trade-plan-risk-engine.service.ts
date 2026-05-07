import { TradePlanRiskEngineRepository } from './trade-plan-risk-engine.repository';
import type { GenerateTradePlanRequest, TradePlanResultDto, TradePlanModelRules, EntryZone, StopLoss, Target, BatchGenerateTradePlanRequest, TradePlanListQuery } from './trade-plan-risk-engine.types';
import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { MarketDataFoundationService } from '../market-data-foundation/market-data-foundation.service';
import { PortfolioManagementService } from '../portfolio-management';

export class TradePlanRiskEngineService {
  private repository = new TradePlanRiskEngineRepository();
  private strategyDecisionService = new StrategyDecisionEngineService();
  private marketDataService = new MarketDataFoundationService();
  private portfolioService = new PortfolioManagementService();

  getModelRules(): TradePlanModelRules {
    return {
      defaultRiskPercent: 1,
      minRiskPercent: 0.25,
      maxRiskPercent: 5,
      defaultRewardRiskTarget: 2,
      maxSinglePositionExposurePercent: 10,
      maxSectorExposurePercent: 30,
    };
  }

  async generatePlan(request: GenerateTradePlanRequest): Promise<TradePlanResultDto> {
    const { instrumentId, symbol, strategyDecisionId, portfolioId, riskPercent, capitalBase, targetRewardRisk } = request;
    const rules = this.getModelRules();

    const result: TradePlanResultDto = {
      instrumentId,
      symbol,
      strategy: 'UNKNOWN',
      strategyVersion: '1.0.0',
      strategyDecisionId: strategyDecisionId || null,
      portfolioId: portfolioId || null,
      planStatus: 'VALID',
      riskGrade: 'UNDEFINED',
      entryZone: null,
      stopLoss: null,
      target: null,
      rewardRiskRatio: 0,
      positionSizing: null,
      portfolioImpact: null,
      invalidationRules: [],
      warnings: [],
      blockers: [],
      dataGaps: [],
      generatedAt: new Date().toISOString(),
      modelVersion: 'trade-plan-risk-v1',
    };

    try {
      // 1. Fetch Decision
      let decision: any = null;
      if (strategyDecisionId) {
        // Find in history
        const history = await this.strategyDecisionService.history(instrumentId);
        decision = history.find((d: any) => d.id === strategyDecisionId);
      } else {
        decision = await this.strategyDecisionService.latestForInstrument(instrumentId);
      }

      if (!decision) {
        result.planStatus = 'BLOCKED';
        result.blockers.push('No Strategy Decision found for instrument.');
        return await this.repository.upsert(result);
      }

      result.strategy = decision.strategy;
      result.strategyVersion = decision.strategyVersion || '1.0.0';
      result.strategyDecisionId = decision.id;

      if (!['CANDIDATE', 'WATCH'].includes(decision.decision)) {
        result.planStatus = 'BLOCKED';
        result.blockers.push(`Strategy Decision is ${decision.decision}, expected CANDIDATE or WATCH.`);
      }

      if (decision.marketGateStatus === 'CLOSED') {
        result.planStatus = 'BLOCKED';
        result.blockers.push('Market gate is CLOSED for long entries.');
      }

      // 2. Fetch Market Data
      const latestPriceResult = await this.marketDataService.latestPriceByInstrumentId(instrumentId, {});
      if (!latestPriceResult || !latestPriceResult.latest || !latestPriceResult.latest.close) {
        result.planStatus = 'INSUFFICIENT_DATA';
        result.blockers.push('Missing latest price.');
        result.dataGaps.push('latest_price');
        return await this.repository.upsert(result);
      }

      const currentPrice = Number(latestPriceResult.latest.close);
      
      // Fetch prices for SMA/Swing logic
      const limit = 60;
      const pricesDto = await this.marketDataService.listPricesByInstrumentId(instrumentId, limit, undefined, undefined, {});
      const prices = pricesDto?.prices || [];
      
      let sma50 = null;
      if (prices.length >= 50) {
         const sum = prices.slice(0, 50).reduce((a: number, b: any) => a + Number(b.close), 0);
         sma50 = sum / 50;
      } else {
         result.dataGaps.push('sma50');
      }

      // 3. Entry Zone
      let entryZone: EntryZone = {
        type: 'CURRENT_PRICE',
        referencePrice: currentPrice,
        preferredEntryMin: currentPrice * 0.99,
        preferredEntryMax: currentPrice * 1.01,
        rationale: 'Entry near current price.',
      };

      if (decision.entryZone) {
         entryZone.preferredEntryMin = decision.entryZone.preferredEntryMin || currentPrice;
         entryZone.preferredEntryMax = decision.entryZone.preferredEntryMax || currentPrice;
         entryZone.rationale = decision.entryZone.rationale || entryZone.rationale;
         if (decision.strategy === 'PULLBACK_IN_UPTREND') entryZone.type = 'PULLBACK';
         if (decision.strategy === 'BREAKOUT_CONFIRMATION') entryZone.type = 'BREAKOUT';
      } else {
         if (decision.strategy === 'TREND_MOMENTUM') {
            if (sma50 && currentPrice > sma50 * 1.1) {
               result.warnings.push('Price is far above SMA50, consider waiting for pullback.');
            }
         } else if (decision.strategy === 'PULLBACK_IN_UPTREND') {
            entryZone.type = 'PULLBACK';
            if (sma50) {
               entryZone.preferredEntryMin = sma50 * 0.98;
               entryZone.preferredEntryMax = sma50 * 1.02;
               entryZone.rationale = 'Preferred entry near SMA50 pullback support.';
               if (currentPrice > sma50 * 1.05) {
                 result.planStatus = 'WATCH';
                 result.warnings.push('Price is currently too far above SMA50 for optimal pullback entry.');
               }
            } else {
               result.dataGaps.push('sma50_for_pullback');
               entryZone.type = 'UNKNOWN';
            }
         }
      }
      result.entryZone = entryZone;

      // 4. Stop Loss
      let stopLoss: StopLoss = {
         price: 0,
         percentBelowEntry: 0,
         method: 'UNKNOWN',
         rationale: '',
      };
      
      const entryPrice = (entryZone.preferredEntryMin + entryZone.preferredEntryMax) / 2;

      // recent swing low approximation
      let recentSwingLow = currentPrice;
      if (prices.length >= 10) {
         recentSwingLow = Math.min(...prices.slice(0, 10).map((p: any) => Number(p.low)));
      }

      if (recentSwingLow < entryPrice * 0.99 && recentSwingLow > entryPrice * 0.8) {
         stopLoss = {
            price: recentSwingLow,
            percentBelowEntry: (entryPrice - recentSwingLow) / entryPrice * 100,
            method: 'RECENT_SWING_LOW',
            rationale: 'Stop placed below recent 10-day swing low.',
         };
      } else if (sma50 && sma50 < entryPrice * 0.99 && sma50 > entryPrice * 0.8) {
         stopLoss = {
            price: sma50 * 0.99,
            percentBelowEntry: (entryPrice - (sma50 * 0.99)) / entryPrice * 100,
            method: 'SMA50',
            rationale: 'Stop placed 1% below SMA50 support.',
         };
      } else {
         const fallbackPercent = 0.05;
         stopLoss = {
            price: entryPrice * (1 - fallbackPercent),
            percentBelowEntry: fallbackPercent * 100,
            method: 'FIXED_PERCENT',
            rationale: 'Fallback fixed percentage stop loss used due to insufficient structure.',
         };
      }
      result.stopLoss = stopLoss;

      // 5. Target
      const riskPerShare = entryPrice - stopLoss.price;
      if (riskPerShare <= 0) {
         result.planStatus = 'BLOCKED';
         result.blockers.push('Invalid stop loss geometry. Cannot compute risk safely.');
      }
      
      const tRr = targetRewardRisk || rules.defaultRewardRiskTarget;
      const targetPrice = entryPrice + (riskPerShare * tRr);
      
      const target: Target = {
         price: targetPrice,
         expectedReturnPercent: (targetPrice - entryPrice) / entryPrice * 100,
         method: 'REWARD_RISK_MULTIPLE',
         rationale: `Target set to ${tRr}R multiple of risk.`,
      };
      result.target = target;

      // 6. Reward/Risk
      let rrRatio = 0;
      if (riskPerShare > 0) {
         rrRatio = (target.price - entryPrice) / riskPerShare;
      }
      result.rewardRiskRatio = Number(rrRatio.toFixed(2));

      if (result.rewardRiskRatio < 1.0) {
         if (result.planStatus !== 'BLOCKED') {
            result.planStatus = 'BLOCKED';
         }
         result.blockers.push('Reward/Risk ratio is below 1.0. Plan blocked.');
      } else if (result.rewardRiskRatio < 1.5) {
         result.warnings.push('HIGH risk warning: Reward/Risk is between 1.0 and 1.5.');
      }

      // 7. Position Sizing & Portfolio Impact
      if (portfolioId || capitalBase) {
         let effectiveCapital = capitalBase || 0;
         let portfolioData: any = null;

         if (portfolioId) {
            portfolioData = await this.portfolioService.getPortfolioDetail(portfolioId, 'default-user'); // auth handled at controller
            if (portfolioData) {
               effectiveCapital = Number(portfolioData.totalValue) || effectiveCapital;
            } else {
               result.warnings.push('Selected portfolio could not be loaded.');
            }
         }

         if (effectiveCapital > 0 && riskPerShare > 0) {
            const rPercent = riskPercent || rules.defaultRiskPercent;
            const maxRiskAmt = effectiveCapital * (rPercent / 100);
            const qty = Math.floor(maxRiskAmt / riskPerShare);
            const estimatedPosValue = qty * entryPrice;
            const posValuePct = (estimatedPosValue / effectiveCapital) * 100;

            result.positionSizing = {
               portfolioId: portfolioId || null,
               capitalBase: effectiveCapital,
               riskPercent: rPercent,
               maxRiskAmount: maxRiskAmt,
               suggestedQuantity: qty,
               estimatedPositionValue: estimatedPosValue,
               positionValuePercent: posValuePct,
               notes: [],
            };

            if (portfolioData) {
               let singleExp = posValuePct;
               result.portfolioImpact = {
                  sectorExposureAfterTrade: null, // Hard to calculate without sector data mapped easily
                  singlePositionExposureAfterTrade: singleExp,
                  warnings: [],
               };

               const existingHolding = portfolioData.holdings?.find((h: any) => h.instrumentId === instrumentId);
               if (existingHolding) {
                  result.portfolioImpact.warnings.push('Instrument already held in portfolio. Averaging rules apply.');
                  singleExp += Number(existingHolding.allocationPercent || 0);
                  result.portfolioImpact.singlePositionExposureAfterTrade = singleExp;
               }

               if (singleExp > rules.maxSinglePositionExposurePercent) {
                  result.portfolioImpact.warnings.push(`Position size exceeds max single position exposure limit of ${rules.maxSinglePositionExposurePercent}%.`);
                  result.warnings.push('Portfolio concentration warning.');
               }
            }
         } else {
            result.dataGaps.push('position_sizing_params');
         }
      } else {
         result.dataGaps.push('capital_base_for_sizing');
      }

      // 8. Risk Grade
      if (result.planStatus === 'INSUFFICIENT_DATA') {
         result.riskGrade = 'UNDEFINED';
      } else if (result.planStatus === 'BLOCKED') {
         result.riskGrade = 'HIGH';
      } else {
         if (result.rewardRiskRatio >= 2.0 && result.warnings.length === 0 && decision.strategyRating === 'EXCELLENT') {
            result.riskGrade = 'LOW';
         } else if (result.rewardRiskRatio >= 1.5 && result.warnings.length <= 2) {
            result.riskGrade = 'MEDIUM';
         } else {
            result.riskGrade = 'HIGH';
         }
      }

      // 9. Invalidation Rules
      result.invalidationRules.push(`Daily close below stop loss level of ${stopLoss.price.toFixed(2)}.`);
      if (decision.strategy === 'BREAKOUT_CONFIRMATION') {
         result.invalidationRules.push('Breakout fails and price closes back inside the previous range base.');
      }
      
      if (result.blockers.length > 0) {
         result.invalidationRules.push('Plan is currently blocked. Consider review later.');
      }

      return await this.repository.upsert(result);
    } catch (e: any) {
      result.planStatus = 'BLOCKED';
      result.blockers.push(`Error generating plan: ${e.message}`);
      return await this.repository.upsert(result);
    }
  }

  async batchGenerate(request: BatchGenerateTradePlanRequest): Promise<{ count: number, plans: TradePlanResultDto[] }> {
    const { batchSize = 25, offset = 0, region } = request;
    const query = { limit: batchSize, offset, region, decision: 'TRADE_CANDIDATE' };
    const candidates = await this.strategyDecisionService.candidates(query as any);
    
    const plans: TradePlanResultDto[] = [];
    for (const candidate of candidates.results) {
       const req: GenerateTradePlanRequest = {
          instrumentId: candidate.instrumentId!,
          symbol: candidate.symbol!,
          strategyDecisionId: candidate.id,
       };
       if (!req.instrumentId || !req.symbol) continue;
       const plan = await this.generatePlan(req);
       plans.push(plan);
    }
    return { count: plans.length, plans };
  }

  async latestForInstrument(instrumentId: string, strategy?: string, portfolioId?: string) {
     return this.repository.latestForInstrument(instrumentId, strategy, portfolioId);
  }

  async list(query: TradePlanListQuery) {
     return this.repository.list(query);
  }

  async getHealthStats() {
     return this.repository.getHealthStats();
  }
}
