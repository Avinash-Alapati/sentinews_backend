const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.resolve('.env'), 'utf8');
const match = env.match(/DATABASE_URL\s*=\s*\"?([^\"\r\n]+)\"?/);
const databaseUrl = match ? match[1].trim() : "postgresql://postgres:Yaswanth_@2826@localhost:5432/sentinews_backend?schema=public";

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 12);

  const demoUsers = [
    {
      name: 'Premium Demo User',
      email: 'premium@sentinews.com',
      role: 'PREMIUM',
    },
    {
      name: 'Registered Demo User',
      email: 'user@sentinews.com',
      role: 'FREE',
    },
  ];

  for (const user of demoUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role,
          provider: 'credentials',
          mobileVerified: true,
          emailVerified: new Date(),
        },
      });
      console.log(`Created demo user: ${user.email}`);
    } else {
      await prisma.user.update({
        where: { email: user.email },
        data: {
          passwordHash,
          emailVerified: new Date(),
        },
      });
      console.log(`Updated password for existing demo user: ${user.email}`);
    }
  }

  console.log('Demo users seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
