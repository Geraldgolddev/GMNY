import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RecipientsService } from './recipients.service';

describe('RecipientsService', () => {
  const prisma = {
    recipient: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const service = new RecipientsService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates a valid Nigerian recipient', async () => {
    prisma.recipient.updateMany.mockResolvedValue({ count: 0 });
    prisma.recipient.create.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      label: 'Mom',
      accountName: 'Ada Okoro',
      accountNumber: '0123456789',
      bankName: 'GTBank',
      bankCode: '058',
      country: 'NG',
      currency: 'NGN',
      isDefault: true,
      isActive: true,
      createdAt: new Date('2026-07-18T00:00:00.000Z'),
      updatedAt: new Date('2026-07-18T00:00:00.000Z'),
    });
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.create('user-1', {
      label: 'Mom',
      accountName: 'Ada Okoro',
      accountNumber: '012-345-6789',
      bankName: 'GTBank',
      bankCode: '058',
      isDefault: true,
    });

    expect(result.accountNumber).toBe('0123456789');
    expect(result.isDefault).toBe(true);
    expect(prisma.recipient.updateMany).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('rejects invalid account numbers', async () => {
    await expect(
      service.create('user-1', {
        accountName: 'Ada Okoro',
        accountNumber: '123',
        bankName: 'GTBank',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps unique constraint to conflict', async () => {
    prisma.recipient.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.create('user-1', {
        accountName: 'Ada Okoro',
        accountNumber: '0123456789',
        bankName: 'GTBank',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('soft deletes owned recipients', async () => {
    prisma.recipient.findFirst.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      userId: 'user-1',
      isActive: true,
    });
    prisma.recipient.update.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.remove('user-1', '11111111-1111-4111-8111-111111111111'),
    ).resolves.toEqual({ success: true });
  });

  it('404s when recipient is missing', async () => {
    prisma.recipient.findFirst.mockResolvedValue(null);
    await expect(
      service.get('user-1', '11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
