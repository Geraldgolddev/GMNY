import type { UsdcTransferPort } from '../ports/transfer.port';
import type { UsdcTransferRequest, UsdcTransferResult } from '../types';
import type { CircleClient } from './client.port';

export class CircleUsdcTransferAdapter implements UsdcTransferPort {
  constructor(private readonly client: CircleClient) {}

  transferUsdc(request: UsdcTransferRequest): Promise<UsdcTransferResult> {
    return this.client.transferUsdc(request);
  }

  getTransfer(providerTransferId: string): Promise<UsdcTransferResult> {
    return this.client.getTransfer(providerTransferId);
  }
}
