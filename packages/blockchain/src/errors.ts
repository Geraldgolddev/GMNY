export class BlockchainError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'BlockchainError';
    this.code = code;
    this.details = details;
  }
}

export class BlockchainNotConfiguredError extends BlockchainError {
  constructor(adapter: string) {
    super(
      `${adapter} is not configured. Set Circle credentials before enabling on-chain transfers.`,
      'BLOCKCHAIN_NOT_CONFIGURED',
    );
    this.name = 'BlockchainNotConfiguredError';
  }
}
