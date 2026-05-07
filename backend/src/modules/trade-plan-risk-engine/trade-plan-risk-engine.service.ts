import { TradePlanRiskEngineRepository } from './trade-plan-risk-engine.repository';
import type { GenerateTradePlanRequest, TradePlanResultDto, TradePlanModelRules, EntryZone, StopLoss, Target, BatchGenerateTradePlanRequest, TradePlanListQuery, Quality } from './trade-plan-risk-engine.types';
import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { MarketDataFoundationService } from '../market-data-foundation/market-data-foundation.service';
import { PortfolioManagementService } from '../portfolio-management';
import { DataQualityEngineService } from '../data-quality-engine';

export class TradePlanRiskEngineService {
  private repository = new TradePlanRiskEngineRepository();
  private strategyDecisionService = new StrategyDecisionEngineService();
  private marketDataService = new MarketDataFoundationService();
  private portfolioService = new PortfolioManagementService();
  private dataQualityService = new DataQualityEngineService();

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

    let forceStatusWatch = false;
    let forceRiskHigh = false;
    let isLong = true; // Assume long trades for now

    try {
      // 1. Fetch Decision
      let decision: any = null;
      if (strategyDecisionId) {
        const history = await this.strategyDecisionService.history(instrumentId);
        decision = history.find((d: any) => d.id === strategyDecisionId);
      } else {
        decision = await this.strategyDecisionService.latestForInstrument(instrumentId);
      }

      if (!decision) {
        result.planStatus = 'INSUFFICIENT_DATA';
        result.blockers.push('No Strategy Decision found for instrument.');
        result.dataGaps.push('strategy_decision');
        return await this.repository.upsert(result);
      }

      result.strategy = decision.strategy;
      result.strategyVersion = decision.strategyVersion || '1.0.0';
      result.strategyDecisionId = decision.id;

      if (decision.blockers?.length > 0) {
        result.planStatus = 'BLOCKED';
        result.blockers.push('Hard Strategy Decision blockers exist.');
        result.blockers.push(...decision.blockers);
      }

      if (!['TRADE_CANDIDATE', 'WATCH'].includes(decision.decision)) {
        result.planStatus = 'BLOCKED';
        result.blockers.push(`Strategy Decision is ${decision.decision}, expected TRADE_CANDIDATE or WATCH.`);
      }

      if (decision.decision === 'WATCH' && result.planStatus !== 'BLOCKED') {
        forceStatusWatch = true;
      }

      if (decision.marketGateStatus === 'CLOSED') {
        result.planStatus = 'BLOCKED';
        result.blockers.push('Market gate is CLOSED for long entries.');
      }

      // Proof Integration
      if (!decision.frameworkBacked) {
        result.warnings.push('Strategy is not framework-backed (unproven).');
        forceRiskHigh = true;
      }
      if (decision.strategyRating === 'WEAK' || decision.strategyRating === 'POOR') {
        forceRiskHigh = true;
        result.warnings.push('Strategy rating is poor or weak.');
      } else if (decision.strategyRating === 'UNPROVEN' || !decision.strategyRating) {
        result.warnings.push('Strategy is unproven or missing backtest proof.');
        forceStatusWatch = true;
        forceRiskHigh = true;
      }
      
      // Readiness label checks
      const readiness = decision.readinessLabel;
      const isGoodReadiness = readiness === 'WATCHLIST_CANDIDATE' || readiness === 'PAPER_TEST_CANDIDATE' || readiness === 'RESEARCH_ONLY';
      if (!isGoodReadiness) {
         result.warnings.push(`Strategy readiness label is ${readiness || 'unknown'}.`);
      }

      // 2. Fetch Market Data & Data Quality
      const latestPriceResult = await this.marketDataService.latestPriceByInstrumentId(instrumentId, {});
      if (!latestPriceResult || !latestPriceResult.latest || !latestPriceResult.latest.close) {
        result.planStatus = 'INSUFFICIENT_DATA';
        result.blockers.push('Missing latest price.');
        result.dataGaps.push('latest_price');
        return await this.repository.upsert(result);
      }

      const currentPrice = Number(latestPriceResult.latest.close);
      
      const limit = 200;
      const pricesDto = await this.marketDataService.listPricesByInstrumentId(instrumentId, limit, undefined, undefined, {});
      const prices = pricesDto?.prices || [];
      if (prices.length < 10) {
        result.planStatus = 'INSUFFICIENT_DATA';
        result.blockers.push('Insufficient historical price data (< 10 bars).');
        result.dataGaps.push('price_history');
        return await this.repository.upsert(result);
      }
      
      let sma50 = null;
      let sma200 = null;
      let volatility = 0; // simple ATR approx

      if (prices.length >= 50) {
         const sum = prices.slice(0, 50).reduce((a: number, b: any) => a + Number(b.close), 0);
         sma50 = sum / 50;
      } else {
         result.dataGaps.push('sma50');
      }

      if (prices.length >= 200) {
        const sum = prices.slice(0, 200).reduce((a: number, b: any) => a + Number(b.close), 0);
        sma200 = sum / 200;
      }

      if (prices.length >= 14) {
        const ranges = prices.slice(0, 14).map((p: any) => Number(p.high) - Number(p.low));
        volatility = ranges.reduce((a,b)=>a+b, 0) / 14;
      }

      // Data Quality Evaluation
      const dataQuality = await this.dataQualityService.diagnostics(instrumentId).catch(() => null);
      if (dataQuality) {
        if (dataQuality.coverageStatus === 'UNUSABLE') {
          result.planStatus = 'BLOCKED';
          result.blockers.push('Data Quality Engine reports UNUSABLE coverage.');
        }
        if (dataQuality.signalReadinessStatus === 'NOT_READY') {
          forceStatusWatch = true;
          result.warnings.push('Data Quality Engine reports NOT_READY for signals.');
        }
        if (dataQuality.liquidityStatus === 'ILLIQUID') {
          result.planStatus = 'BLOCKED';
          result.blockers.push('Data Quality Engine reports ILLIQUID status.');
        } else if (dataQuality.liquidityStatus === 'UNKNOWN') {
          result.warnings.push('Data Quality Engine reports UNKNOWN liquidity.');
        }
      } else {
        result.dataGaps.push('data_quality_evaluation');
        forceRiskHigh = true;
      }

      // 3. Entry Zone
      let entryZone: EntryZone = {
        type: 'CURRENT_PRICE',
        referencePrice: currentPrice,
        preferredEntryMin: currentPrice * 0.99,
        preferredEntryMax: currentPrice * 1.01,
        quality: 'UNKNOWN',
        rationale: 'Generic entry-zone fallback used.',
      };

      if (decision.strategy === 'TREND_MOMENTUM') {
         entryZone.type = 'CURRENT_PRICE';
         entryZone.quality = 'ACCEPTABLE';
         entryZone.rationale = 'Entry near current price for momentum continuation.';
         // if extended
         if (sma50 && currentPrice > sma50 * 1.15) {
           forceStatusWatch = true;
           entryZone.quality = 'WEAK';
           result.warnings.push('Price is extended beyond preferred entry zone (far above SMA50).');
         }
      } else if (decision.strategy === 'PULLBACK_IN_UPTREND') {
         entryZone.type = 'PULLBACK';
         if (sma50) {
            entryZone.preferredEntryMin = sma50 * 0.98;
            entryZone.preferredEntryMax = sma50 * 1.02;
            entryZone.referencePrice = sma50;
            entryZone.quality = 'STRONG';
            entryZone.rationale = 'Preferred entry near SMA50 pullback support.';
            
            if (currentPrice > sma50 * 1.05) {
              forceStatusWatch = true;
              entryZone.quality = 'WEAK';
              result.warnings.push('Price is currently too far above SMA50 for optimal pullback entry.');
            }
            if (sma200 && currentPrice < sma200) {
              forceStatusWatch = true;
              result.warnings.push('Price is below SMA200, trend may be broken.');
            }
         } else {
            result.dataGaps.push('sma50_for_pullback');
            entryZone.type = 'UNKNOWN';
            entryZone.quality = 'WEAK';
         }
      } else if (decision.strategy === 'BREAKOUT_CONFIRMATION') {
        entryZone.type = 'BREAKOUT';
        entryZone.quality = 'ACCEPTABLE';
        if (decision.entryZone) {
          entryZone.preferredEntryMin = decision.entryZone.preferredEntryMin || currentPrice;
          entryZone.preferredEntryMax = decision.entryZone.preferredEntryMax || currentPrice;
          entryZone.referencePrice = decision.entryZone.preferredEntryMin || currentPrice;
          entryZone.quality = 'STRONG';
          entryZone.rationale = decision.entryZone.rationale || 'Breakout zone entry.';
        } else {
          entryZone.rationale = 'Breakout zone near recent high.';
          const recentHigh = Math.max(...prices.slice(0, 10).map((p: any) => Number(p.high)));
          entryZone.referencePrice = recentHigh;
          entryZone.preferredEntryMin = recentHigh * 0.99;
          entryZone.preferredEntryMax = recentHigh * 1.02;
        }

        if (currentPrice > entryZone.preferredEntryMax * 1.05) {
          forceStatusWatch = true;
          entryZone.quality = 'WEAK';
          result.warnings.push('Price already ran too far above breakout zone.');
        }
      } else if (decision.entryZone) {
        entryZone.type = 'UNKNOWN';
        entryZone.preferredEntryMin = decision.entryZone.preferredEntryMin || currentPrice;
        entryZone.preferredEntryMax = decision.entryZone.preferredEntryMax || currentPrice;
        entryZone.referencePrice = currentPrice;
        entryZone.quality = 'ACCEPTABLE';
        entryZone.rationale = decision.entryZone.rationale || entryZone.rationale;
      }
      result.entryZone = entryZone;

      // 4. Stop Loss
      let stopLoss: StopLoss = {
         price: 0,
         percentBelowEntry: 0,
         method: 'UNKNOWN',
         quality: 'UNKNOWN',
         rationale: '',
      };
      
      const entryPrice = currentPrice > entryZone.preferredEntryMax ? currentPrice : 
                         currentPrice < entryZone.preferredEntryMin ? currentPrice : 
                         (entryZone.preferredEntryMin + entryZone.preferredEntryMax) / 2;

      let recentSwingLow = currentPrice;
      if (prices.length >= 10) {
         recentSwingLow = Math.min(...prices.slice(0, 10).map((p: any) => Number(p.low)));
      }

      if (recentSwingLow < entryPrice * 0.995 && recentSwingLow > entryPrice * 0.8) {
         stopLoss = {
            price: recentSwingLow * 0.99, // slightly below swing low
            percentBelowEntry: (entryPrice - (recentSwingLow * 0.99)) / entryPrice * 100,
            method: 'RECENT_SWING_LOW',
            quality: 'STRONG',
            rationale: 'Stop placed slightly below recent 10-day swing low.',
         };
      } else if (sma50 && sma50 < entryPrice * 0.99 && sma50 > entryPrice * 0.8) {
         stopLoss = {
            price: sma50 * 0.99,
            percentBelowEntry: (entryPrice - (sma50 * 0.99)) / entryPrice * 100,
            method: 'SMA50',
            quality: 'ACCEPTABLE',
            rationale: 'Stop placed 1% below SMA50 support.',
         };
      } else if (volatility > 0 && (entryPrice - (volatility * 2)) > entryPrice * 0.8) {
         const stopPrice = entryPrice - (volatility * 2);
         stopLoss = {
            price: stopPrice,
            percentBelowEntry: (entryPrice - stopPrice) / entryPrice * 100,
            method: 'ATR',
            quality: 'WEAK',
            rationale: 'Stop placed 2x ATR approximation below entry.',
         };
      } else {
         const fallbackPercent = 0.05;
         stopLoss = {
            price: entryPrice * (1 - fallbackPercent),
            percentBelowEntry: fallbackPercent * 100,
            method: 'FIXED_PERCENT',
            quality: 'FALLBACK',
            rationale: 'Fallback fixed percentage stop loss used due to insufficient structure.',
         };
         result.warnings.push('Fallback fixed percentage stop used.');
         forceRiskHigh = true;
      }
      
      if (stopLoss.percentBelowEntry < 1.0) {
        result.warnings.push('Stop loss is very close to entry, high chance of wicking.');
        forceRiskHigh = true;
      }
      if (stopLoss.percentBelowEntry > 15.0) {
        result.warnings.push('Stop loss is very far from entry, requiring smaller position size.');
      }
      
      if (isLong && stopLoss.price >= entryPrice) {
        result.planStatus = 'BLOCKED';
        result.blockers.push('Stop loss is above or equal to entry price for a long plan.');
      }
      
      result.stopLoss = stopLoss;

      // 5. Target
      const riskPerShare = entryPrice - stopLoss.price;
      if (riskPerShare <= 0) {
         result.planStatus = 'BLOCKED';
         result.blockers.push('Invalid stop loss geometry. Cannot compute risk safely.');
      }
      
      const tRr = targetRewardRisk || rules.defaultRewardRiskTarget;
      let targetPrice = entryPrice + (riskPerShare * tRr);
      let targetQuality: Quality = 'FALLBACK';
      let targetMethod: Target['method'] = 'REWARD_RISK_MULTIPLE';
      let targetRationale = `Target set to default ${tRr}R multiple of risk.`;

      // Target Realism checks
      if (volatility > 0) {
         const expectedMove = targetPrice - entryPrice;
         if (expectedMove > volatility * 10) { // e.g. requires 10 days of straight up movement
            result.warnings.push('Target requires an unrealistic move relative to recent volatility.');
            targetQuality = 'WEAK';
            forceRiskHigh = true;
         }
      }

      if (isLong && targetPrice <= entryPrice) {
        result.planStatus = 'BLOCKED';
        result.blockers.push('Target is below or equal to entry price for a long plan.');
      }
      
      const target: Target = {
         price: targetPrice,
         expectedReturnPercent: (targetPrice - entryPrice) / entryPrice * 100,
         method: targetMethod,
         quality: targetQuality,
         rationale: targetRationale,
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
         forceStatusWatch = true;
         forceRiskHigh = true;
         result.warnings.push('Reward/Risk is between 1.0 and 1.5. Suboptimal risk geometry.');
      }

      // 7. Position Sizing & Portfolio Impact
      if (portfolioId || capitalBase) {
         let effectiveCapital = capitalBase || 0;
         let portfolioData: any = null;

         if (portfolioId) {
            portfolioData = await this.portfolioService.getPortfolioDetail(portfolioId, 'default-user').catch(()=>null);
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
            
            if (qty < 1) {
               result.planStatus = 'BLOCKED';
               result.blockers.push('Suggested quantity is < 1 based on capital and risk constraints.');
            }

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
                  sectorExposureAfterTrade: null,
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
                  forceRiskHigh = true;
               }
            }
         } else {
            result.dataGaps.push('position_sizing_params');
         }
      } else {
         result.dataGaps.push('capital_base_for_sizing');
      }

      // Resolve Status
      if (result.planStatus !== 'BLOCKED' && result.planStatus !== 'INSUFFICIENT_DATA') {
        if (forceStatusWatch) {
          result.planStatus = 'WATCH';
        } else {
          result.planStatus = 'VALID';
        }
      }

      // 8. Risk Grade
      if (result.planStatus === 'INSUFFICIENT_DATA') {
         result.riskGrade = 'UNDEFINED';
      } else if (result.planStatus === 'BLOCKED') {
         result.riskGrade = 'HIGH';
      } else {
         if (forceRiskHigh) {
            result.riskGrade = 'HIGH';
         } else if (result.rewardRiskRatio >= 2.0 && result.warnings.length === 0 && isGoodReadiness && stopLoss.quality !== 'FALLBACK') {
            result.riskGrade = 'LOW';
         } else if (result.rewardRiskRatio >= 1.5 && result.warnings.length <= 2) {
            result.riskGrade = 'MEDIUM';
         } else {
            result.riskGrade = 'HIGH';
         }
      }

      // 9. Invalidation Rules
      if (stopLoss.price > 0) {
        result.invalidationRules.push(`Daily close below stop loss level of ${stopLoss.price.toFixed(2)}.`);
      }
      if (decision.strategy === 'BREAKOUT_CONFIRMATION') {
         result.invalidationRules.push('Breakout fails and price closes back inside the previous range base.');
      }
      if (decision.strategy === 'PULLBACK_IN_UPTREND') {
         result.invalidationRules.push('Uptrend structure breaks (e.g. lower low is formed).');
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

  async batchGenerate(request: BatchGenerateTradePlanRequest): Promise<{ count: number, generatedCount: number, failedCount: number, plans: TradePlanResultDto[] }> {
    const { batchSize = 25, offset = 0, region } = request;
    const query = { limit: batchSize, offset, region, decision: 'TRADE_CANDIDATE' };
    const candidates = await this.strategyDecisionService.candidates(query as any);
    
    const plans: TradePlanResultDto[] = [];
    let generatedCount = 0;
    let failedCount = 0;

    const concurrencyLimit = 5;
    
    const chunkArray = <T>(arr: T[], size: number): T[][] => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
      return chunks;
    };

    const chunks = chunkArray(candidates.results, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(async (candidate) => {
        const req: GenerateTradePlanRequest = {
          instrumentId: candidate.instrumentId!,
          symbol: candidate.symbol!,
          strategyDecisionId: candidate.id,
        };
        if (!req.instrumentId || !req.symbol) throw new Error('Missing instrumentId or symbol');
        return this.generatePlan(req);
      });

      const results = await Promise.allSettled(promises);
      for (const result of results) {
        if (result.status === 'fulfilled') {
          plans.push(result.value);
          generatedCount++;
        } else {
          failedCount++;
        }
      }
    }

    return { count: plans.length, generatedCount, failedCount, plans };
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
