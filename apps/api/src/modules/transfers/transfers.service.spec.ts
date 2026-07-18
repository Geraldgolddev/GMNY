import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransfersService } from './transfers.service';

describe('TransfersService', () => {
  const prisma = {
    recipient: { findFirst: jest.fn() },
    transfer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const rates = {
    quote: jest.fn(),
  };

  const settlement = {
    settleUsdToNgn: jest.fn(),
  };

  const notifications = {
    notify: jest.fn().mockResolvedValue([]),
  };

  const service = new TransfersService(
    prisma as never,
    rates as never,
    settlement as never,
    notifications as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    notifications.notify.mockResolvedValue([]);
  });

  it('creates a completed USD→NGN transfer', async () => {
    prisma.recipient.findFirst.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      accountName: 'Ada Okoro',
      isActive: true,
    });
    prisma.transfer.findUnique.mockResolvedValue(null);
    rates.quote.mockResolvedValue({
      rate: 1600,
      source: 'test',
      fetchedAt: new Date().toISOString(),
    });
    settlement.settleUsdToNgn.mockResolvedValue({
      provider: 'INTERNAL',
      reference: 'int_ref_1',
      status: 'complete',
    });

    const created = {
      id: '22222222-2222-4222-8222-222222222222',
      recipientId: '11111111-1111-4111-8111-111111111111',
      status: 'COMPLETED',
      sourceCurrency: 'USD',
      sourceAmount: 100,
      destCurrency: 'NGN',
      destAmount: 159200,
      fxRate: 1600,
      feeAmount: 0.5,
      feeCurrency: 'USD',
      fxSource: 'test',
      settlementProvider: 'INTERNAL',
      settlementRef: 'int_ref_1',
      note: null,
      failureReason: null,
      completedAt: new Date(),
      createdAt: new Date(),
      recipient: {
        id: '11111111-1111-4111-8111-111111111111',
        label: 'Mom',
        accountName: 'Ada Okoro',
        accountNumber: '0123456789',
        bankName: 'GTBank',
        bankCode: '058',
      },
    };

    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        transfer: { create: jest.fn().mockResolvedValue(created) },
        transaction: { createMany: jest.fn().mockResolvedValue({ count: 3 }) },
        auditLog: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      };
      return fn(tx);
    });

    const result = await service.create('user-1', {
      recipientId: '11111111-1111-4111-8111-111111111111',
      amountUsd: 100,
      idempotencyKey: 'key-1',
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.destAmount).toBe(159200);
    expect(result.feeAmount).toBe(0.5);
    expect(settlement.settleUsdToNgn).toHaveBeenCalled();
  });

  it('rejects missing recipients', async () => {
    prisma.recipient.findFirst.mockResolvedValue(null);
    await expect(
      service.create('user-1', {
        recipientId: '11111111-1111-4111-8111-111111111111',
        amountUsd: 100,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects amounts below minimum', async () => {
    await expect(
      service.create('user-1', {
        recipientId: '11111111-1111-4111-8111-111111111111',
        amountUsd: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns existing transfer for same idempotency key', async () => {
    prisma.recipient.findFirst.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      accountName: 'Ada',
      isActive: true,
    });
    prisma.transfer.findUnique.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      userId: 'user-1',
      recipientId: '11111111-1111-4111-8111-111111111111',
      status: 'COMPLETED',
      sourceCurrency: 'USD',
      sourceAmount: 100,
      destCurrency: 'NGN',
      destAmount: 159200,
      fxRate: 1600,
      feeAmount: 0.5,
      feeCurrency: 'USD',
      fxSource: 'test',
      settlementProvider: 'INTERNAL',
      settlementRef: 'int_ref_1',
      note: null,
      failureReason: null,
      completedAt: new Date(),
      createdAt: new Date(),
      recipient: {
        id: '11111111-1111-4111-8111-111111111111',
        label: null,
        accountName: 'Ada',
        accountNumber: '0123456789',
        bankName: 'GTBank',
        bankCode: null,
      },
    });

    const result = await service.create('user-1', {
      recipientId: '11111111-1111-4111-8111-111111111111',
      amountUsd: 100,
      idempotencyKey: 'key-1',
    });

    expect(result.id).toBe('22222222-2222-4222-8222-222222222222');
    expect(rates.quote).not.toHaveBeenCalled();
  });
});
