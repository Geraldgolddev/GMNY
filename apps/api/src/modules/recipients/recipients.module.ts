import { Module } from '@nestjs/common';
import { RecipientsController } from './recipients.controller';
import { RecipientsService } from './recipients.service';
import { RecipientsRepository, PrismaRecipientsRepository } from './recipients.repository';

@Module({
  controllers: [RecipientsController],
  providers: [
    RecipientsService,
    { provide: RecipientsRepository, useClass: PrismaRecipientsRepository },
  ],
  exports: [RecipientsService],
})
export class RecipientsModule {}
