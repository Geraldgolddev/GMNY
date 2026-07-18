import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SimulatedBaseRpc } from '@gmny/blockchain';
import { BaseService } from './base.service';

describe('BaseService', () => {
  const rpc = new SimulatedBaseRpc();
  const config = {
    chain: 'BASE_SEPOLIA' as const,
    rpcUrl: 'https://sepolia.base.org',
    rpc,
    networkView: jest.fn().mockReturnValue({
      chain: 'BASE_SEPOLIA',
      chainId: 84532,
      name: 'Base Sepolia',
      rpcUrl: 'https://sepolia.base.org',
      rpcMode: 'simulate',
      usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      usdcDecimals: 6,
      explorerUrl: 'https://sepolia.basescan.org',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    }),
  };

  const wallets = {
    ensure: jest.fn(),
  };

  const prisma = {
    transfer: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new BaseService(
    config as never,
    wallets as never,
    prisma as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    config.networkView.mockReturnValue({
      chain: 'BASE_SEPOLIA',
      chainId: 84532,
      name: 'Base Sepolia',
      rpcUrl: 'https://sepolia.base.org',
      rpcMode: 'simulate',
      usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      usdcDecimals: 6,
      explorerUrl: 'https://sepolia.basescan.org',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    });
  });

  it('returns network metadata', () => {
    expect(service.network().chainId).toBe(84532);
  });

  it('reads USDC balance for the user wallet', async () => {
    wallets.ensure.mockResolvedValue({
      address: '0x1111111111111111111111111111111111111111',
    });
    const balance = await service.balanceForUser('user-1');
    expect(Number(balance.balance)).toBeGreaterThan(0);
    expect(balance.explorerUrl).toContain('sepolia.basescan.org/address/');
  });

  it('rejects invalid addresses', async () => {
    await expect(service.balanceForAddress('not-an-address')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('syncs a processing transfer when receipt succeeds', async () => {
    const txHash = `0x${'ab'.repeat(32)}`;
    rpc.setReceipt(txHash, true, 99);
    prisma.transfer.findFirst.mockResolvedValue({
      id: 't1',
      userId: 'user-1',
      txHash,
      chain: 'BASE_SEPOLIA',
      status: 'PROCESSING',
    });

    const result = await service.syncTransfer('user-1', 't1');
    expect(result.status).toBe('success');
    expect(prisma.transfer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('throws when transfer missing', async () => {
    prisma.transfer.findFirst.mockResolvedValue(null);
    await expect(
      service.syncTransfer('user-1', '11111111-1111-4111-8111-111111111111'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
