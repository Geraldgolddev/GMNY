/**
 * Idempotent seed script.
 *
 * Seeds a baseline admin account, a demo user, a treasury wallet, and an
 * initial USD→NGN exchange rate so the platform is immediately explorable.
 * Safe to run multiple times (uses upserts).
 */
import { PrismaClient, UserRole, UserStatus, KycStatus, WalletType, BlockchainNetwork, Currency } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

  const adminPassword = await bcrypt.hash('Admin!12345', saltRounds);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nairaflow.io' },
    update: {},
    create: {
      email: 'admin@nairaflow.io',
      passwordHash: adminPassword,
      firstName: 'Naira',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.APPROVED,
    },
  });

  const userPassword = await bcrypt.hash('Demo!12345', saltRounds);
  await prisma.user.upsert({
    where: { email: 'demo@nairaflow.io' },
    update: {},
    create: {
      email: 'demo@nairaflow.io',
      passwordHash: userPassword,
      firstName: 'Demo',
      lastName: 'Sender',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.APPROVED,
    },
  });

  // Treasury wallet (holds USDC liquidity on Base).
  const treasuryWallet = await prisma.wallet.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      userId: admin.id,
      type: WalletType.TREASURY,
      network: BlockchainNetwork.BASE_SEPOLIA,
      currency: Currency.USDC,
      address: '0x0000000000000000000000000000000000000000',
    },
  });

  await prisma.treasuryAccount.upsert({
    where: { walletId: treasuryWallet.id },
    update: {},
    create: {
      walletId: treasuryWallet.id,
      label: 'Primary USDC Treasury (Base Sepolia)',
      network: BlockchainNetwork.BASE_SEPOLIA,
      currency: Currency.USDC,
    },
  });

  await prisma.exchangeRate.create({
    data: {
      baseCurrency: Currency.USD,
      quoteCurrency: Currency.NGN,
      rate: '1600.50',
      source: 'seed',
      validUntil: new Date(Date.now() + 60_000),
    },
  });

  console.log('✅ Seed complete: admin@nairaflow.io / demo@nairaflow.io');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
