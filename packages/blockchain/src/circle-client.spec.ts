import { CircleClient } from './circle-client';
import { UpstreamError } from '@gmny/shared';

function mockFetch(response: { ok: boolean; status: number; body: unknown }): typeof fetch {
  return (async () =>
    ({
      ok: response.ok,
      status: response.status,
      text: async () => JSON.stringify(response.body),
    }) as Response) as unknown as typeof fetch;
}

describe('CircleClient', () => {
  it('requires an api key', () => {
    expect(() => new CircleClient({ apiKey: '', baseUrl: 'https://x' })).toThrow(/apiKey/);
  });

  it('parses a successful transfer response', async () => {
    const client = new CircleClient({
      apiKey: 'test',
      baseUrl: 'https://api-sandbox.circle.com',
      fetchImpl: mockFetch({
        ok: true,
        status: 200,
        body: { data: { id: 'tx_1', status: 'pending' } },
      }),
    });
    const transfer = await client.createTransfer({
      sourceWalletId: 'w1',
      destinationAddress: '0xabc',
      amount: '10.00',
      idempotencyKey: 'key-1',
    });
    expect(transfer.id).toBe('tx_1');
    expect(transfer.status).toBe('pending');
  });

  it('maps non-2xx responses to UpstreamError', async () => {
    const client = new CircleClient({
      apiKey: 'test',
      baseUrl: 'https://api-sandbox.circle.com',
      fetchImpl: mockFetch({ ok: false, status: 500, body: { message: 'boom' } }),
    });
    await expect(client.getTransfer('tx_1')).rejects.toBeInstanceOf(UpstreamError);
  });
});
