import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const count = await prisma.strategyDecisionResult.count({
    where: { decision: 'CANDIDATE' }
  });
  console.log(`Total CANDIDATE decisions: ${count}`);

  const countIn = await prisma.strategyDecisionResult.count({
    where: { decision: 'CANDIDATE', instrumentId: { startsWith: 'IN_' } }
  });
  console.log(`Total CANDIDATE decisions (IN_): ${countIn}`);
}
run().finally(() => prisma.$disconnect());
