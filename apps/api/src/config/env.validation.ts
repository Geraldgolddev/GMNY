import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Strongly-typed environment contract. The app refuses to boot if any
 * required variable is missing or malformed — fail fast over fail obscure.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  API_PORT = 4000;

  @IsString()
  @IsNotEmpty()
  API_GLOBAL_PREFIX = 'api';

  @IsString()
  API_CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @MinLength(16, { message: 'JWT_ACCESS_SECRET must be at least 16 characters' })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(16, { message: 'JWT_REFRESH_SECRET must be at least 16 characters' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_ACCESS_TTL = '15m';

  @IsString()
  JWT_REFRESH_TTL = '7d';

  @IsString()
  @MinLength(16, { message: 'COOKIE_SECRET must be at least 16 characters' })
  COOKIE_SECRET!: string;

  @IsString()
  APP_WEB_URL = 'http://localhost:3000';

  @IsString()
  MAIL_FROM = 'GMNY <no-reply@gmny.io>';

  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  SMTP_PORT?: number;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  @Type(() => Number)
  @IsInt()
  ARGON2_MEMORY_COST = 19_456;

  @Type(() => Number)
  @IsInt()
  ARGON2_TIME_COST = 2;

  @Type(() => Number)
  @IsInt()
  ARGON2_PARALLELISM = 1;

  @Type(() => Number)
  @IsInt()
  THROTTLE_TTL = 60;

  @Type(() => Number)
  @IsInt()
  THROTTLE_LIMIT = 120;

  @Type(() => Number)
  @IsInt()
  EMAIL_VERIFICATION_TTL_HOURS = 24;

  @Type(() => Number)
  @IsInt()
  PASSWORD_RESET_TTL_MINUTES = 30;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return validated;
}
