/**
 * Namespaced configuration factory consumed via `ConfigService`.
 * Values are read from the validated environment (see env.validation.ts).
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  globalPrefix: string;
  corsOrigins: string[];
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
  bcryptSaltRounds: number;
}

export interface Configuration {
  app: AppConfig;
  database: { url: string };
  redis: { url: string };
  jwt: JwtConfig;
}

export function configuration(): Configuration {
  return {
    app: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      port: parseInt(process.env.API_PORT ?? '4000', 10),
      globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
      corsOrigins: (process.env.API_CORS_ORIGINS ?? 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    },
    database: { url: process.env.DATABASE_URL as string },
    redis: { url: process.env.REDIS_URL as string },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET as string,
      refreshSecret: process.env.JWT_REFRESH_SECRET as string,
      accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
      bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
    },
  };
}
