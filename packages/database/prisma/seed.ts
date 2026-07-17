/**
 * Idempotent seed: admin + demo users (Argon2id), demo profile, a funded
 * demo wallet, treasury, an initial USD→NGN rate, a saved recipient, and one
 * completed sample transfer with its ledger entry. Safe to run repeatedly.
 */
import {
  PrismaClient,
  UserRole,
  UserStatus,
  KycStatus,
  WalletType,
  WalletStatus,
  BlockchainNetwork,
  Currency,
  TransferStatus,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();
const ARGON2_OPTS = { algorithm: 2 as const, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

async function main(): Promise<void> {
  const adminPassword = await hash('Admin!12345', ARGON2_OPTS);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmny.io' },
    update: { passwordHash: adminPassword, emailVerifiedAt: new Date(), status: UserStatus.ACTIVE },
    create: {
      email: 'admin@gmny.io',
      passwordHash: adminPassword,
      firstName: 'GMNY',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.APPROVED,
      emailVerifiedAt: new Date(),
    },
  });

  const userPassword = await hash('Demo!12345', ARGON2_OPTS);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@gmny.io' },
    update: { passwordHash: userPassword, emailVerifiedAt: new Date(), status: UserStatus.ACTIVE },
    create: {
      email: 'demo@gmny.io',
      passwordHash: userPassword,
      firstName: 'Demo',
      lastName: 'Sender',
      phone: '+15551234567',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      kycStatus: KycStatus.APPROVED,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: demo.id },
    update: {},
    create: {
      userId: demo.id,
      address: '123 Market St',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      occupation: 'Software Engineer',
    },
  });

  // Demo user's funded USDC wallet.
  const demoWallet = await prisma.wallet.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: { balance: '500.000000', status: WalletStatus.ACTIVE },
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      userId: demo.id,
      type: WalletType.USER,
      blockchain: BlockchainNetwork.BASE_SEPOLIA,
      currency: Currency.USDC,
      circleWalletId: 'circle_demo_wallet_1',
      address: '0xDEmo000000000000000000000000000000000001',
      balance: '500.000000',
      status: WalletStatus.ACTIVE,
    },
  });

  // Treasury wallet + account (USDC liquidity on Base).
  const treasuryWallet = await prisma.wallet.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      userId: admin.id,
      type: WalletType.TREASURY,
      blockchain: BlockchainNetwork.BASE_SEPOLIA,
      currency: Currency.USDC,
      address: '0x0000000000000000000000000000000000000000',
      balance: '1000000.000000',
      status: WalletStatus.ACTIVE,
    },
  });
  await prisma.treasuryAccount.upsert({
    where: { walletId: treasuryWallet.id },
    update: {},
    create: {
      walletId: treasuryWallet.id,
      label: 'Primary USDC Treasury (Base Sepolia)',
      blockchain: BlockchainNetwork.BASE_SEPOLIA,
      currency: Currency.USDC,
    },
  });

  // Latest USD -> NGN rate.
  const rate = await prisma.exchangeRate.create({
    data: {
      usd: '1',
      ngn: '1600.50',
      source: 'seed',
      validUntil: new Date(Date.now() + 60_000),
    },
  });

  // A saved payout recipient for the demo user.
  const recipient = await prisma.recipient.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      ownerId: demo.id,
      fullName: 'Chidi Okeke',
      bankName: 'Access Bank',
      accountNumber: '0123456789',
      bankCode: '044',
      country: 'NG',
      currency: Currency.NGN,
    },
  });

  // One completed sample transfer + its ledger debit.
  const existing = await prisma.transfer.findUnique({ where: { reference: 'GMNY-SEED-0001' } });
  if (!existing) {
    await prisma.transfer.create({
      data: {
        reference: 'GMNY-SEED-0001',
        senderId: demo.id,
        recipientId: recipient.id,
        exchangeRateId: rate.id,
        amountUSD: '100.00',
        exchangeRate: '1600.50',
        fee: '1.80',
        amountNGN: '157169.10',
        status: TransferStatus.COMPLETED,
        completedAt: new Date(),
        transactions: {
          create: {
            walletId: demoWallet.id,
            type: TransactionType.TRANSFER_DEBIT,
            amount: '100.00',
            currency: Currency.USD,
            status: TransactionStatus.CONFIRMED,
            reference: 'GMNY-TXN-SEED-0001',
          },
        },
      },
    });
  }

  console.log('✅ Seed complete: admin@gmny.io / demo@gmny.io');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
