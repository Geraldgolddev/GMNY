import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '@gmny/auth';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@gmny.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeAdmin1!';

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      firstName: 'GMNY',
      lastName: 'Admin',
      role: Role.ADMIN,
      kycProfile: { create: {} },
    },
  });

  console.log(`Seeded admin user: ${admin.email}`);
  console.log(
    'Default password is SEED_ADMIN_PASSWORD (or ChangeMeAdmin1!) — rotate immediately.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
