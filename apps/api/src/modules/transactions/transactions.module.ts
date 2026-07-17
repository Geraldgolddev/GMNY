import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import {
  TransactionsRepository,
  PrismaTransactionsRepository,
} from './transactions.repository';

@Module({
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    { provide: TransactionsRepository, useClass: PrismaTransactionsRepository },
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
