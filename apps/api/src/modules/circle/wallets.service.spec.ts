import { WalletsService } from './wallets.service';

describe('WalletsService', () => {
  const prisma = {
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };

  const config = {
    defaultChain: 'BASE_SEPOLIA' as const,
    mode: 'simulate' as const,
    walletSetId: 'sim_wallet_set',
    statusView: jest.fn().mockReturnValue({
      mode: 'simulate',
      settlementProvider: 'INTERNAL',
      configured: true,
      chain: 'BASE_SEPOLIA',
      apiBaseUrl: 'https://api-sandbox.circle.com',
    }),
  };

  const walletPort = {
    createWallet: jest.fn(),
    getWallet: jest.fn(),
  };

  const notifications = {
    notify: jest.fn().mockResolvedValue([]),
  };

  const service = new WalletsService(
    prisma as never,
    config as never,
    walletPort as never,
    notifications as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    notifications.notify.mockResolvedValue([]);
    config.statusView.mockReturnValue({
      mode: 'simulate',
      settlementProvider: 'INTERNAL',
      configured: true,
      chain: 'BASE_SEPOLIA',
      apiBaseUrl: 'https://api-sandbox.circle.com',
    });
  });

  it('returns existing wallet without calling Circle', async () => {
    prisma.wallet.findUnique.mockResolvedValue({
      id: 'w1',
      provider: 'CIRCLE',
      providerWalletId: 'pw1',
      walletSetId: 'set1',
      address: '0xabc',
      chain: 'BASE_SEPOLIA',
      currency: 'USDC',
      status: 'LIVE',
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
    });

    const view = await service.ensure('user-1');
    expect(view.address).toBe('0xabc');
    expect(walletPort.createWallet).not.toHaveBeenCalled();
  });

  it('provisions a new Circle wallet and audits', async () => {
    prisma.wallet.findUnique.mockResolvedValue(null);
    walletPort.createWallet.mockResolvedValue({
      providerWalletId: 'pw-new',
      walletSetId: 'set1',
      address: '0x1234567890123456789012345678901234567890',
      chain: 'BASE_SEPOLIA',
      currency: 'USDC',
    });
    prisma.wallet.create.mockResolvedValue({
      id: 'w2',
      provider: 'CIRCLE',
      providerWalletId: 'pw-new',
      walletSetId: 'set1',
      address: '0x1234567890123456789012345678901234567890',
      chain: 'BASE_SEPOLIA',
      currency: 'USDC',
      status: 'LIVE',
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
    });

    const view = await service.ensure('user-1');
    expect(view.providerWalletId).toBe('pw-new');
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'WALLET_CREATED' }),
    );
  });
});
