import { Injectable } from '@nestjs/common';
import { Prisma, type ExchangeRate } from '@gmny/database';
import { PrismaService } from '../../prisma/prisma.service';

export abstract class ExchangeRatesRepository {
  abstract create(data: Prisma.ExchangeRateUncheckedCreateInput): Promise<ExchangeRate>;
  abstract findLatest(): Promise<ExchangeRate | null>;
  abstract findById(id: string): Promise<ExchangeRate | null>;
  abstract list(skip: number, take: number): Promise<[ExchangeRate[], number]>;
}

@Injectable()
export class PrismaExchangeRatesRepository extends ExchangeRatesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  create(data: Prisma.ExchangeRateUncheckedCreateInput): Promise<ExchangeRate> {
    return this.prisma.exchangeRate.create({ data });
  }

  findLatest(): Promise<ExchangeRate | null> {
    return this.prisma.exchangeRate.findFirst({ orderBy: { timestamp: 'desc' } });
  }

  findById(id: string): Promise<ExchangeRate | null> {
    return this.prisma.exchangeRate.findUnique({ where: { id } });
  }

  list(skip: number, take: number): Promise<[ExchangeRate[], number]> {
    return Promise.all([
      this.prisma.exchangeRate.findMany({ orderBy: { timestamp: 'desc' }, skip, take }),
      this.prisma.exchangeRate.count(),
    ]) as Promise<[ExchangeRate[], number]>;
  }
}
