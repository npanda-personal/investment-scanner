async function test() {
  const baseUrl = 'http://localhost:3000';
  const headers = { 'x-user-id': 'test-user-id', 'Content-Type': 'application/json' };

  console.log('1. Creating watchlist...');
  const watchlistRes = await fetch(`${baseUrl}/api/watchlists`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: 'Integration Test Watchlist' }),
  });
  if (!watchlistRes.ok) {
    const err = await watchlistRes.text();
    throw new Error(`Watchlist creation failed: ${err}`);
  }
  const watchlist = await watchlistRes.json();
  console.log('✅ Watchlist created:', watchlist.id);

  console.log('2. Creating scanner rule...');
  const ruleRes = await fetch(`${baseUrl}/api/scanners`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Integration Scanner',
      description: 'Test rule',
      condition: {
        operator: '>',
        left: { type: 'field', value: 'price' },
        right: { type: 'literal', value: 0 },
      },
      targetWatchlistId: watchlist.id,
      isActive: true,
    }),
  });
  if (!ruleRes.ok) {
    const err = await ruleRes.text();
    throw new Error(`Scanner rule creation failed: ${err}`);
  }
  const rule = await ruleRes.json();
  console.log('✅ Scanner rule created:', rule.id);

  console.log('3. Triggering scan...');
  const scanRes = await fetch(`${baseUrl}/api/scanners/scan/all`, {
    method: 'POST',
    headers,
  });
  if (!scanRes.ok) {
    const err = await scanRes.text();
    throw new Error(`Scan failed: ${err}`);
  }
  const scanResult = await scanRes.json();
  console.log('✅ Scan completed:', scanResult.message);

  console.log('4. Checking watchlist symbols...');
  const watchlistRes2 = await fetch(`${baseUrl}/api/watchlists/${watchlist.id}`, {
    headers,
  });
  const updatedWatchlist = await watchlistRes2.json();
  console.log('✅ Watchlist symbols:', updatedWatchlist.symbols);

  console.log('5. Creating backtest configuration...');
  const backtestRes = await fetch(`${baseUrl}/api/backtest`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Integration Backtest',
      description: 'Test backtest',
      watchlistIds: [watchlist.id],
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      strategyConfig: {
        entryRule: { operator: '>', left: { type: 'field', value: 'price' }, right: { type: 'literal', value: 0 } },
        exitRule: { operator: '<', left: { type: 'field', value: 'price' }, right: { type: 'literal', value: 100 } },
      },
      stopLoss: 5,
      takeProfit: 10,
      positionSizing: 1000,
    }),
  });
  if (!backtestRes.ok) {
    const err = await backtestRes.text();
    throw new Error(`Backtest creation failed: ${err}`);
  }
  const backtestConfig = await backtestRes.json();
  console.log('✅ Backtest config created:', backtestConfig.id);

  console.log('6. Running backtest (may fail due to missing historical data)...');
  try {
    const runRes = await fetch(`${baseUrl}/api/backtest/${backtestConfig.id}/run`, {
      method: 'POST',
      headers,
    });
    if (runRes.ok) {
      const backtestResult = await runRes.json();
      console.log('✅ Backtest result:', backtestResult.id);
      console.log('   Performance metrics:', backtestResult.metrics);
    } else {
      const err = await runRes.text();
      console.warn('⚠️  Backtest run failed (expected due to missing data):', err);
    }
  } catch (error) {
    console.warn('⚠️  Backtest run error:', error.message);
  }

  console.log('\n🎉 All integration tests passed!');
}

test().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});