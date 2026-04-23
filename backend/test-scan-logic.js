const { ScanRunService } = require('./dist/scanners/scan-run.service');

async function testScanLogic() {
  console.log('Testing improved scan logic...');

  try {
    // Create a mock prisma client for testing
    const mockPrisma = {
      stock: {
        findMany: async () => [
          { symbol: 'AAPL' },
          { symbol: 'MSFT' },
          { symbol: 'GOOGL' }
        ]
      },
      priceTick: {
        findMany: async () => {
          // Return mock price data for testing
          const mockData = [];
          const symbols = ['AAPL', 'MSFT', 'GOOGL'];
          const now = new Date();

          for (const symbol of symbols) {
            for (let i = 0; i < 100; i++) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);

              // Generate some realistic price data
              const basePrice = 100 + Math.random() * 50;
              const change = (Math.random() - 0.5) * 2;
              const volume = 1000000 + Math.random() * 5000000;

              mockData.push({
                symbol,
                timestamp: date,
                open: basePrice,
                high: basePrice + Math.abs(change) * 0.5,
                low: basePrice - Math.abs(change) * 0.5,
                close: basePrice + change,
                volume: volume
              });
            }
          }

          return mockData;
        }
      },
      $transaction: async (fn) => fn(mockPrisma),
      scanRun: {
        create: async (data) => ({ id: 'test-run-id', ...data.data }),
        findUnique: async (params) => {
          if (params.where.id === 'test-run-id') {
            return {
              id: 'test-run-id',
              userId: 'test-user',
              createdAt: new Date(),
              results: [
                {
                  id: 'result-1',
                  symbol: 'SMART_MONEY_ACCUMULATION',
                  signalType: 'positive',
                  strength: 0.95,
                  metadata: {
                    description: 'Strong accumulation pattern in 3 stock(s) with volume + price confirmation',
                    explanation: 'Price up > 2% with volume > 2x average and RSI < 70 suggests institutional buying',
                    stocks: ['AAPL', 'MSFT', 'GOOGL']
                  },
                  timestamp: new Date()
                }
              ]
            };
          }
          return null;
        }
      },
      scanResult: {
        create: async (data) => ({ id: 'test-result-id', ...data.data })
      }
    };

    const scanService = new ScanRunService(mockPrisma);
    const result = await scanService.runScan('test-user');

    console.log('Scan completed successfully!');
    console.log(`Total signals: ${result.results.length}`);
    console.log('Signals:');
    result.results.forEach((signal, index) => {
      console.log(`${index + 1}. ${signal.description}`);
      console.log(`   Type: ${signal.signalType}`);
      console.log(`   Strength: ${signal.strength}`);
      console.log(`   Stocks affected: ${signal.stocks.length}`);
      console.log(`   Explanation: ${signal.explanation}`);
      console.log('---');
    });

    // Verify the improvements
    const hasHighQualitySignals = result.results.every(signal => signal.strength >= 0.6);
    const reasonableCounts = result.results.every(signal =>
      (signal.signalType === 'positive' && signal.stocks.length >= 3) ||
      (signal.signalType === 'warning' && signal.stocks.length >= 2)
    );
    const limitedResults = result.results.length <= 6;

    console.log('Quality checks:');
    console.log(`✓ All signals have minimum strength (≥0.6): ${hasHighQualitySignals}`);
    console.log(`✓ Signals have reasonable stock counts: ${reasonableCounts}`);
    console.log(`✓ Results are limited (≤6 signals): ${limitedResults}`);

    if (hasHighQualitySignals && reasonableCounts && limitedResults) {
      console.log('✅ All quality checks passed! The improved scan logic is working correctly.');
    } else {
      console.log('❌ Some quality checks failed.');
    }

  } catch (error) {
    console.error('Error running test scan:', error);
  }
}

// Run the test
testScanLogic();