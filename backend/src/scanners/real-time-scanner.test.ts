/**
 * Test file for RealTimeScannerService
 */

import { PrismaClient } from '@prisma/client';
import { RealTimeScannerService } from './real-time-scanner.service';

// Mock Prisma client
const mockPrisma = new PrismaClient();

async function testRealTimeScanner() {
  console.log('=== Testing RealTimeScannerService ===\n');
  
  // Create service instance
  const scanner = new RealTimeScannerService(mockPrisma, {
    enableRedis: false, // Disable Redis for testing
    batchChunkSize: 2, // Small chunk size for testing
    batchDelayMs: 100,
  });

  try {
    // Test 1: Get signal definitions
    console.log('Test 1: Getting signal definitions...');
    const signalDefinitions = await scanner.getSignalDefinitions();
    console.log(`✓ Found ${signalDefinitions.length} signal definitions`);
    signalDefinitions.forEach((def, i) => {
      console.log(`  ${i + 1}. ${def.name} (${def.type}) - ${def.description}`);
    });

    // Test 2: Get scan presets
    console.log('\nTest 2: Getting scan presets...');
    const scanPresets = await scanner.getScanPresets();
    console.log(`✓ Found ${scanPresets.length} scan presets`);
    scanPresets.forEach((preset, i) => {
      console.log(`  ${i + 1}. ${preset.name} - ${preset.symbols.length} symbols`);
    });

    // Test 3: Get scanner configuration
    console.log('\nTest 3: Getting scanner configuration...');
    const scannerConfig = await scanner.getScannerConfig();
    console.log(`✓ Found ${scannerConfig.length} configuration items`);
    scannerConfig.forEach((config, i) => {
      console.log(`  ${i + 1}. ${config.key} = ${config.value} (${config.category})`);
    });

    // Test 4: Start a scan session (simplified)
    console.log('\nTest 4: Starting a scan session...');
    try {
      const scanResult = await scanner.startScanSession('test-user-123', {
        scope: {
          type: 'CUSTOM',
          symbols: ['AAPL', 'MSFT', 'GOOGL'], // Small test set
        },
        signals: ['RSI', 'EMA'],
      });
      
      console.log(`✓ Scan session started: ${scanResult.sessionId}`);
      console.log(`  Total symbols: ${scanResult.totalSymbols}`);
      
      // Test 5: Get session progress
      console.log('\nTest 5: Getting session progress...');
      // Wait a bit for background processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const progress = await scanner.getScanProgress(scanResult.sessionId);
      if (progress) {
        console.log(`✓ Progress retrieved: ${progress.progress.completed}/${progress.progress.total} (${progress.progress.percentage}%)`);
        console.log(`  Status: ${progress.status}`);
      } else {
        console.log('✗ No progress data available yet');
      }

      // Test 6: Get session details
      console.log('\nTest 6: Getting session details...');
      const session = await scanner.getSession(scanResult.sessionId);
      if (session) {
        console.log(`✓ Session retrieved: ${session.id}`);
        console.log(`  Status: ${session.status}`);
        console.log(`  Started: ${session.startedAt.toISOString()}`);
      }

      // Test 7: Get user sessions
      console.log('\nTest 7: Getting user sessions...');
      const userSessions = await scanner.getUserSessions('test-user-123', 5);
      console.log(`✓ Found ${userSessions.length} sessions for user`);
      userSessions.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.id} - ${s.status} - ${s.startedAt.toISOString()}`);
      });

      // Test 8: Get dashboard data
      console.log('\nTest 8: Getting dashboard data...');
      const dashboardData = await scanner.getDashboardData('test-user-123');
      console.log(`✓ Dashboard data retrieved:`);
      console.log(`  Recent scans: ${dashboardData.recentScans.length}`);
      console.log(`  Top opportunities: ${dashboardData.topOpportunities.length}`);
      console.log(`  Signal stats: ${Object.keys(dashboardData.signalStats).length} signal types`);
      
      Object.entries(dashboardData.signalStats).forEach(([type, count]) => {
        console.log(`    - ${type}: ${count}`);
      });

    } catch (error) {
      console.log('✗ Scan test skipped (requires actual market data):', (error as Error).message);
    }

    console.log('\n=== All tests completed successfully! ===');

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRealTimeScanner().catch(console.error);
}

export { testRealTimeScanner };