export class BlockchainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'BlockchainError';
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
