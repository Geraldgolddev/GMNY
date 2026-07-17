import { PrismaClient, Prisma } from '@prisma/client';

export * from '@prisma/client';

/**
 * Factory for a configured PrismaClient. Centralising creation lets the API,
 * workers, and test harness share identical logging + error configuration.
 */
export function createPrismaClient(options?: {
  datasourceUrl?: string;
  log?: Prisma.LogLevel[];
}): PrismaClient {
  return new PrismaClient({
    datasources: options?.datasourceUrl
      ? { db: { url: options.datasourceUrl } }
      : undefined,
    log: options?.log ?? (process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']),
  });
}

/** Serialize BigInt ledger amounts to strings for safe JSON transport. */
export function serializeBigInts<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val)),
  );
}
