import { prisma } from "../src/shared/lib/prisma";

async function checkCount() {
  const count = await prisma.nseStock.count();
  console.log("Total NSE Companies in Database NseStock table:", count);
  const sample = await prisma.nseStock.findMany({
    take: 5,
    select: { symbol: true, name: true, exchange: true, instrumentKey: true },
  });
  console.log("Sample 5 Companies from DB:", sample);
}

checkCount()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
