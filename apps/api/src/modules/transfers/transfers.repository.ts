import { Injectable } from '@nestjs/common';
import { Prisma, type Transfer } from '@gmny/database';
import { PrismaService } from '../../prisma/prisma.service';

export type TransferWithRelations = Transfer;

export abstract class TransfersRepository {
  abstract create(data: Prisma.TransferUncheckedCreateInput): Promise<Transfer>;
  abstract findByIdForSender(id: string, senderId: string): Promise<Transfer | null>;
  abstract listForSender(senderId: string, skip: number, take: number): Promise<[Transfer[], number]>;
}

@Injectable()
export class PrismaTransfersRepository extends TransfersRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /** Creates the transfer and its ledger debit atomically (nested write). */
  create(data: Prisma.TransferUncheckedCreateInput): Promise<Transfer> {
    return this.prisma.transfer.create({ data });
  }

  findByIdForSender(id: string, senderId: string): Promise<Transfer | null> {
    return this.prisma.transfer.findFirst({ where: { id, senderId } });
  }

  listForSender(senderId: string, skip: number, take: number): Promise<[Transfer[], number]> {
    return Promise.all([
      this.prisma.transfer.findMany({
        where: { senderId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.transfer.count({ where: { senderId } }),
    ]) as Promise<[Transfer[], number]>;
  }
}
