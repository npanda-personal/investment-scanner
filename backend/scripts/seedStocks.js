const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding stocks...');

  const stocks = [
    // US stocks (large cap)
    { symbol: 'AAPL', name: 'Apple Inc.', region: 'US', exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', region: 'US', exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', region: 'US', exchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', region: 'US', exchange: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla Inc.', region: 'US', exchange: 'NASDAQ' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', region: 'US', exchange: 'NASDAQ' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', region: 'US', exchange: 'NYSE' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', region: 'US', exchange: 'NYSE' },
    { symbol: 'V', name: 'Visa Inc.', region: 'US', exchange: 'NYSE' },
    { symbol: 'WMT', name: 'Walmart Inc.', region: 'US', exchange: 'NYSE' },
    // US mid-cap
    { symbol: 'ZM', name: 'Zoom Video Communications', region: 'US', exchange: 'NASDAQ' },
    { symbol: 'SNOW', name: 'Snowflake Inc.', region: 'US', exchange: 'NYSE' },
    { symbol: 'COIN', name: 'Coinbase Global Inc.', region: 'US', exchange: 'NASDAQ' },
    { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', region: 'US', exchange: 'NASDAQ' },
    { symbol: 'NFLX', name: 'Netflix Inc.', region: 'US', exchange: 'NASDAQ' },
    { symbol: 'DIS', name: 'The Walt Disney Company', region: 'US', exchange: 'NYSE' },
    { symbol: 'BA', name: 'Boeing Company', region: 'US', exchange: 'NYSE' },
    { symbol: 'CAT', name: 'Caterpillar Inc.', region: 'US', exchange: 'NYSE' },
    { symbol: 'GS', name: 'Goldman Sachs Group Inc.', region: 'US', exchange: 'NYSE' },
    { symbol: 'IBM', name: 'International Business Machines', region: 'US', exchange: 'NYSE' },
    // Indian stocks (large cap)
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'INFY.NS', name: 'Infosys Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'LT.NS', name: 'Larsen & Toubro Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'SBIN.NS', name: 'State Bank of India', region: 'IN', exchange: 'NSE' },
    { symbol: 'ITC.NS', name: 'ITC Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Limited', region: 'IN', exchange: 'NSE' },
    // Indian mid-cap
    { symbol: 'TITAN.NS', name: 'Titan Company Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries', region: 'IN', exchange: 'NSE' },
    { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'WIPRO.NS', name: 'Wipro Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'ONGC.NS', name: 'Oil and Natural Gas Corporation', region: 'IN', exchange: 'NSE' },
    { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation of India', region: 'IN', exchange: 'NSE' },
    { symbol: 'NTPC.NS', name: 'NTPC Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement Limited', region: 'IN', exchange: 'NSE' },
    { symbol: 'SHREECEM.NS', name: 'Shree Cement Limited', region: 'IN', exchange: 'NSE' },
  ];

  for (const stock of stocks) {
    const existing = await prisma.stock.findUnique({
      where: { symbol: stock.symbol },
    });
    if (!existing) {
      await prisma.stock.create({
        data: {
          symbol: stock.symbol,
          name: stock.name,
          region: stock.region,
          exchange: stock.exchange,
          isActive: true,
          lastSuccessfulDataLoadTimestamp: null,
        },
      });
      console.log(`Created stock ${stock.symbol}`);
    } else {
      console.log(`Stock ${stock.symbol} already exists`);
    }
  }

  console.log('Stock seeding completed.');
}

seed()
  .catch((error) => {
    console.error('Failed to seed stocks:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });