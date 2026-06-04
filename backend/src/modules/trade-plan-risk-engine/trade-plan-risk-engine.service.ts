import { TradePlanRiskEngineRepository } from './trade-plan-risk-engine.repository';
import type { GenerateTradePlanRequest, TradePlanResultDto, TradePlanModelRules, EntryZone, StopLoss, Target, BatchGenerateTradePlanRequest, BatchGenerateTradePlanResponse, TradePlanListQuery, Quality, PaperReadinessInput, PaperReadinessStatus, BacktestSummarySnapshot, DataQualitySnapshot, MarketDataSnapshot, StrategyDecisionSnapshot, StrategyProofSnapshot, BatchGenerateFailure, TradePlanFunnelQuery, PaperReadinessProofChain, PaperReadinessProofStage, PaperReadinessProofStageStatus } from './trade-plan-risk-engine.types';
import { StrategyDecisionEngineService } from '../strategy-decision-engine';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { MarketDataFoundationService } from '../market-data-foundation/market-data-foundation.service';
import { PortfolioManagementService } from '../portfolio-management';
import { DataQualityEngineService } from '../data-quality-engine';
import { StrategyFrameworkService } from '../strategy-framework';
import { applyLongPlanGeometryGuards, applyShortPlanGeometryGuards, canonicalizeTradePlanReadiness } from './trade-plan-risk-engine.geometry';

type ProofBlockerDefinition = {
  code: string;
  label: string;
  stage: PaperReadinessProofStage;
  sourceModule: string;
  nextActionLabel: string;
  targetRoute: string;
  hard: boolean;
  priority: number;
  status: PaperReadinessProofStageStatus;
};

const DEFAULT_BATCH_GENERATION_BATCH_SIZE = 25;
const MAX_BATCH_GENERATION_BATCH_SIZE = 100;
const DEFAULT_BATCH_GENERATION_WORKER_CONCURRENCY = 8;
const MAX_BATCH_GENERATION_WORKER_CONCURRENCY = 10;

type TradePlanGenerationCache = {
  backtestSummaries: Map<string, Promise<any | null>>;
  instruments: Map<string, Promise<any | null>>;
  latestStoredCandleInfo: Map<string, Promise<any | null>>;
};

type GenerateTradePlanExecutionContext = {
  decision?: any | null;
  cache?: TradePlanGenerationCache;
};

export class TradePlanRiskEngineService {
  private repository = new TradePlanRiskEngineRepository();
  private strategyDecisionService = new StrategyDecisionEngineService();
  private signalService = new SignalGenerationEngineService();
  private marketDataService = new MarketDataFoundationService();
  private portfolioService = new PortfolioManagementService();
  private dataQualityService = new DataQualityEngineService();
  private strategyFrameworkService = new StrategyFrameworkService();

  getModelRules(): TradePlanModelRules {
    return {
      defaultCapitalBase: 100000,
      defaultRiskPercent: 1,
      minRiskPercent: 0.25,
      maxRiskPercent: 5,
      defaultRewardRiskTarget: 2,
      maxSinglePositionExposurePercent: 10,
      maxSectorExposurePercent: 30,
      paperReadinessCriteria: {
        allowedPlanStatuses: ['VALID'],
        allowedRiskGrades: ['LOW', 'MEDIUM'],
        minimumRewardRiskRatio: 1.5,
        maximumDataGaps: 1,
        allowedDecisionConfidence: ['MEDIUM', 'HIGH'],
        blockedMarketGate: 'CLOSED',
        allowedAssetTypes: ['STOCK'],
        blockedStrategyRatings: ['WEAK', 'UNPROVEN', 'POOR'],
        blockedReadinessLabels: ['NOT_AUTOMATION_READY'],
      },
      safetyConstraints: [
        'Readiness classification is research support only and does not create paper trades.',
        'No broker execution, order placement, live trading, or autonomous trading is enabled.',
        'Allowed action language: review, plan, simulate, and paper review candidate.',
        'Targets using REWARD_RISK_MULTIPLE are modeled risk multiples, not predicted prices.',
      ],
    };
  }

  classifyPaperReadiness(input: PaperReadinessInput): {
    paperReadinessStatus: PaperReadinessStatus;
    paperReadinessReasons: string[];
    paperReadinessBlockers: string[];
  } {
    const rules = this.getModelRules().paperReadinessCriteria;
    const { plan, decisionProof, dataQualityProof, scope } = input;
    const reasons: string[] = [];
    const blockers: string[] = [];

    const addBlocker = (message: string) => {
      if (!blockers.includes(message)) blockers.push(message);
    };
    const addReason = (message: string) => {
      if (!reasons.includes(message)) reasons.push(message);
    };

    if (plan.planStatus !== 'VALID') addBlocker(`Plan status is ${plan.planStatus}; VALID is required.`);
    else addReason('Trade plan status is VALID.');

    if (!['LOW', 'MEDIUM'].includes(plan.riskGrade)) addBlocker(`Risk grade is ${plan.riskGrade}; LOW or MEDIUM is required.`);
    else addReason(`Risk grade is ${plan.riskGrade}.`);

    if (!plan.entryZone) addBlocker('Entry zone is missing.');
    if (!plan.stopLoss) addBlocker('Stop loss is missing.');
    if (!plan.target) addBlocker('Target is missing.');
    if (!plan.positionSizing) addBlocker('Position sizing is missing.');
    if (plan.invalidationRules.length === 0) addBlocker('Invalidation rules are missing.');
    if (plan.blockers.length > 0) addBlocker('Trade plan has active blockers.');
    if (plan.rewardRiskRatio < rules.minimumRewardRiskRatio) addBlocker(`Reward/risk ratio is below ${rules.minimumRewardRiskRatio}.`);
    else addReason(`Reward/risk ratio is ${plan.rewardRiskRatio}.`);

    if (!decisionProof) {
      addBlocker('Strategy decision proof is missing.');
    } else {
      if (!decisionProof.frameworkBacked) addBlocker('Strategy Framework-backed proof is missing.');
      else addReason('Strategy Framework-backed proof is present.');
      if (!decisionProof.strategyCode) addBlocker('Strategy code is missing.');
      if (!decisionProof.strategyVersion) addBlocker('Strategy version is missing.');
      if (rules.blockedStrategyRatings.includes(String(decisionProof.strategyRatingGrade || 'UNPROVEN'))) {
        addBlocker(`Strategy rating is ${decisionProof.strategyRatingGrade || 'UNPROVEN'}.`);
      }
      if (rules.blockedReadinessLabels.includes(String(decisionProof.readinessLabel || ''))) {
        addBlocker(`Strategy readiness label is ${decisionProof.readinessLabel}.`);
      }
      if (!decisionProof.backtestSummaryAvailable) addBlocker('Backtest summary is missing for the selected scope/timeframe.');
      else addReason('Backtest summary is available.');
      if (!['TRADE_CANDIDATE', 'ENTRY_CANDIDATE'].includes(String(decisionProof.decision || ''))) {
        addBlocker(`Strategy decision is ${decisionProof.decision || 'UNKNOWN'}.`);
      }
      if (decisionProof.marketGate === rules.blockedMarketGate) addBlocker('Market gate is CLOSED.');
      if (!rules.allowedDecisionConfidence.includes(String(decisionProof.confidence || 'LOW'))) {
        addBlocker(`Decision confidence is ${decisionProof.confidence || 'LOW'}.`);
      }
      if ((decisionProof.reasons || []).length === 0) addBlocker('Strategy decision reasons are missing.');
      if ((decisionProof.blockers || []).length > 0) addBlocker('Strategy decision has active blockers.');
      if ((decisionProof.dataGaps || []).length > rules.maximumDataGaps) addBlocker('Strategy decision has too many data gaps.');
    }

    if (!dataQualityProof) {
      addBlocker('Data quality proof is missing.');
    } else {
      if (!dataQualityProof.latestPricePresent) addBlocker('Latest price is missing.');
      else addReason('Latest price is present.');
      if (!dataQualityProof.priceHistorySufficient) addBlocker('Price history is insufficient.');
      if (!dataQualityProof.coverageStatus || !dataQualityProof.liquidityStatus) addBlocker('Data quality snapshot is missing.');
      if (dataQualityProof.coverageStatus === 'UNUSABLE') addBlocker('Data quality is UNUSABLE.');
      if (dataQualityProof.liquidityStatus === 'ILLIQUID') addBlocker('Liquidity is ILLIQUID.');
      if (dataQualityProof.stalePriceWarningHandled === false) addBlocker('Stale price warning is not resolved.');
    }

    if (scope?.assetType && !rules.allowedAssetTypes.includes(scope.assetType)) addBlocker(`Asset type ${scope.assetType} is not supported for paper review readiness.`);
    if (!scope?.region) addBlocker('Region scope is missing.');

    let paperReadinessStatus: PaperReadinessStatus = 'READY_FOR_PAPER_REVIEW';
    if (blockers.some((item) => item.toLowerCase().includes('missing') || item.toLowerCase().includes('insufficient'))) {
      paperReadinessStatus = 'INSUFFICIENT_DATA';
    }
    if (blockers.length > 0 && paperReadinessStatus !== 'INSUFFICIENT_DATA') {
      paperReadinessStatus = blockers.some((item) => item.includes('UNPROVEN') || item.includes('rating') || item.includes('confidence') || item.includes('data gaps'))
        ? 'WATCH_ONLY'
        : 'BLOCKED';
    }

    return { paperReadinessStatus, paperReadinessReasons: reasons, paperReadinessBlockers: blockers };
  }

  async generatePlan(request: GenerateTradePlanRequest, executionContext: GenerateTradePlanExecutionContext = {}): Promise<TradePlanResultDto> {
    const { instrumentId, symbol, strategyDecisionId, portfolioId, riskPercent, capitalBase, targetRewardRisk } = request;
    const rules = this.getModelRules();
    const region = request.region || 'IN';
    const assetType = request.assetType || 'STOCK';

    const result: TradePlanResultDto = {
      instrumentId,
      symbol,
      region,
      assetType,
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

    try {
      // 1. Fetch Decision
      let decision: any = null;
      if (executionContext.decision !== undefined) {
        decision = executionContext.decision;
      } else if (strategyDecisionId) {
        const history = await this.strategyDecisionService.history(instrumentId);
        decision = history.find((d: any) => d.id === strategyDecisionId);
      } else {
        decision = await this.strategyDecisionService.latestForInstrument(instrumentId);
      }

      if (!decision) {
        result.planStatus = 'INSUFFICIENT_DATA';
        result.blockers.push('No Strategy Decision found for instrument.');
        result.dataGaps.push('strategy_decision');
        return this.finalizeAndPersist(result, { request, decision: null, latestPriceResult: null, pricesDto: null, prices: [], dataQuality: null, backtestSummary: null, cache: executionContext.cache });
      }

      result.strategy = decision.strategy;
      result.strategyVersion = decision.strategyVersion || '1.0.0';
      result.strategyDecisionId = decision.id;

      // Derive plan direction from decision signal direction or strategy category
      const decisionDirection: string = (decision.direction || decision.signalDirection || '').toUpperCase();
      const isShortStrategy = (decision.strategy || '').includes('SHORT') || decisionDirection === 'BEARISH' || (decision.category || '').toUpperCase() === 'SHORT_ENTRY';
      const isLong = !isShortStrategy;
      result.direction = isLong ? 'LONG' : 'SHORT';

      // F&O gate: short plans require derivativesEligible
      const derivativesEligible = request.derivativesEligible ?? Boolean(decision.derivativesEligible);

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
        if (isLong) {
          result.planStatus = 'BLOCKED';
          result.blockers.push('Market gate is CLOSED for long entries.');
        } else {
          // Short entries are not blocked by a closed long-entry gate per se, but we still warn
          result.warnings.push('Market gate is CLOSED; short-review setups are limited to derivatives-eligible instruments only.');
        }
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
      const latestPriceResult = await this.marketDataService.latestPriceByInstrumentId(instrumentId, { region, assetType });
      if (!latestPriceResult || !latestPriceResult.latest || !latestPriceResult.latest.close) {
        result.planStatus = 'INSUFFICIENT_DATA';
        result.blockers.push('Missing latest price.');
        result.dataGaps.push('latest_price');
        return this.finalizeAndPersist(result, { request, decision, latestPriceResult, pricesDto: null, prices: [], dataQuality: null, backtestSummary: null, cache: executionContext.cache });
      }

      const currentPrice = Number(latestPriceResult.latest.close);
      
      const limit = 200;
      const pricesDto = await this.marketDataService.listPricesByInstrumentId(instrumentId, limit, undefined, undefined, { region, assetType });
      const prices = pricesDto?.prices || [];
      if (prices.length < 10) {
        result.planStatus = 'INSUFFICIENT_DATA';
        result.blockers.push('Insufficient historical price data (< 10 bars).');
        result.dataGaps.push('price_history');
        return this.finalizeAndPersist(result, { request, decision, latestPriceResult, pricesDto, prices, dataQuality: null, backtestSummary: null, cache: executionContext.cache });
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
      entryZone = this.normalizeEntryZone(entryZone, currentPrice, result);
      result.entryZone = entryZone;

      // 4. Stop Loss — direction-aware
      let stopLoss: StopLoss = {
         price: 0,
         percentBelowEntry: 0,
         method: 'UNKNOWN',
         quality: 'UNKNOWN',
         rationale: '',
      };

      const entryPrice = this.planningEntryPrice(currentPrice, entryZone);

      if (isLong) {
        // ---- LONG stop: below entry, swing-low based ----
        let recentSwingLow = currentPrice;
        if (prices.length >= 10) {
          recentSwingLow = Math.min(...prices.slice(0, 10).map((p: any) => Number(p.low)));
        }

        if (recentSwingLow < entryPrice * 0.995 && recentSwingLow > entryPrice * 0.8) {
          stopLoss = {
            price: recentSwingLow * 0.99,
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
        if (stopLoss.price >= entryPrice) {
          result.planStatus = 'BLOCKED';
          result.blockers.push('Stop loss is above or equal to entry price for a long plan.');
        }

        result.stopLoss = stopLoss;
        applyLongPlanGeometryGuards(result, { currentPrice, plannedEntry: entryPrice });
      } else {
        // ---- SHORT stop: ABOVE entry, swing-high based ----
        let recentSwingHigh = currentPrice;
        if (prices.length >= 10) {
          recentSwingHigh = Math.max(...prices.slice(0, 10).map((p: any) => Number(p.high)));
        }

        if (recentSwingHigh > entryPrice * 1.005 && recentSwingHigh < entryPrice * 1.2) {
          stopLoss = {
            price: recentSwingHigh * 1.01, // slightly above swing high
            percentBelowEntry: (recentSwingHigh * 1.01 - entryPrice) / entryPrice * 100,
            method: 'RECENT_SWING_HIGH',
            quality: 'STRONG',
            rationale: 'Stop placed slightly above recent 10-day swing high (short-review stop).',
          };
        } else if (volatility > 0 && (entryPrice + (volatility * 2)) < entryPrice * 1.2) {
          const stopPrice = entryPrice + (volatility * 2);
          stopLoss = {
            price: stopPrice,
            percentBelowEntry: (stopPrice - entryPrice) / entryPrice * 100,
            method: 'ATR',
            quality: 'WEAK',
            rationale: 'Stop placed 2x ATR approximation above entry (short-review stop).',
          };
        } else {
          const fallbackPercent = 0.05;
          stopLoss = {
            price: entryPrice * (1 + fallbackPercent),
            percentBelowEntry: fallbackPercent * 100,
            method: 'FIXED_PERCENT',
            quality: 'FALLBACK',
            rationale: 'Fallback fixed percentage stop (short) due to insufficient structure.',
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
        if (stopLoss.price <= entryPrice) {
          result.planStatus = 'BLOCKED';
          result.blockers.push('Stop loss is below or equal to entry price for a short-review plan.');
        }

        result.stopLoss = stopLoss;
        applyShortPlanGeometryGuards(result, { currentPrice, plannedEntry: entryPrice, derivativesEligible });
      }

      // 5. Target — direction-aware
      // For LONG: risk = entry - stop (positive). For SHORT: risk = stop - entry (positive).
      const riskPerShare = isLong
        ? entryPrice - stopLoss.price
        : stopLoss.price - entryPrice;
      if (riskPerShare <= 0) {
         result.planStatus = 'BLOCKED';
         result.blockers.push('Invalid stop loss geometry. Cannot compute risk safely.');
      }

      const tRr = targetRewardRisk || rules.defaultRewardRiskTarget;
      // For LONG: target is above entry. For SHORT: target (cover level) is BELOW entry.
      let targetPrice = isLong
        ? entryPrice + (riskPerShare * tRr)
        : entryPrice - (riskPerShare * tRr);
      let targetQuality: Quality = 'FALLBACK';
      let targetMethod: Target['method'] = 'REWARD_RISK_MULTIPLE';
      const dirLabel = isLong ? '' : ' (short-cover level)';
      let targetRationale = tRr === rules.defaultRewardRiskTarget
        ? `Target${dirLabel} is modeled at 2R by default.`
        : `Target${dirLabel} is modeled at ${tRr}R as a reward/risk multiple.`;

      // Target Realism checks
      if (volatility > 0) {
         const expectedMove = Math.abs(targetPrice - entryPrice);
         if (expectedMove > volatility * 10) {
            result.warnings.push('Target requires an unrealistic move relative to recent volatility.');
            targetQuality = 'WEAK';
            forceRiskHigh = true;
         }
      }

      if (isLong && targetPrice <= entryPrice) {
        result.planStatus = 'BLOCKED';
        result.blockers.push('Target is below or equal to entry price for a long plan.');
      }
      if (!isLong && targetPrice >= entryPrice) {
        result.planStatus = 'BLOCKED';
        result.blockers.push('Cover target is above or equal to entry price for a short-review plan.');
      }
      
      const target: Target = {
         price: targetPrice,
         // For SHORT, expectedReturnPercent is the gain from cover price being below entry price
         expectedReturnPercent: isLong
           ? (targetPrice - entryPrice) / entryPrice * 100
           : (entryPrice - targetPrice) / entryPrice * 100,
         method: targetMethod,
         quality: targetQuality,
         rationale: targetRationale,
      };
      result.target = target;

      // 6. Reward/Risk
      // For LONG: reward = target - entry. For SHORT: reward = entry - target (both positive).
      let rrRatio = 0;
      if (riskPerShare > 0) {
        rrRatio = isLong
          ? (target.price - entryPrice) / riskPerShare
          : (entryPrice - target.price) / riskPerShare;
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
      let effectiveCapital = capitalBase ?? rules.defaultCapitalBase;
      const usesDefaultCapitalBase = !portfolioId && (capitalBase === undefined || capitalBase === null);
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
            notes: usesDefaultCapitalBase
              ? ['Sizing uses the default planning capital base because no portfolio or capital base was supplied.']
              : [],
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

      // 9. Invalidation Rules — direction-aware
      if (stopLoss.price > 0) {
        if (isLong) {
          result.invalidationRules.push(`Daily close below stop level of ${stopLoss.price.toFixed(2)}.`);
        } else {
          result.invalidationRules.push(`Daily close above stop level of ${stopLoss.price.toFixed(2)} (short-review stop).`);
        }
      }
      if (decision.strategy === 'BREAKOUT_CONFIRMATION') {
         result.invalidationRules.push('Breakout fails and price closes back inside the previous range base.');
      }
      if (decision.strategy === 'PULLBACK_IN_UPTREND') {
         result.invalidationRules.push('Uptrend structure breaks (e.g. lower low is formed).');
      }
      if (decision.strategy === 'BREAKDOWN_MOMENTUM' || decision.strategy === 'TREND_LOSS_SHORT') {
        result.invalidationRules.push('Breakdown reverses — price reclaims breakdown level (short-review invalidated).');
      }

      if (result.blockers.length > 0) {
         result.invalidationRules.push('Plan is currently blocked. Consider review later.');
      }

      const backtestSummary = await this.latestBacktestSummary(result.strategy, region, assetType, request.backtestTimeframe, executionContext.cache);
      return this.finalizeAndPersist(canonicalizeTradePlanReadiness(result), { request, decision, latestPriceResult, pricesDto, prices, dataQuality, backtestSummary, cache: executionContext.cache });
    } catch (e: any) {
      result.planStatus = 'BLOCKED';
      result.blockers.push(`Error generating plan: ${e.message}`);
      return this.finalizeAndPersist(canonicalizeTradePlanReadiness(result), { request, decision: null, latestPriceResult: null, pricesDto: null, prices: [], dataQuality: null, backtestSummary: null, cache: executionContext.cache });
    }
  }

  async batchGenerate(request: BatchGenerateTradePlanRequest): Promise<BatchGenerateTradePlanResponse> {
    const batchSize = this.batchGenerationBatchSize(request.batchSize);
    const offset = this.batchGenerationOffset(request.offset);
    const { region, assetType } = request;
    const query = { limit: batchSize, offset, region, assetType, strategy: request.strategyCode, decision: 'TRADE_CANDIDATE' };
    const candidates = await this.strategyDecisionService.candidates(query as any);
    
    const plans: TradePlanResultDto[] = [];
    const failures: BatchGenerateFailure[] = [];
    let generatedCount = 0;
    let failedCount = 0;

    const cache = this.createGenerationCache();
    const concurrencyLimit = this.batchGenerationWorkerConcurrency(request.workerConcurrency, candidates.results.length);
    
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
          region: request.region,
          assetType: request.assetType,
          backtestTimeframe: request.backtestTimeframe,
        };
        if (!req.instrumentId || !req.symbol) throw new Error('Missing instrumentId or symbol');
        return this.generatePlan(req, { decision: candidate, cache });
      });

      const results = await Promise.allSettled(promises);
      for (const [index, result] of results.entries()) {
        const candidate = chunk[index];
        if (result.status === 'fulfilled') {
          plans.push(result.value);
          generatedCount++;
        } else {
          failedCount++;
          failures.push({
            strategyDecisionId: candidate.id,
            instrumentId: candidate.instrumentId,
            symbol: candidate.symbol,
            reason: result.reason?.message || 'Trade plan generation failed.',
          });
        }
      }
    }

    const totalCount = candidates.total ?? candidates.results.length;
    const nextOffset = offset + batchSize < totalCount ? offset + batchSize : null;
    const paperReadinessSummary = this.countBy(plans, (plan) => plan.paperReadinessStatus || 'UNCLASSIFIED');
    const topBlockers = this.topCounts(plans.flatMap((plan) => this.paperBlockerCategories(plan)));
    const paperReadinessProofChain = this.buildPaperReadinessProofChain(plans, {
      region: region || 'IN',
      assetType: assetType || 'STOCK',
      backtestTimeframe: request.backtestTimeframe || null,
    });

    return {
      count: plans.length,
      processedCount: candidates.results.length,
      generatedCount,
      failedCount,
      candidateCount: candidates.results.length,
      rawCandidateCount: candidates.total ?? candidates.results.length,
      eligibleCandidateCount: candidates.results.length,
      skippedCount: 0,
      skipReasonCounts: {},
      paperReadinessSummary,
      topBlockers,
      paperReadinessProofChain,
      backtestTimeframe: request.backtestTimeframe || null,
      totalCount,
      batchSize,
      offset,
      nextOffset,
      hasMore: nextOffset !== null,
      plans,
      failures,
    };
  }

  async funnelDiagnostics(query: TradePlanFunnelQuery) {
    const region = query.region || 'IN';
    const assetType = query.assetType || 'STOCK';
    const scopeQuery = { ...query, region, assetType };
    const candidateQuery = {
      limit: 1,
      offset: 0,
      region,
      assetType,
      strategy: query.strategyCode,
      decision: 'TRADE_CANDIDATE',
    };
    const [rawSignals, decisionsResult, entryCandidates, plans] = await Promise.all([
      this.signalService.funnelDiagnostics(scopeQuery),
      this.strategyDecisionService.funnelDiagnostics(scopeQuery),
      this.strategyDecisionService.candidates(candidateQuery as any),
      this.repository.funnelPlans(scopeQuery),
    ]);
    const decisions = decisionsResult.results;
    const decisionTotal = decisionsResult.total ?? decisions.length;
    const decisionCounts = this.countBy(decisions, (decision: any) => decision.decision || 'UNKNOWN');
    const byStrategy = this.topCounts(decisions.map((decision: any) => decision.strategy || 'UNKNOWN'));
    const includesLegacy = Boolean((scopeQuery as any).includeLegacy);
    const sampledFrameworkBacked = decisions.filter((decision: any) => Boolean(decision.frameworkBacked)).length;
    const frameworkBacked = includesLegacy ? sampledFrameworkBacked : decisionTotal;
    const notFrameworkBacked = includesLegacy ? Math.max(0, decisionTotal - sampledFrameworkBacked) : 0;
    const eligibleCandidateTotal = entryCandidates.total ?? entryCandidates.results.length;
    const skipReasons = decisions.flatMap((decision: any) => this.planDiscoverySkipReasons(decision));
    const skipReasonCounts = this.topCounts(skipReasons).reduce<Record<string, number>>((acc, item) => {
      acc[item.reason] = item.count;
      return acc;
    }, {});
    const planStatusCounts = this.countBy(plans, (plan) => plan.planStatus);
    const riskCounts = this.countBy(plans, (plan) => plan.riskGrade);
    const paperCounts = this.countBy(plans, (plan) => plan.paperReadinessStatus || 'UNCLASSIFIED');
    const blockerCounts = this.topCounts(plans.flatMap((plan) => this.paperBlockerCategories(plan)));
    const reasonCounts = this.topCounts(plans.flatMap((plan) => plan.paperReadinessReasons || []));
    const timeframeCounts = this.topCounts(plans.map((plan) => plan.backtestTimeframe || 'MISSING'));
    const recommendations = this.buildFunnelRecommendations(plans, blockerCounts, timeframeCounts);
    const paperReadinessProofChain = this.buildPaperReadinessProofChain(plans, {
      region,
      assetType,
      backtestTimeframe: query.backtestTimeframe || null,
    });

    return {
      region,
      assetType,
      generatedAt: new Date().toISOString(),
      rawSignals: {
        total: rawSignals.total,
        bullish: rawSignals.bullish,
        bearish: rawSignals.bearish,
        neutral: rawSignals.neutral,
        byDirection: rawSignals.byDirection,
      },
      strategyMatches: {
        totalWithMatch: frameworkBacked,
        totalWithoutMatch: Math.max(0, rawSignals.total - frameworkBacked),
        byStrategy,
      },
      strategyDecisions: {
        total: decisionTotal,
        tradeCandidates: eligibleCandidateTotal,
        watch: decisionCounts.WATCH || 0,
        avoid: decisionCounts.AVOID || 0,
        exitCandidates: decisionCounts.EXIT_CANDIDATE || 0,
        reduceRisk: decisionCounts.REDUCE_RISK || 0,
        hold: decisionCounts.HOLD || 0,
        insufficientData: decisionCounts.INSUFFICIENT_DATA || 0,
        frameworkBacked,
        notFrameworkBacked,
      },
      tradePlanCandidateDiscovery: {
        discoveredCandidates: decisionTotal,
        eligibleForPlanGeneration: eligibleCandidateTotal,
        skippedBeforeGeneration: Math.max(decisionTotal - eligibleCandidateTotal, skipReasons.length),
        skipReasonCounts,
        skipReasons: this.topCounts(skipReasons),
      },
      generatedPlans: {
        total: plans.length,
        valid: planStatusCounts.VALID || 0,
        watch: planStatusCounts.WATCH || 0,
        blocked: planStatusCounts.BLOCKED || 0,
        insufficientData: planStatusCounts.INSUFFICIENT_DATA || 0,
        byStrategy: this.topCounts(plans.map((plan) => plan.strategy || 'UNKNOWN')),
        byRiskGrade: this.toCountItems(riskCounts),
        byPlanStatus: this.toCountItems(planStatusCounts),
      },
      paperReadiness: {
        readyForPaperReview: paperCounts.READY_FOR_PAPER_REVIEW || 0,
        watchOnly: paperCounts.WATCH_ONLY || 0,
        blocked: paperCounts.BLOCKED || 0,
        insufficientData: paperCounts.INSUFFICIENT_DATA || 0,
        blockerCounts,
        topBlockers: blockerCounts.slice(0, 5),
        reasonCounts,
      },
      proof: {
        byBacktestTimeframe: timeframeCounts,
        byStrategyRating: this.topCounts(plans.map((plan) => plan.strategyRating || 'UNPROVEN')),
        missingBacktestSummaryCount: plans.filter((plan) => !plan.backtestSummary).length,
        weakOrUnprovenRatingCount: plans.filter((plan) => ['WEAK', 'UNPROVEN', 'POOR'].includes(String(plan.strategyRating || 'UNPROVEN'))).length,
      },
      dataQuality: {
        missingSnapshotCount: plans.filter((plan) => !plan.dataQualitySnapshot || plan.dataQualitySnapshot.status === 'MISSING').length,
        unusableCount: plans.filter((plan) => plan.dataQualitySnapshot?.coverageStatus === 'UNUSABLE').length,
        illiquidCount: plans.filter((plan) => plan.dataQualitySnapshot?.liquidityStatus === 'ILLIQUID').length,
        unknownLiquidityCount: plans.filter((plan) => plan.dataQualitySnapshot?.liquidityStatus === 'UNKNOWN').length,
      },
      recommendations,
      paperReadinessProofChain,
    };
  }

  async latestForInstrument(instrumentId: string, strategy?: string, portfolioId?: string, scope: { region?: string; assetType?: string } = {}) {
     const plan = await this.repository.latestForInstrument(instrumentId, strategy, portfolioId, scope);
     return plan ? this.withSinglePlanProofChain(plan) : null;
  }

  async list(query: TradePlanListQuery) {
     const result = await this.repository.list(query);
     return {
      ...result,
      results: result.results.map((plan) => this.withSinglePlanProofChain(plan)),
     };
  }

  private planDiscoverySkipReasons(decision: any): string[] {
    const reasons: string[] = [];
    const decisionValue = String(decision.decision || 'UNKNOWN');
    if (!['TRADE_CANDIDATE', 'ENTRY_CANDIDATE'].includes(decisionValue)) {
      if (decisionValue === 'WATCH') reasons.push('WATCH decisions are not batch-generated unless explicitly allowed.');
      else if (['EXIT_CANDIDATE', 'REDUCE_RISK', 'HOLD'].includes(decisionValue)) reasons.push('Exit or risk-reduction decisions are excluded from long entry plans.');
      else reasons.push(`Decision ${decisionValue} is not eligible for long entry plans.`);
    }
    if (decision.strategy === 'DEFENSIVE_EXIT') reasons.push('Defensive exit strategy is excluded from long entry plan generation.');
    if (!decision.instrumentId) reasons.push('Strategy Decision is missing instrumentId.');
    if (!decision.symbol) reasons.push('Strategy Decision is missing symbol.');
    return reasons;
  }

  private paperBlockerCategories(plan: TradePlanResultDto): string[] {
    const categories = new Set<string>();
    for (const blocker of plan.paperReadinessBlockers || []) {
      const text = blocker.toLowerCase();
      if (text.includes('strategy rating is weak')) categories.add('WEAK strategy rating');
      else if (text.includes('strategy rating is unproven')) categories.add('UNPROVEN strategy rating');
      else if (text.includes('backtest summary is missing')) categories.add('missing backtest summary');
      else if (text.includes('data quality snapshot is missing')) categories.add('missing data quality snapshot');
      else if (text.includes('market gate is closed')) categories.add('market gate closed');
      else if (text.includes('plan status is')) categories.add('plan status not valid');
      else if (text.includes('risk grade is high')) categories.add('risk grade HIGH');
      else if (text.includes('reward/risk ratio')) categories.add('reward/risk below threshold');
      else if (text.includes('latest price is missing')) categories.add('missing latest price');
      else if (text.includes('stale price')) categories.add('stale latest price');
      else if (text.includes('price history is insufficient')) categories.add('insufficient price history');
      else if (text.includes('strategy decision proof is missing')) categories.add('missing strategy decision proof');
      else if (text.includes('framework-backed proof is missing')) categories.add('not framework-backed');
      else categories.add(blocker);
    }
    if (['WEAK', 'UNPROVEN', 'POOR'].includes(String(plan.strategyRating || ''))) categories.add(`${plan.strategyRating} strategy rating`);
    if (plan.riskGrade === 'HIGH') categories.add('risk grade HIGH');
    if (plan.planStatus !== 'VALID') categories.add('plan status not valid');
    if (!plan.backtestSummary) categories.add('missing backtest summary');
    if (!plan.dataQualitySnapshot || plan.dataQualitySnapshot.status === 'MISSING') categories.add('missing data quality snapshot');
    if (plan.dataQualitySnapshot?.liquidityStatus === 'ILLIQUID') categories.add('liquidity is ILLIQUID');
    if (plan.dataQualitySnapshot?.liquidityStatus === 'UNKNOWN') categories.add('liquidity is UNKNOWN');
    if (plan.backtestTimeframe === '10Y') categories.add('using 10Y proof timeframe');
    return Array.from(categories);
  }

  private withSinglePlanProofChain(plan: TradePlanResultDto): TradePlanResultDto {
    return {
      ...plan,
      paperReadinessProofChain: this.buildPaperReadinessProofChain([plan], {
        region: plan.region || 'IN',
        assetType: plan.assetType || 'STOCK',
        backtestTimeframe: plan.backtestTimeframe || null,
      }),
    };
  }

  private buildPaperReadinessProofChain(
    plans: TradePlanResultDto[],
    scope: { region: string; assetType: string; backtestTimeframe?: string | null }
  ): PaperReadinessProofChain {
    const stageOrder: PaperReadinessProofStage[] = [
      'DATA_QUALITY',
      'STRATEGY_DECISION',
      'STRATEGY_PROOF',
      'BACKTEST_EVIDENCE',
      'RISK_GEOMETRY',
      'SCOPE',
      'PAPER_READINESS',
    ];
    const definitionsByPlan = plans.map((plan) => this.proofBlockersForPlan(plan));
    const flatDefinitions = definitionsByPlan.flat();
    const uniqueAffectedByStage = new Map<PaperReadinessProofStage, Set<number>>();
    const countsByStageAndCode = new Map<PaperReadinessProofStage, Map<string, { definition: ProofBlockerDefinition; count: number }>>();

    definitionsByPlan.forEach((definitions, planIndex) => {
      const plan = plans[planIndex];
      for (const definition of definitions) {
        if (!uniqueAffectedByStage.has(definition.stage)) uniqueAffectedByStage.set(definition.stage, new Set());
        uniqueAffectedByStage.get(definition.stage)!.add(planIndex);
        if (!countsByStageAndCode.has(definition.stage)) countsByStageAndCode.set(definition.stage, new Map());
        const stageCounts = countsByStageAndCode.get(definition.stage)!;
        const current = stageCounts.get(definition.code) || { definition, count: 0 };
        current.count += 1;
        stageCounts.set(definition.code, current);
      }
      if (this.paperReadinessBlocked(plan)) {
        if (!uniqueAffectedByStage.has('PAPER_READINESS')) uniqueAffectedByStage.set('PAPER_READINESS', new Set());
        uniqueAffectedByStage.get('PAPER_READINESS')!.add(planIndex);
      }
    });

    const stages = stageOrder.map((stage) => {
      const stageCounts = countsByStageAndCode.get(stage) || new Map();
      const blockers = Array.from(stageCounts.values())
        .sort((a, b) => b.count - a.count || a.definition.priority - b.definition.priority)
        .map(({ definition, count }) => ({
          code: definition.code,
          label: definition.label,
          count,
          targetRoute: definition.targetRoute,
        }));
      const definitions = Array.from(stageCounts.values()).map((item) => item.definition);
      const hardBlockerCount = Array.from(stageCounts.values())
        .filter((item) => item.definition.hard)
        .reduce((sum, item) => sum + item.count, 0);
      return {
        stage,
        status: this.proofStageStatus(stage, definitions, plans),
        affectedCount: uniqueAffectedByStage.get(stage)?.size || 0,
        hardBlockerCount,
        topBlockers: blockers.slice(0, 5),
        nextAction: blockers[0]
          ? {
            label: this.nextActionForStage(stage, blockers[0].label),
            targetRoute: blockers[0].targetRoute || '/trade-plans',
            sourceModule: this.sourceModuleForStage(stage),
          }
          : undefined,
      };
    });

    const prioritizedBlockers = Array.from(
      flatDefinitions.reduce<Map<string, { definition: ProofBlockerDefinition; count: number }>>((acc, definition) => {
        const current = acc.get(definition.code) || { definition, count: 0 };
        current.count += 1;
        acc.set(definition.code, current);
        return acc;
      }, new Map()).values()
    )
      .sort((a, b) => a.definition.priority - b.definition.priority || b.count - a.count)
      .slice(0, 8)
      .map((item, index) => ({
        priority: index + 1,
        category: item.definition.code,
        count: item.count,
        sourceModule: item.definition.sourceModule,
        nextActionLabel: item.definition.nextActionLabel,
        targetRoute: item.definition.targetRoute,
      }));

    return {
      scope,
      generatedPlanCount: plans.length,
      paperReadyCount: plans.filter((plan) => plan.paperReadinessStatus === 'READY_FOR_PAPER_REVIEW').length,
      stages,
      prioritizedBlockers,
    };
  }

  private proofBlockersForPlan(plan: TradePlanResultDto): ProofBlockerDefinition[] {
    const definitions = new Map<string, ProofBlockerDefinition>();
    const add = (definition: ProofBlockerDefinition) => {
      if (!definitions.has(definition.code)) definitions.set(definition.code, definition);
    };
    const addByCode = (code: string) => add(this.proofBlockerDefinition(code));

    for (const blocker of [...(plan.paperReadinessBlockers || []), ...(plan.blockers || [])]) {
      const text = blocker.toLowerCase();
      if (text.includes('latest price') && text.includes('missing')) addByCode('MISSING_LATEST_PRICE');
      else if (text.includes('insufficient historical price') || text.includes('price history is insufficient')) addByCode('INSUFFICIENT_PRICE_HISTORY');
      else if (text.includes('data quality') || text.includes('liquidity') || text.includes('stale price')) addByCode('DATA_QUALITY_BLOCKED');
      else if (text.includes('market gate is closed')) addByCode('MARKET_GATE_CLOSED');
      else if (text.includes('strategy decision') || text.includes('decision confidence')) addByCode('STRATEGY_DECISION_BLOCKED');
      else if (text.includes('framework-backed proof is missing')) addByCode('NOT_FRAMEWORK_BACKED');
      else if (text.includes('strategy rating is') || text.includes('readiness label')) addByCode('WEAK_OR_UNPROVEN_STRATEGY');
      else if (text.includes('backtest summary is missing')) addByCode('MISSING_BACKTEST_SUMMARY');
      else if (text.includes('plan status is')) addByCode('PLAN_STATUS_NOT_VALID');
      else if (text.includes('risk grade is high')) addByCode('RISK_GRADE_HIGH');
      else if (text.includes('reward/risk ratio')) addByCode('REWARD_RISK_TOO_LOW');
      else if (text.includes('stop loss') || text.includes('entry zone') || text.includes('target is missing') || text.includes('position sizing') || text.includes('invalidation')) addByCode('INVALID_LONG_GEOMETRY');
      else if (text.includes('asset type') || text.includes('region scope')) addByCode('OUT_OF_SCOPE');
      else if (plan.planStatus !== 'VALID') addByCode('PLAN_STATUS_NOT_VALID');
    }

    if (!plan.marketDataSnapshot || plan.latestPrice === null || plan.marketDataSnapshot.latestPrice === null) addByCode('MISSING_LATEST_PRICE');
    if (!plan.dataQualitySnapshot || plan.dataQualitySnapshot.status === 'MISSING') addByCode('DATA_QUALITY_BLOCKED');
    if (plan.dataQualitySnapshot?.coverageStatus === 'UNUSABLE' || plan.dataQualitySnapshot?.liquidityStatus === 'ILLIQUID') addByCode('DATA_QUALITY_BLOCKED');
    if (plan.strategyDecisionSnapshot?.marketGate === 'CLOSED') addByCode('MARKET_GATE_CLOSED');
    if ((plan.strategyDecisionSnapshot?.blockers || []).length > 0) addByCode('STRATEGY_DECISION_BLOCKED');
    if (plan.strategyProofSnapshot?.frameworkBacked === false) addByCode('NOT_FRAMEWORK_BACKED');
    if (['WEAK', 'UNPROVEN', 'POOR'].includes(String(plan.strategyRating || plan.strategyProofSnapshot?.strategyRating || ''))) addByCode('WEAK_OR_UNPROVEN_STRATEGY');
    if (!plan.backtestSummary) addByCode('MISSING_BACKTEST_SUMMARY');
    if (plan.planStatus !== 'VALID') addByCode('PLAN_STATUS_NOT_VALID');
    if (plan.riskGrade === 'HIGH') addByCode('RISK_GRADE_HIGH');
    if (plan.rewardRiskRatio < this.getModelRules().paperReadinessCriteria.minimumRewardRiskRatio) addByCode('REWARD_RISK_TOO_LOW');
    if (plan.assetType && plan.assetType !== 'STOCK') addByCode('OUT_OF_SCOPE');
    if (!plan.region) addByCode('OUT_OF_SCOPE');

    return Array.from(definitions.values());
  }

  private proofBlockerDefinition(code: string): ProofBlockerDefinition {
    const definitions: Record<string, ProofBlockerDefinition> = {
      DATA_QUALITY_BLOCKED: {
        code,
        label: 'Data quality blocked',
        stage: 'DATA_QUALITY',
        sourceModule: 'Data Quality Engine',
        nextActionLabel: 'Review data quality evaluation',
        targetRoute: '/data-quality',
        hard: true,
        priority: 10,
        status: 'BLOCKED',
      },
      MISSING_LATEST_PRICE: {
        code,
        label: 'Missing latest price',
        stage: 'DATA_QUALITY',
        sourceModule: 'Market Data Foundation',
        nextActionLabel: 'Refresh latest market data',
        targetRoute: '/market-data',
        hard: true,
        priority: 20,
        status: 'INSUFFICIENT_DATA',
      },
      INSUFFICIENT_PRICE_HISTORY: {
        code,
        label: 'Insufficient price history',
        stage: 'DATA_QUALITY',
        sourceModule: 'Market Data Foundation',
        nextActionLabel: 'Load more historical candles',
        targetRoute: '/market-data',
        hard: true,
        priority: 30,
        status: 'INSUFFICIENT_DATA',
      },
      STRATEGY_DECISION_BLOCKED: {
        code,
        label: 'Strategy Decision blocked',
        stage: 'STRATEGY_DECISION',
        sourceModule: 'Strategy Decision Engine',
        nextActionLabel: 'Review Strategy Decision blockers',
        targetRoute: '/strategy-decisions',
        hard: true,
        priority: 40,
        status: 'BLOCKED',
      },
      MARKET_GATE_CLOSED: {
        code,
        label: 'Market gate closed',
        stage: 'STRATEGY_DECISION',
        sourceModule: 'Strategy Decision Engine',
        nextActionLabel: 'Wait for market gate to reopen',
        targetRoute: '/strategy-decisions',
        hard: true,
        priority: 50,
        status: 'BLOCKED',
      },
      NOT_FRAMEWORK_BACKED: {
        code,
        label: 'Not framework-backed',
        stage: 'STRATEGY_PROOF',
        sourceModule: 'Strategy Framework',
        nextActionLabel: 'Attach Strategy Framework proof',
        targetRoute: '/strategy-framework',
        hard: true,
        priority: 60,
        status: 'UNPROVEN',
      },
      WEAK_OR_UNPROVEN_STRATEGY: {
        code,
        label: 'Weak or unproven strategy',
        stage: 'STRATEGY_PROOF',
        sourceModule: 'Strategy Framework',
        nextActionLabel: 'Review strategy rating proof',
        targetRoute: '/strategy-framework',
        hard: false,
        priority: 70,
        status: 'UNPROVEN',
      },
      MISSING_BACKTEST_SUMMARY: {
        code,
        label: 'Missing backtest summary',
        stage: 'BACKTEST_EVIDENCE',
        sourceModule: 'Strategy Framework',
        nextActionLabel: 'Run selected timeframe backtest',
        targetRoute: '/strategy-framework',
        hard: true,
        priority: 80,
        status: 'INSUFFICIENT_DATA',
      },
      PLAN_STATUS_NOT_VALID: {
        code,
        label: 'Plan status not valid',
        stage: 'RISK_GEOMETRY',
        sourceModule: 'Trade Plan Risk Engine',
        nextActionLabel: 'Regenerate or repair trade plan',
        targetRoute: '/trade-plans',
        hard: true,
        priority: 90,
        status: 'BLOCKED',
      },
      RISK_GRADE_HIGH: {
        code,
        label: 'Risk grade high',
        stage: 'RISK_GEOMETRY',
        sourceModule: 'Trade Plan Risk Engine',
        nextActionLabel: 'Review risk geometry',
        targetRoute: '/trade-plans',
        hard: true,
        priority: 100,
        status: 'BLOCKED',
      },
      REWARD_RISK_TOO_LOW: {
        code,
        label: 'Reward/risk below threshold',
        stage: 'RISK_GEOMETRY',
        sourceModule: 'Trade Plan Risk Engine',
        nextActionLabel: 'Adjust risk geometry',
        targetRoute: '/trade-plans',
        hard: true,
        priority: 110,
        status: 'BLOCKED',
      },
      INVALID_LONG_GEOMETRY: {
        code,
        label: 'Invalid long geometry',
        stage: 'RISK_GEOMETRY',
        sourceModule: 'Trade Plan Risk Engine',
        nextActionLabel: 'Repair entry/stop/target geometry',
        targetRoute: '/trade-plans',
        hard: true,
        priority: 120,
        status: 'BLOCKED',
      },
      OUT_OF_SCOPE: {
        code,
        label: 'Out of scope',
        stage: 'SCOPE',
        sourceModule: 'Trade Plan Risk Engine',
        nextActionLabel: 'Use supported IN/STOCK scope',
        targetRoute: '/trade-plans',
        hard: true,
        priority: 130,
        status: 'BLOCKED',
      },
    };
    return definitions[code] || {
      code,
      label: code,
      stage: 'PAPER_READINESS',
      sourceModule: 'Trade Plan Risk Engine',
      nextActionLabel: 'Review paper readiness blocker',
      targetRoute: '/trade-plans',
      hard: true,
      priority: 999,
      status: 'BLOCKED',
    };
  }

  private proofStageStatus(stage: PaperReadinessProofStage, definitions: ProofBlockerDefinition[], plans: TradePlanResultDto[]): PaperReadinessProofStageStatus {
    if (stage === 'PAPER_READINESS') {
      if (plans.some((plan) => ['BLOCKED'].includes(String(plan.paperReadinessStatus)))) return 'BLOCKED';
      if (plans.some((plan) => plan.paperReadinessStatus === 'INSUFFICIENT_DATA')) return 'INSUFFICIENT_DATA';
      if (plans.some((plan) => plan.paperReadinessStatus === 'WATCH_ONLY')) return 'LIMITED';
      return 'PASS';
    }
    if (definitions.length === 0) return 'PASS';
    if (definitions.some((definition) => definition.status === 'BLOCKED')) return 'BLOCKED';
    if (definitions.some((definition) => definition.status === 'INSUFFICIENT_DATA')) return 'INSUFFICIENT_DATA';
    if (definitions.some((definition) => definition.status === 'UNPROVEN')) return 'UNPROVEN';
    if (definitions.some((definition) => definition.status === 'LIMITED')) return 'LIMITED';
    return 'PASS';
  }

  private paperReadinessBlocked(plan: TradePlanResultDto): boolean {
    return Boolean(plan.paperReadinessStatus && plan.paperReadinessStatus !== 'READY_FOR_PAPER_REVIEW');
  }

  private sourceModuleForStage(stage: PaperReadinessProofStage): string {
    if (stage === 'DATA_QUALITY') return 'Data Quality Engine';
    if (stage === 'STRATEGY_DECISION') return 'Strategy Decision Engine';
    if (stage === 'STRATEGY_PROOF' || stage === 'BACKTEST_EVIDENCE') return 'Strategy Framework';
    return 'Trade Plan Risk Engine';
  }

  private nextActionForStage(stage: PaperReadinessProofStage, blockerLabel: string): string {
    if (stage === 'DATA_QUALITY') return `Resolve ${blockerLabel.toLowerCase()}`;
    if (stage === 'STRATEGY_DECISION') return `Review ${blockerLabel.toLowerCase()}`;
    if (stage === 'STRATEGY_PROOF' || stage === 'BACKTEST_EVIDENCE') return `Refresh ${blockerLabel.toLowerCase()}`;
    return `Resolve ${blockerLabel.toLowerCase()}`;
  }

  private buildFunnelRecommendations(plans: TradePlanResultDto[], blockers: Array<{ reason: string; count: number }>, timeframes: Array<{ reason: string; count: number }>) {
    const recommendations: string[] = [];
    if (plans.length > 0 && plans.every((plan) => plan.paperReadinessStatus !== 'READY_FOR_PAPER_REVIEW')) {
      recommendations.push('No action required if weak proof and high risk dominate; rules are correctly blocking weak candidates.');
    }
    if (blockers.some((item) => item.reason.includes('WEAK strategy rating') || item.reason.includes('UNPROVEN strategy rating'))) {
      recommendations.push('Review weak or unproven Strategy Framework ratings before considering paper review.');
    }
    if (blockers.some((item) => item.reason === 'missing backtest summary')) {
      recommendations.push('Run backtests for strategies with missing proof summaries.');
    }
    if (timeframes.some((item) => item.reason === '10Y')) {
      recommendations.push('Current plans use 10Y proof. Consider regenerating with 3Y or 5Y if 10Y history is insufficient.');
    }
    if (blockers.some((item) => item.reason === 'missing data quality snapshot')) {
      recommendations.push('Run Data Quality Engine evaluations for plans with missing data quality snapshots.');
    }
    return recommendations;
  }

  private countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
    return items.reduce<Record<string, number>>((acc, item) => {
      const key = keyFn(item) || 'UNKNOWN';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  private topCounts(items: string[]): Array<{ reason: string; count: number }> {
    return this.toCountItems(this.countBy(items, (item) => item || 'UNKNOWN'));
  }

  private toCountItems(counts: Record<string, number>): Array<{ reason: string; count: number }> {
    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, key: reason, count }))
      .sort((a, b) => b.count - a.count)
      .map(({ reason, count }) => ({ reason, count }));
  }

  async getHealthStats() {
     return this.repository.getHealthStats();
  }

  private createGenerationCache(): TradePlanGenerationCache {
    return {
      backtestSummaries: new Map(),
      instruments: new Map(),
      latestStoredCandleInfo: new Map(),
    };
  }

  private batchGenerationBatchSize(value?: number) {
    const parsed = Number(value);
    const configured = Number.isFinite(parsed) ? Math.floor(parsed) : DEFAULT_BATCH_GENERATION_BATCH_SIZE;
    return Math.max(1, Math.min(configured, MAX_BATCH_GENERATION_BATCH_SIZE));
  }

  private batchGenerationOffset(value?: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }

  private batchGenerationWorkerConcurrency(value: number | undefined, candidateCount: number) {
    const parsed = Number(value ?? process.env.TRADE_PLAN_BATCH_WORKERS_COUNT);
    const configured = Number.isFinite(parsed) ? Math.floor(parsed) : DEFAULT_BATCH_GENERATION_WORKER_CONCURRENCY;
    const capped = Math.max(1, Math.min(configured, MAX_BATCH_GENERATION_WORKER_CONCURRENCY));
    return Math.min(capped, Math.max(1, candidateCount));
  }

  private async latestBacktestSummary(strategy: string, region: string, assetType: string, timeframe?: string, cache?: TradePlanGenerationCache) {
    const key = [strategy, region, assetType, timeframe || 'DEFAULT'].join('|');
    const load = async () => {
      const summaries = await this.strategyFrameworkService.performance(strategy, { region, assetType, timeframe: timeframe as any }).catch(() => []);
      return summaries[0] || null;
    };
    return cache ? this.cached(cache.backtestSummaries, key, load) : load();
  }

  private async instrumentForProof(instrumentId: string, region: string, assetType: string, cache?: TradePlanGenerationCache) {
    if (typeof (this.marketDataService as any).getInstrument !== 'function') return null;
    const key = [instrumentId, region, assetType].join('|');
    const load = () => Promise.resolve((this.marketDataService as any).getInstrument(instrumentId, { region, assetType })).catch(() => null);
    return cache ? this.cached(cache.instruments, key, load) : load();
  }

  private async latestStoredCandleInfoForProof(region: string, assetType: string, cache?: TradePlanGenerationCache) {
    if (typeof (this.marketDataService as any).latestStoredCandleInfo !== 'function') return null;
    const key = [region, assetType].join('|');
    const load = () => Promise.resolve((this.marketDataService as any).latestStoredCandleInfo(region, assetType)).catch(() => null);
    return cache ? this.cached(cache.latestStoredCandleInfo, key, load) : load();
  }

  private cached<T>(store: Map<string, Promise<T>>, key: string, load: () => Promise<T>) {
    let value = store.get(key);
    if (!value) {
      value = load();
      store.set(key, value);
    }
    return value;
  }

  private async finalizeAndPersist(
    result: TradePlanResultDto,
    context: {
      request: GenerateTradePlanRequest;
      decision: any | null;
      latestPriceResult: any | null;
      pricesDto: any | null;
      prices: any[];
      dataQuality: any | null;
      backtestSummary: any | null;
      cache?: TradePlanGenerationCache;
    }
  ): Promise<TradePlanResultDto> {
    const region = context.request.region || result.region || 'IN';
    const assetType = context.request.assetType || result.assetType || 'STOCK';
    const backtestSummary = context.backtestSummary || (
      result.strategy !== 'UNKNOWN'
        ? await this.latestBacktestSummary(result.strategy, region, assetType, context.request.backtestTimeframe, context.cache)
        : null
    );

    const [instrument, latestStoredInfo] = await Promise.all([
      this.instrumentForProof(result.instrumentId, region, assetType, context.cache),
      this.latestStoredCandleInfoForProof(region, assetType, context.cache),
    ]);

    const backtestSnapshot = this.toBacktestSummarySnapshot(backtestSummary);
    const proofSnapshot = this.toStrategyProofSnapshot(result, context.decision, backtestSnapshot, context.request.backtestTimeframe || null);
    const decisionSnapshot = this.toStrategyDecisionSnapshot(result, context.decision);
    const marketSnapshot = this.toMarketDataSnapshot(result, context.latestPriceResult, context.pricesDto, context.prices, instrument, latestStoredInfo, region, assetType);
    const dataQualitySnapshot = this.toDataQualitySnapshot(context.dataQuality);

    result.region = region;
    result.assetType = assetType;
    result.strategyRating = proofSnapshot.strategyRating;
    result.readinessLabel = proofSnapshot.readinessLabel;
    result.backtestTimeframe = proofSnapshot.backtestTimeframe;
    result.backtestSummary = backtestSnapshot;
    result.strategyProofSnapshot = proofSnapshot;
    result.strategyDecisionSnapshot = decisionSnapshot;
    result.latestPrice = marketSnapshot.latestPrice;
    result.latestPriceTimestamp = marketSnapshot.latestPriceTimestamp;
    result.marketDataSnapshot = marketSnapshot;
    result.dataQualitySnapshot = dataQualitySnapshot;
    result.proofGeneratedAt = new Date().toISOString();
    result.snapshotVersion = 'trade-plan-proof-snapshot-v1';

    Object.assign(result, this.classifyPaperReadiness({
      plan: result,
      decisionProof: this.decisionToProof(context.decision, backtestSnapshot),
      dataQualityProof: {
        latestPricePresent: marketSnapshot.latestPrice !== null,
        priceHistorySufficient: context.prices.length >= 50,
        coverageStatus: dataQualitySnapshot.coverageStatus ?? null,
        liquidityStatus: dataQualitySnapshot.liquidityStatus ?? null,
        stalePriceWarningHandled: !dataQualitySnapshot.blockers.some((item) => item.toLowerCase().includes('stale')),
      },
      scope: { region, assetType },
    }));
    canonicalizeTradePlanReadiness(result);

    return this.persistWithReadiness(result);
  }

  private toBacktestSummarySnapshot(summary: any): BacktestSummarySnapshot | null {
    if (!summary) return null;
    return {
      timeframe: summary.timeframe ?? null,
      cagr: summary.cagr ?? null,
      maxDrawdown: summary.maxDrawdown ?? null,
      sharpe: summary.sharpe ?? null,
      winRate: summary.winRate ?? null,
      profitFactor: summary.profitFactor ?? null,
      tradeCount: summary.tradeCount ?? 0,
      ratingGrade: summary.ratingGrade || 'UNPROVEN',
      availabilityStatus: summary.tradeCount > 0 ? 'AVAILABLE' : 'INSUFFICIENT_HISTORY',
      generatedAt: summary.generatedAt ?? null,
    };
  }

  private toStrategyProofSnapshot(
    result: TradePlanResultDto,
    decision: any | null,
    backtestSummary: BacktestSummarySnapshot | null,
    requestedTimeframe: string | null
  ): StrategyProofSnapshot {
    const rating = this.ratingFromDecision(decision) || backtestSummary?.ratingGrade || null;
    const readinessLabel = decision?.readinessLabel || decision?.strategyRating?.readinessLabel || null;
    const proofWarnings: string[] = [];
    if (!decision?.frameworkBacked) proofWarnings.push('Strategy Framework-backed decision is missing.');
    if (!backtestSummary) proofWarnings.push('Backtest summary missing for selected timeframe.');
    if (rating === 'UNPROVEN' || rating === 'WEAK') proofWarnings.push(`Strategy rating is ${rating}.`);
    return {
      strategyCode: result.strategy,
      strategyVersion: result.strategyVersion,
      strategyRating: rating,
      readinessLabel,
      frameworkBacked: Boolean(decision?.frameworkBacked),
      backtestTimeframe: backtestSummary?.timeframe ?? requestedTimeframe,
      backtestSummary,
      proofStatus: !backtestSummary ? 'MISSING' : rating === 'UNPROVEN' ? 'UNPROVEN' : proofWarnings.length > 0 ? 'PARTIAL' : 'AVAILABLE',
      proofWarnings,
    };
  }

  private toStrategyDecisionSnapshot(result: TradePlanResultDto, decision: any | null): StrategyDecisionSnapshot {
    return {
      strategyDecisionId: result.strategyDecisionId || decision?.id || null,
      decision: decision?.decision ?? null,
      action: decision?.action ?? null,
      decisionScore: typeof decision?.decisionScore === 'number' ? decision.decisionScore : null,
      confidence: decision?.confidence ?? null,
      marketGate: decision?.marketGate || decision?.marketGateStatus || null,
      marketCondition: decision?.marketCondition ?? null,
      frameworkBacked: typeof decision?.frameworkBacked === 'boolean' ? decision.frameworkBacked : null,
      reasons: decision?.reasons || [],
      blockers: decision?.blockers || [],
      warnings: decision?.warnings || [],
      dataGaps: decision?.dataGaps || [],
      generatedAt: decision?.generatedAt ?? null,
    };
  }

  private toMarketDataSnapshot(
    result: TradePlanResultDto,
    latestPriceResult: any | null,
    pricesDto: any | null,
    prices: any[],
    instrument: any | null,
    latestStoredInfo: any | null,
    region: string,
    assetType: string
  ): MarketDataSnapshot {
    const latest = latestPriceResult?.latest || null;
    const latestDate = this.toIso(latest?.date);
    const storedDate = this.toIso(latestStoredInfo?.latestStoredTradingDate || prices[0]?.date);
    return {
      instrumentId: result.instrumentId,
      symbol: latestPriceResult?.symbol || pricesDto?.symbol || result.symbol,
      latestPrice: latest?.close !== undefined && latest?.close !== null ? Number(latest.close) : null,
      latestPriceTimestamp: latestDate,
      latestCompletedTradingDate: this.toIso(latestStoredInfo?.latestCompletedTradingDate || latest?.date),
      latestStoredTradingDate: storedDate,
      currency: instrument?.currency || null,
      exchange: instrument?.exchange || null,
      region,
      assetType,
      dataStatus: latestPriceResult?.data_status || pricesDto?.data_status || null,
      source: latestPriceResult?.source || latest?.source || pricesDto?.source || null,
    };
  }

  private toDataQualitySnapshot(dataQuality: any | null): DataQualitySnapshot {
    if (!dataQuality) {
      return {
        status: 'MISSING',
        warnings: ['No data quality evaluation found.'],
        blockers: ['Data quality snapshot is missing.'],
        generatedAt: null,
      };
    }
    return {
      status: 'AVAILABLE',
      coverageStatus: dataQuality.coverageStatus ?? null,
      signalReadinessStatus: dataQuality.signalReadinessStatus ?? null,
      liquidityStatus: dataQuality.liquidityStatus ?? null,
      coverageScore: dataQuality.coverageScore ?? null,
      signalReadinessScore: dataQuality.signalReadinessScore ?? null,
      liquidityScore: dataQuality.liquidityScore ?? null,
      eligibleForSignals: dataQuality.eligibleForSignals ?? null,
      warnings: dataQuality.warnings || [],
      blockers: dataQuality.readinessBlockers || [],
      generatedAt: dataQuality.lastEvaluatedAt ?? dataQuality.generatedAt ?? null,
    };
  }

  private decisionToProof(decision: any, backtestSummary: any) {
    if (!decision) return null;
    const ratingGrade = this.ratingFromDecision(decision) || backtestSummary?.ratingGrade || null;
    return {
      frameworkBacked: decision.frameworkBacked,
      strategyCode: decision.strategy,
      strategyVersion: decision.strategyVersion || '1.0.0',
      strategyRatingGrade: ratingGrade,
      readinessLabel: decision.readinessLabel || decision.strategyRating?.readinessLabel || backtestSummary?.readinessLabel || null,
      backtestSummaryAvailable: Boolean(backtestSummary),
      decision: decision.decision,
      marketGate: decision.marketGate || decision.marketGateStatus,
      confidence: decision.confidence,
      reasons: decision.reasons || [],
      blockers: decision.blockers || [],
      dataGaps: decision.dataGaps || [],
    };
  }

  private async persistWithReadiness(result: TradePlanResultDto): Promise<TradePlanResultDto> {
    const saved = await this.repository.upsert(result);
    return this.withSinglePlanProofChain({
      ...saved,
      paperReadinessStatus: result.paperReadinessStatus,
      paperReadinessReasons: result.paperReadinessReasons,
      paperReadinessBlockers: result.paperReadinessBlockers,
    });
  }

  private ratingFromDecision(decision: any | null) {
    if (!decision) return null;
    if (typeof decision.strategyRating === 'string') return decision.strategyRating;
    return decision.strategyRating?.ratingGrade || null;
  }

  private normalizeEntryZone(entryZone: EntryZone, currentPrice: number, result: TradePlanResultDto): EntryZone {
    let min = Number(entryZone.preferredEntryMin);
    let max = Number(entryZone.preferredEntryMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      result.warnings.push('Entry zone was incomplete; current price was used as the fallback entry zone.');
      min = currentPrice * 0.99;
      max = currentPrice * 1.01;
    }
    if (min > max) {
      result.warnings.push('Entry zone min/max were inverted and have been normalized.');
      [min, max] = [max, min];
    }
    const rawReference = Number(entryZone.referencePrice);
    const reference = Number.isFinite(rawReference)
      ? Math.min(Math.max(rawReference, min), max)
      : currentPrice < min
        ? min
        : currentPrice > max
          ? max
          : currentPrice;
    return {
      ...entryZone,
      referencePrice: reference,
      preferredEntryMin: min,
      preferredEntryMax: max,
    };
  }

  private planningEntryPrice(currentPrice: number, entryZone: EntryZone): number {
    if (currentPrice < entryZone.preferredEntryMin) return entryZone.preferredEntryMin;
    if (currentPrice > entryZone.preferredEntryMax) return currentPrice;
    return currentPrice;
  }

  private toIso(value: unknown): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value as any);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
}
