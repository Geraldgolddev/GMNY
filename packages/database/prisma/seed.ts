import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '@gmny/auth';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@gmny.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeAdmin1!';
  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN, isActive: true },
    create: {
      email,
      passwordHash,
      firstName: 'GMNY',
      lastName: 'Admin',
      role: Role.ADMIN,
    },
  });

  await prisma.exchangeRate.upsert({
    where: { pair: 'USDNGN' },
    update: {},
    create: {
      pair: 'USDNGN',
      baseCurrency: 'USD',
      quoteCurrency: 'NGN',
      rate: 1600,
      source: 'gmny-seed',
      fetchedAt: new Date(0),
    },
  });

  console.log(`Seeded admin: ${admin.email}`);
  console.log('Seeded fallback USDNGN rate (live refresh on API boot)');
}


main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
