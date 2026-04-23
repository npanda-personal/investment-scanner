const { ScanRunService } = require('./dist/scanners/scan-run.service');

async function testImprovedScan() {
  console.log('Testing improved scan logic...');

  try {
    const scanService = new ScanRunService();
    const result = await scanService.runScan('clerk-user-id-123'); // Use a valid user ID that exists in the database

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
testImprovedScan();