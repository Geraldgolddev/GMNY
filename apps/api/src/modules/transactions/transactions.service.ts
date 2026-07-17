import { Injectable } from '@nestjs/common';
import {
  NotFoundError,
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
  type PaginationParams,
} from '@gmny/shared';
import { TransactionsRepository } from './transactions.repository';
import { TransactionDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly repo: TransactionsRepository) {}

  async list(userId: string, params: PaginationParams): Promise<PaginatedResult<TransactionDto>> {
    const { page, pageSize, skip, take } = normalizePagination(params);
    const [rows, total] = await this.repo.listForUser(userId, skip, take);
    return buildPaginatedResult(rows.map((t) => TransactionDto.from(t)), total, page, pageSize);
  }

  async getById(userId: string, id: string): Promise<TransactionDto> {
    const txn = await this.repo.findByIdForUser(id, userId);
    if (!txn) throw new NotFoundError('Transaction not found');
    return TransactionDto.from(txn);
  }

  async listForWallet(
    walletId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<TransactionDto>> {
    const { page, pageSize, skip, take } = normalizePagination(params);
    const [rows, total] = await this.repo.listForWallet(walletId, skip, take);
    return buildPaginatedResult(rows.map((t) => TransactionDto.from(t)), total, page, pageSize);
  }
}
