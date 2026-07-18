import { InternalSettlementAdapter } from './internal.settlement';

describe('InternalSettlementAdapter', () => {
  const adapter = new InternalSettlementAdapter();

  it('returns a durable settlement reference', async () => {
    const result = await adapter.settleUsdToNgn({
      transferId: '11111111-1111-4111-8111-111111111111',
      userId: 'user-1',
      recipientId: 'recipient-1',
      sourceAmountUsd: 50,
      destAmountNgn: 80000,
      fxRate: 1600,
    });

    expect(result.provider).toBe('INTERNAL');
    expect(result.reference).toMatch(/^int_/);
    expect(result.status).toBe('complete');
  });

  it('rejects non-positive amounts', async () => {
    await expect(
      adapter.settleUsdToNgn({
        transferId: '11111111-1111-4111-8111-111111111111',
        userId: 'user-1',
        recipientId: 'recipient-1',
        sourceAmountUsd: 0,
        destAmountNgn: 0,
        fxRate: 1600,
      }),
    ).rejects.toThrow(/Invalid settlement/);
  });
});
