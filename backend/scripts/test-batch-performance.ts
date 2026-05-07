import { TradePlanRiskEngineService } from '../src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service';

async function run() {
  console.log('Testing Batch Generate Performance...');
  const service = new TradePlanRiskEngineService();
  
  const originalCandidates = service['strategyDecisionService'].candidates;
  
  // Mock candidates to return 100 items
  service['strategyDecisionService'].candidates = async () => ({
    results: Array.from({ length: 100 }).map((_, i) => ({
      id: `dec-${i}`,
      instrumentId: `INST-${i}`,
      symbol: `SYM${i}`,
      decision: 'TRADE_CANDIDATE',
      strategy: 'TREND_MOMENTUM',
      strategyVersion: '1.0.0',
    })),
    total: 100,
    nextOffset: 100,
  }) as any;

  // Mock generatePlan to simulate some async work (10-50ms)
  const originalGenerate = service.generatePlan;
  service.generatePlan = async (req) => {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 10));
    return {
      instrumentId: req.instrumentId,
      symbol: req.symbol,
      planStatus: 'VALID',
    } as any;
  };

  const start = Date.now();
  const res = await service.batchGenerate({ batchSize: 100 });
  const end = Date.now();

  console.log(`Processed ${res.count} items in ${end - start}ms.`);
  console.log(`Generated: ${res.generatedCount}, Failed: ${res.failedCount}`);
  
  // Restore
  service['strategyDecisionService'].candidates = originalCandidates;
  service.generatePlan = originalGenerate;
}

run().catch(console.error);
