import { ServiceUnavailableException } from '@nestjs/common';
import { CircleSettlementAdapter } from './circle.settlement';

describe('CircleSettlementAdapter', () => {
  const prisma = {
    auditLog: { create: jest.fn() },
  };
  const config = {
    treasuryWalletId: undefined as string | undefined,
    usdcTokenId: undefined as string | undefined,
    defaultChain: 'BASE_SEPOLIA' as const,
    mode: 'simulate' as const,
  };
  const wallets = {
    ensure: jest.fn(),
  };
  const transfers = {
    transferUsdc: jest.fn(),
    getTransfer: jest.fn(),
  };

  const adapter = new CircleSettlementAdapter(
    prisma as never,
    config as never,
    wallets as never,
    transfers as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('settles via Circle USDC transfer and audits', async () => {
    wallets.ensure.mockResolvedValue({
      providerWalletId: 'pw1',
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    transfers.transferUsdc.mockResolvedValue({
      providerTransferId: 'ctx-1',
      txHash: '0xhash',
      status: 'complete',
    });

    const result = await adapter.settleUsdToNgn({
      transferId: '11111111-1111-4111-8111-111111111111',
      userId: 'user-1',
      recipientId: 'recipient-1',
      sourceAmountUsd: 100,
      destAmountNgn: 159200,
      fxRate: 1600,
    });

    expect(result.provider).toBe('CIRCLE');
    expect(result.reference).toBe('ctx-1');
    expect(result.status).toBe('complete');
    expect(result.chain).toBe('BASE_SEPOLIA');
    expect(result.usdcAmount).toBe(99.5);
    expect(transfers.transferUsdc).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: '99.50',
        destinationAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('maps Circle failures to ServiceUnavailableException', async () => {
    wallets.ensure.mockResolvedValue({
      providerWalletId: 'pw1',
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    });
    transfers.transferUsdc.mockRejectedValue(new Error('Circle down'));

    await expect(
      adapter.settleUsdToNgn({
        transferId: '11111111-1111-4111-8111-111111111111',
        userId: 'user-1',
        recipientId: 'recipient-1',
        sourceAmountUsd: 100,
        destAmountNgn: 159200,
        fxRate: 1600,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
