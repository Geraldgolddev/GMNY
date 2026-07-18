import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HistoryService } from './history.service';

describe('HistoryService', () => {
  const prisma = {
    transfer: {
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const service = new HistoryService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('builds summary totals from completed transfers', async () => {
    prisma.transfer.groupBy.mockResolvedValue([
      { status: 'COMPLETED', _count: { _all: 2 } },
      { status: 'FAILED', _count: { _all: 1 } },
    ]);
    prisma.transfer.aggregate.mockResolvedValue({
      _sum: {
        sourceAmount: 250,
        feeAmount: 1.25,
        destAmount: 398000,
      },
      _count: { _all: 2 },
    });

    await expect(service.summary('user-1')).resolves.toEqual({
      transferCount: 3,
      completedCount: 2,
      failedCount: 1,
      totalSentUsd: 250,
      totalFeesUsd: 1.25,
      totalReceivedNgn: 398000,
    });
  });

  it('lists paginated transfers', async () => {
    prisma.transfer.count.mockResolvedValue(1);
    prisma.transfer.findMany.mockResolvedValue([
      {
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
        settlementRef: 'ref',
        note: null,
        failureReason: null,
        completedAt: new Date('2026-07-01T12:00:00.000Z'),
        createdAt: new Date('2026-07-01T12:00:00.000Z'),
        recipient: {
          id: '11111111-1111-4111-8111-111111111111',
          label: 'Mom',
          accountName: 'Ada Okoro',
          accountNumber: '0123456789',
          bankName: 'GTBank',
          bankCode: '058',
        },
      },
    ]);

    const result = await service.listTransfers('user-1', { page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.sourceAmount).toBe(100);
    expect(result.items[0]?.recipient?.accountName).toBe('Ada Okoro');
  });

  it('returns transfer detail with ledger lines', async () => {
    prisma.transfer.findFirst.mockResolvedValue({
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
      settlementRef: 'ref',
      note: null,
      failureReason: null,
      completedAt: new Date('2026-07-01T12:00:00.000Z'),
      createdAt: new Date('2026-07-01T12:00:00.000Z'),
      recipient: {
        id: '11111111-1111-4111-8111-111111111111',
        label: null,
        accountName: 'Ada Okoro',
        accountNumber: '0123456789',
        bankName: 'GTBank',
        bankCode: '058',
      },
      transactions: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          transferId: '22222222-2222-4222-8222-222222222222',
          type: 'FEE',
          status: 'SETTLED',
          currency: 'USD',
          amount: 0.5,
          description: 'Transfer fee (0.5%)',
          createdAt: new Date('2026-07-01T12:00:00.000Z'),
        },
      ],
    });

    const detail = await service.getTransferDetail(
      'user-1',
      '22222222-2222-4222-8222-222222222222',
    );
    expect(detail.ledger).toHaveLength(1);
    expect(detail.ledger[0]?.type).toBe('FEE');
  });

  it('throws when transfer detail is missing', async () => {
    prisma.transfer.findFirst.mockResolvedValue(null);
    await expect(
      service.getTransferDetail('user-1', '22222222-2222-4222-8222-222222222222'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid from date on ledger list', async () => {
    await expect(
      service.listLedger('user-1', { from: 'not-a-date' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists ledger entries', async () => {
    prisma.transaction.count.mockResolvedValue(1);
    prisma.transaction.findMany.mockResolvedValue([
      {
        id: '33333333-3333-4333-8333-333333333333',
        transferId: '22222222-2222-4222-8222-222222222222',
        type: 'TRANSFER',
        status: 'SETTLED',
        currency: 'USD',
        amount: 100,
        description: 'Send 100.00 USD',
        createdAt: new Date('2026-07-01T12:00:00.000Z'),
      },
    ]);

    const result = await service.listLedger('user-1', { page: 1 });
    expect(result.items[0]?.amount).toBe(100);
    expect(result.totalPages).toBe(1);
  });
});
