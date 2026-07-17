import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  NotFoundError,
  QUOTE_TTL_SECONDS,
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
  type PaginationParams,
} from '@gmny/shared';
import type { ExchangeRate } from '@gmny/database';
import { AuditService } from '../audit/audit.service';
import { ExchangeRatesRepository } from './exchange-rates.repository';
import { RATE_PROVIDER, type RateProvider } from './rate-provider';
import { CreateExchangeRateDto, ExchangeRateDto } from './dto/exchange-rate.dto';

@Injectable()
export class ExchangeRatesService {
  constructor(
    private readonly repo: ExchangeRatesRepository,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Inject(RATE_PROVIDER) private readonly provider: RateProvider,
  ) {}

  /** Return the most recent still-valid rate, locking a fresh one if needed. */
  async getLatest(): Promise<ExchangeRateDto> {
    const latest = await this.repo.findLatest();
    if (latest && latest.validUntil > new Date()) {
      return this.toDto(latest);
    }
    return this.toDto(await this.lockRate('auto'));
  }

  /** Lock a new quote rate valid for QUOTE_TTL_SECONDS and return the row. */
  async lockRate(source: string): Promise<ExchangeRate> {
    const ngn = await this.provider.getUsdToNgn();
    return this.repo.create({
      usd: '1',
      ngn,
      source,
      validUntil: new Date(Date.now() + QUOTE_TTL_SECONDS * 1000),
    });
  }

  async getValidRate(id: string): Promise<ExchangeRate | null> {
    return this.repo.findById(id);
  }

  async history(params: PaginationParams): Promise<PaginatedResult<ExchangeRateDto>> {
    const { page, pageSize, skip, take } = normalizePagination(params);
    const [rows, total] = await this.repo.list(skip, take);
    return buildPaginatedResult(rows.map((r) => this.toDto(r)), total, page, pageSize);
  }

  async createManual(dto: CreateExchangeRateDto, actorId: string): Promise<ExchangeRateDto> {
    const rate = await this.repo.create({
      usd: '1',
      ngn: dto.ngn,
      source: dto.source ?? 'manual',
      validUntil: new Date(Date.now() + QUOTE_TTL_SECONDS * 1000),
    });
    await this.audit.record({
      action: AuditAction.EXCHANGE_RATE_CREATE,
      entityType: 'ExchangeRate',
      entityId: rate.id,
      userId: actorId,
      metadata: { ngn: dto.ngn },
    });
    return this.toDto(rate);
  }

  async getByIdOrThrow(id: string): Promise<ExchangeRateDto> {
    const rate = await this.repo.findById(id);
    if (!rate) throw new NotFoundError('Exchange rate not found');
    return this.toDto(rate);
  }

  toDto(r: ExchangeRate): ExchangeRateDto {
    const usd = r.usd.toString();
    const ngn = r.ngn.toString();
    const rate = (Number(ngn) / Number(usd)).toString();
    return {
      id: r.id,
      usd,
      ngn,
      rate,
      source: r.source,
      timestamp: r.timestamp,
      validUntil: r.validUntil,
    };
  }
}
