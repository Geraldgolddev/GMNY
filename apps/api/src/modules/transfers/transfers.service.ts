import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  AuditAction,
  Currency,
  MAX_TRANSFER_MINOR,
  MIN_TRANSFER_MINOR,
  Money,
  QuoteExpiredError,
  TransactionStatus,
  TransactionType,
  TransferStatus,
  ValidationError,
  buildPaginatedResult,
  computeFee,
  convert,
  normalizePagination,
  type PaginatedResult,
  type PaginationParams,
} from '@gmny/shared';
import { Prisma, type ExchangeRate } from '@gmny/database';
import { AuditService } from '../audit/audit.service';
import { RecipientsService } from '../recipients/recipients.service';
import { WalletsService } from '../wallets/wallets.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { TransfersRepository } from './transfers.repository';
import {
  CreateTransferDto,
  QuoteResponseDto,
  QuoteTransferDto,
  TransferDto,
} from './dto/transfer.dto';

interface Computation {
  amountUSD: string;
  fee: string;
  amountNGN: string;
  rate: string;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly repo: TransfersRepository,
    private readonly rates: ExchangeRatesService,
    private readonly recipients: RecipientsService,
    private readonly wallets: WalletsService,
    private readonly audit: AuditService,
  ) {}

  async quote(userId: string, dto: QuoteTransferDto): Promise<QuoteResponseDto> {
    const rate = await this.rates.lockRate('quote');
    const c = this.compute(dto.amountUSD, rate);
    return {
      quoteId: rate.id,
      amountUSD: c.amountUSD,
      exchangeRate: c.rate,
      fee: c.fee,
      amountNGN: c.amountNGN,
      expiresAt: rate.validUntil,
    };
  }

  async create(userId: string, dto: CreateTransferDto): Promise<TransferDto> {
    // Ownership + prerequisites (throw NotFound if the caller can't use these).
    await this.recipients.getById(userId, dto.recipientId);
    const wallet = await this.wallets.getMyWallet(userId);

    // Resolve the rate: honour a locked quote if still valid, else lock fresh.
    let rate: ExchangeRate | null;
    if (dto.quoteId) {
      rate = await this.rates.getValidRate(dto.quoteId);
      if (!rate) throw new ValidationError('Unknown quote');
      if (rate.validUntil < new Date()) throw new QuoteExpiredError();
    } else {
      rate = await this.rates.lockRate('transfer');
    }

    const c = this.compute(dto.amountUSD, rate);
    const reference = this.generateReference();

    const transfer = await this.repo.create({
      reference,
      senderId: userId,
      recipientId: dto.recipientId,
      exchangeRateId: rate.id,
      amountUSD: c.amountUSD,
      exchangeRate: c.rate,
      amountNGN: c.amountNGN,
      fee: c.fee,
      status: TransferStatus.PENDING,
      transactions: {
        create: {
          walletId: wallet.id,
          type: TransactionType.TRANSFER_DEBIT,
          amount: c.amountUSD,
          currency: Currency.USD,
          status: TransactionStatus.PENDING,
          reference: `${reference}-DEBIT`,
        },
      },
    });

    await this.audit.record({
      action: AuditAction.TRANSFER_CREATE,
      entityType: 'Transfer',
      entityId: transfer.id,
      userId,
      metadata: { amountUSD: c.amountUSD, amountNGN: c.amountNGN, reference },
    });

    return TransferDto.from(transfer);
  }

  async list(userId: string, params: PaginationParams): Promise<PaginatedResult<TransferDto>> {
    const { page, pageSize, skip, take } = normalizePagination(params);
    const [rows, total] = await this.repo.listForSender(userId, skip, take);
    return buildPaginatedResult(rows.map((t) => TransferDto.from(t)), total, page, pageSize);
  }

  async getById(userId: string, id: string): Promise<TransferDto> {
    const transfer = await this.repo.findByIdForSender(id, userId);
    if (!transfer) throw new ValidationError('Transfer not found');
    return TransferDto.from(transfer);
  }

  /** Pure money math on integer minor-units; returns spec-shaped decimals. */
  private compute(amountUSDInput: string, rate: ExchangeRate): Computation {
    const usd = Money.fromDecimal(amountUSDInput, Currency.USD);
    if (usd.minorUnits < MIN_TRANSFER_MINOR) {
      throw new ValidationError('Amount is below the minimum transfer size');
    }
    if (usd.minorUnits > MAX_TRANSFER_MINOR) {
      throw new ValidationError('Amount exceeds the maximum transfer size');
    }

    const feeMinor = computeFee(usd.minorUnits);
    const sendMinor = usd.minorUnits - feeMinor;
    if (sendMinor <= 0n) {
      throw new ValidationError('Amount does not cover the transfer fee');
    }

    const effectiveRate = new Prisma.Decimal(rate.ngn).dividedBy(rate.usd).toString();
    const ngn = convert(Money.of(sendMinor, Currency.USD), effectiveRate, Currency.NGN);

    return {
      amountUSD: usd.toDecimalString(),
      fee: Money.of(feeMinor, Currency.USD).toDecimalString(),
      amountNGN: ngn.toDecimalString(),
      rate: effectiveRate,
    };
  }

  private generateReference(): string {
    return `GMNY-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }
}
