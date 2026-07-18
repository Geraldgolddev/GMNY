import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthGuard, RolesGuard } from './common/auth.decorator';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { RatesModule } from './modules/exchange-rates/rates.module';
import { RecipientsModule } from './modules/recipients/recipients.module';
import { BaseModule } from './modules/base/base.module';
import { CircleModule } from './modules/circle/circle.module';
import { HistoryModule } from './modules/history/history.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TransfersModule } from './modules/transfers/transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    DashboardModule,
    RecipientsModule,
    RatesModule,
    NotificationsModule,
    CircleModule,
    BaseModule,
    TransfersModule,
    HistoryModule,
    AdminModule,
  ],
  providers: [AuthGuard, RolesGuard],
})
export class AppModule {}




