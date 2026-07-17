import { Injectable } from '@nestjs/common';
import { Prisma, type Recipient } from '@gmny/database';
import { PrismaService } from '../../prisma/prisma.service';

export abstract class RecipientsRepository {
  abstract create(data: Prisma.RecipientUncheckedCreateInput): Promise<Recipient>;
  abstract findByIdForOwner(id: string, ownerId: string): Promise<Recipient | null>;
  abstract listForOwner(ownerId: string, skip: number, take: number): Promise<[Recipient[], number]>;
  abstract update(id: string, data: Prisma.RecipientUpdateInput): Promise<Recipient>;
  abstract delete(id: string): Promise<void>;
}

@Injectable()
export class PrismaRecipientsRepository extends RecipientsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  create(data: Prisma.RecipientUncheckedCreateInput): Promise<Recipient> {
    return this.prisma.recipient.create({ data });
  }

  findByIdForOwner(id: string, ownerId: string): Promise<Recipient | null> {
    return this.prisma.recipient.findFirst({ where: { id, ownerId } });
  }

  listForOwner(ownerId: string, skip: number, take: number): Promise<[Recipient[], number]> {
    return Promise.all([
      this.prisma.recipient.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.recipient.count({ where: { ownerId } }),
    ]) as Promise<[Recipient[], number]>;
  }

  update(id: string, data: Prisma.RecipientUpdateInput): Promise<Recipient> {
    return this.prisma.recipient.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.recipient.delete({ where: { id } });
  }
}
