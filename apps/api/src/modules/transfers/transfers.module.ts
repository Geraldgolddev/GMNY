import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { TransfersRepository, PrismaTransfersRepository } from './transfers.repository';
import { RecipientsModule } from '../recipients/recipients.module';
import { WalletsModule } from '../wallets/wallets.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';

@Module({
  imports: [RecipientsModule, WalletsModule, ExchangeRatesModule],
  controllers: [TransfersController],
  providers: [
    TransfersService,
    { provide: TransfersRepository, useClass: PrismaTransfersRepository },
  ],
  exports: [TransfersService],
})
export class TransfersModule {}
