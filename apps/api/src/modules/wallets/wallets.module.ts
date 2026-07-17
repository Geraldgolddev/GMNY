import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletsRepository, PrismaWalletsRepository } from './wallets.repository';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [TransactionsModule],
  controllers: [WalletsController],
  providers: [WalletsService, { provide: WalletsRepository, useClass: PrismaWalletsRepository }],
  exports: [WalletsService],
})
export class WalletsModule {}
