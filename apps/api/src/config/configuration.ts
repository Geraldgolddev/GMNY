/**
 * Namespaced configuration factory consumed via `ConfigService`.
 * Values are read from the validated environment (see env.validation.ts).
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  globalPrefix: string;
  corsOrigins: string[];
  webUrl: string;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
}

export interface Argon2Config {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

export interface MailConfig {
  from: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
}

export interface TokenTtlConfig {
  emailVerificationHours: number;
  passwordResetMinutes: number;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

export interface Configuration {
  app: AppConfig;
  database: { url: string };
  redis: { url: string };
  jwt: JwtConfig;
  cookie: { secret: string };
  argon2: Argon2Config;
  mail: MailConfig;
  tokenTtl: TokenTtlConfig;
  throttle: ThrottleConfig;
}

export function configuration(): Configuration {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    app: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      port: parseInt(process.env.API_PORT ?? '4000', 10),
      globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
      corsOrigins: (process.env.API_CORS_ORIGINS ?? 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
      webUrl: process.env.APP_WEB_URL ?? 'http://localhost:3000',
    },
    database: { url: process.env.DATABASE_URL as string },
    redis: { url: process.env.REDIS_URL as string },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET as string,
      refreshSecret: process.env.JWT_REFRESH_SECRET as string,
      accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
    },
    cookie: { secret: process.env.COOKIE_SECRET as string },
    argon2: {
      memoryCost: parseInt(process.env.ARGON2_MEMORY_COST ?? '19456', 10),
      timeCost: parseInt(process.env.ARGON2_TIME_COST ?? '2', 10),
      parallelism: parseInt(process.env.ARGON2_PARALLELISM ?? '1', 10),
    },
    mail: {
      from: process.env.MAIL_FROM ?? 'GMNY <no-reply@gmny.io>',
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
    },
    tokenTtl: {
      emailVerificationHours: parseInt(process.env.EMAIL_VERIFICATION_TTL_HOURS ?? '24', 10),
      passwordResetMinutes: parseInt(process.env.PASSWORD_RESET_TTL_MINUTES ?? '30', 10),
    },
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT ?? (isProd ? '120' : '1000'), 10),
    },
  };
}
