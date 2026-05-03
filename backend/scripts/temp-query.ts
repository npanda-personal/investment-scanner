import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.priceTick.findMany({ 
  where: { symbol: '360ONE.NS', timestamp: { gte: new Date('2019-09-18'), lte: new Date('2019-09-20') } },
  select: { timestamp: true }
}).then(x => console.log(x.map(r => r.timestamp.toISOString()))).finally(() => p.$disconnect());