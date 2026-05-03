import yahooFinance from 'yahoo-finance2';

async function run() {
  const result: any = await yahooFinance.chart('AAPL', { period1: '2026-05-01', interval: '1d' });
  console.log(result.quotes.map((q: any) => q.date));
}

run();