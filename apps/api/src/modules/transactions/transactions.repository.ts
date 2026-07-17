import { Injectable } from '@nestjs/common';
import type { Transaction } from '@gmny/database';
import { PrismaService } from '../../prisma/prisma.service';

/** A transaction belongs to a user via its wallet or its transfer's sender. */
function ownershipWhere(userId: string) {
  return { OR: [{ wallet: { userId } }, { transfer: { senderId: userId } }] };
}

export abstract class TransactionsRepository {
  abstract listForUser(userId: string, skip: number, take: number): Promise<[Transaction[], number]>;
  abstract findByIdForUser(id: string, userId: string): Promise<Transaction | null>;
  abstract listForWallet(walletId: string, skip: number, take: number): Promise<[Transaction[], number]>;
}

@Injectable()
export class PrismaTransactionsRepository extends TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  listForUser(userId: string, skip: number, take: number): Promise<[Transaction[], number]> {
    const where = ownershipWhere(userId);
    return Promise.all([
      this.prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.transaction.count({ where }),
    ]) as Promise<[Transaction[], number]>;
  }

  findByIdForUser(id: string, userId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({ where: { id, ...ownershipWhere(userId) } });
  }

  listForWallet(walletId: string, skip: number, take: number): Promise<[Transaction[], number]> {
    return Promise.all([
      this.prisma.transaction.findMany({
        where: { walletId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.transaction.count({ where: { walletId } }),
    ]) as Promise<[Transaction[], number]>;
  }
}
