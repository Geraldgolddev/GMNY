import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser, type AuthUser } from '../../common/auth.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Auth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Authenticated user dashboard overview',
    description:
      'Returns profile, account status, and recent security audit events for the signed-in user.',
  })
  overview(@CurrentUser() user: AuthUser) {
    return this.dashboard.getOverview(user.id);
  }
}
