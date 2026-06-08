import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Check latest price tick date and sample 52w breakout
  const latestTick = await prisma.$queryRawUnsafe<any[]>(
    `SELECT MAX(timestamp)::text as max_ts FROM price_ticks WHERE symbol NOT LIKE '%^%'`
  );
  console.log('latest price tick:', JSON.stringify(latestTick));

  // Sample 52w breakout computation
  const breakouts = await prisma.$queryRawUnsafe<any[]>(`
    WITH latest_date AS (
      SELECT DATE(MAX(timestamp)) as d FROM price_ticks WHERE symbol NOT LIKE '%^%'
    ),
    latest_session AS (
      SELECT symbol, MAX(high) as session_high, MIN(low) as session_low, MAX(close) as session_close
      FROM price_ticks
      WHERE DATE(timestamp) = (SELECT d FROM latest_date)
        AND symbol NOT LIKE '%^%'
      GROUP BY symbol
    ),
    yearly_range AS (
      SELECT symbol, MAX(high) as yr_high, MIN(low) as yr_low
      FROM price_ticks
      WHERE timestamp >= NOW() - INTERVAL '365 days'
        AND symbol NOT LIKE '%^%'
      GROUP BY symbol
    )
    SELECT ls.symbol, 
      ls.session_high::text, ls.session_low::text,
      yr.yr_high::text, yr.yr_low::text,
      CASE WHEN ls.session_high >= yr.yr_high THEN 'HIGH' WHEN ls.session_low <= yr.yr_low THEN 'LOW' END as breakout
    FROM latest_session ls
    JOIN yearly_range yr ON ls.symbol = yr.symbol
    WHERE ls.session_high >= yr.yr_high OR ls.session_low <= yr.yr_low
    LIMIT 5
  `);
  console.log('52w breakouts sample:', JSON.stringify(breakouts, null, 2));
  
  await prisma.$disconnect();
}
main().catch(console.error);
