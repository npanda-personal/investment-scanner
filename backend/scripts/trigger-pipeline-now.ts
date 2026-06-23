import { PipelineOrchestrationService } from '../src/modules/pipeline-orchestration/pipeline-orchestration.service';
import { runScript } from './_run-script';

const REGION = process.argv[2] ?? 'IN';
const ASSET_TYPE = process.argv[3] ?? 'STOCK';

runScript(async () => {
  const service = new PipelineOrchestrationService();
  console.log(`Triggering PIPELINE_RUN_ALL for ${REGION}/${ASSET_TYPE}...`);
  const result = await service.executeCommand(
    {
      commandKey: 'PIPELINE_RUN_ALL',
      region: REGION as any,
      assetType: ASSET_TYPE as any,
      trigger: 'manual',
      runMode: 'full_latest_trading_date',
      timeframe: '1d',
      pipelineKey: 'market-intelligence',
      idempotencyKey: `script-${REGION}-${ASSET_TYPE}-${Date.now()}`,
    } as any,
    { userId: 'script', requestId: `script-${Date.now()}` }
  );
  console.log('Status:', result.status);
  console.log('Message:', result.message);
});
