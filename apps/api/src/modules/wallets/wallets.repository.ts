import { Injectable } from '@nestjs/common';
import { Prisma, WalletType, type Wallet } from '@gmny/database';
import { PrismaService } from '../../prisma/prisma.service';

export abstract class WalletsRepository {
  abstract findUserWallet(userId: string): Promise<Wallet | null>;
  abstract findById(id: string): Promise<Wallet | null>;
  abstract create(data: Prisma.WalletUncheckedCreateInput): Promise<Wallet>;
}

@Injectable()
export class PrismaWalletsRepository extends WalletsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findUserWallet(userId: string): Promise<Wallet | null> {
    return this.prisma.wallet.findFirst({ where: { userId, type: WalletType.USER } });
  }

  findById(id: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({ where: { id } });
  }

  create(data: Prisma.WalletUncheckedCreateInput): Promise<Wallet> {
    return this.prisma.wallet.create({ data });
  }
}
