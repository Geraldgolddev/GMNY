import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { CircleWebhookService } from './circle-webhook.service';

describe('CircleWebhookService', () => {
  const prisma = {
    transfer: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const config = {
    webhookSecret: undefined as string | undefined,
  };

  const notifications = {
    notify: jest.fn().mockResolvedValue([]),
  };

  const service = new CircleWebhookService(
    prisma as never,
    config as never,
    notifications as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    notifications.notify.mockResolvedValue([]);
    config.webhookSecret = undefined;
  });

  it('updates transfer status from Circle webhook', async () => {
    prisma.transfer.findFirst.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      settlementRef: 'ctx-1',
      sourceAmount: 100,
      txHash: null,
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        transfer: { update: jest.fn() },
        transaction: { updateMany: jest.fn() },
        auditLog: { create: jest.fn() },
      };
      return fn(tx);
    });

    const result = await service.handle({
      providerTransferId: 'ctx-1',
      status: 'complete',
      txHash: '0xabc',
    });

    expect(result).toEqual({
      ok: true,
      transferId: 't1',
      status: 'COMPLETED',
    });
    expect(notifications.notify).toHaveBeenCalled();
  });

  it('rejects unknown Circle refs', async () => {
    prisma.transfer.findFirst.mockResolvedValue(null);
    await expect(
      service.handle({ providerTransferId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('verifies HMAC when webhook secret is configured', async () => {
    config.webhookSecret = 'secret';
    const body = JSON.stringify({
      providerTransferId: 'ctx-1',
      status: 'complete',
    });
    const badSig = 'deadbeef';

    await expect(
      service.handle(JSON.parse(body), badSig, body),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const goodSig = createHmac('sha256', 'secret').update(body).digest('hex');
    prisma.transfer.findFirst.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      settlementRef: 'ctx-1',
      sourceAmount: 50,
      txHash: null,
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        transfer: { update: jest.fn() },
        transaction: { updateMany: jest.fn() },
        auditLog: { create: jest.fn() },
      }),
    );

    await expect(
      service.handle(JSON.parse(body), goodSig, body),
    ).resolves.toMatchObject({ ok: true });
  });
});
