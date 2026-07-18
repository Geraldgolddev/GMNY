import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  SETTLEMENT_PROVIDER: z.enum(['INTERNAL', 'CIRCLE']).default('INTERNAL'),
  CIRCLE_MODE: z.enum(['simulate', 'live']).default('simulate'),
  CIRCLE_API_KEY: z.string().optional(),
  CIRCLE_ENTITY_SECRET: z.string().optional(),
  CIRCLE_WALLET_SET_ID: z.string().optional(),
  CIRCLE_USDC_TOKEN_ID: z.string().optional(),
  CIRCLE_TREASURY_WALLET_ID: z.string().optional(),
  CIRCLE_API_BASE_URL: z.string().optional(),
  CIRCLE_CHAIN: z.enum(['BASE', 'BASE_SEPOLIA']).default('BASE_SEPOLIA'),
  CIRCLE_WEBHOOK_SECRET: z.string().optional(),
  BASE_RPC_MODE: z.enum(['simulate', 'live']).default('simulate'),
  BASE_RPC_URL: z.string().optional(),
  BASE_CHAIN: z.enum(['BASE', 'BASE_SEPOLIA']).optional(),
  NOTIFICATIONS_EMAIL_ENABLED: z.string().optional().default('false'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return parsed.data;
}
