import { Module } from '@nestjs/common';
import { CircleModule } from '../circle/circle.module';
import { BaseConfigService } from './base-config.service';
import { BaseController } from './base.controller';
import { BaseService } from './base.service';

@Module({
  imports: [CircleModule],
  controllers: [BaseController],
  providers: [BaseConfigService, BaseService],
  exports: [BaseService, BaseConfigService],
})
export class BaseModule {}
