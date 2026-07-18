import type { UsdcTransferRequest, UsdcTransferResult } from '../types.js';

/**
 * Port for USDC movement on Base via Circle.
 */
export interface UsdcTransferPort {
  transferUsdc(request: UsdcTransferRequest): Promise<UsdcTransferResult>;
  getTransfer(providerTransferId: string): Promise<UsdcTransferResult>;
}
