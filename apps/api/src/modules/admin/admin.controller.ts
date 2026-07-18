import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { UpdateAdminUserInput } from '@gmny/shared';
import {
  AdminAuth,
  CurrentUser,
  type AuthUser,
} from '../../common/auth.decorator';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@AdminAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform KPIs for the admin console' })
  overview() {
    return this.admin.overview();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users (admin)' })
  listUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
  ) {
    return this.admin.listUsers({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      q,
    });
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  updateUser(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateAdminUserInput,
  ) {
    return this.admin.updateUser(actor.id, id, body);
  }

  @Get('transfers')
  @ApiOperation({ summary: 'List all transfers (admin)' })
  listTransfers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    return this.admin.listTransfers({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
    });
  }

  @Get('audit')
  @ApiOperation({ summary: 'Recent audit log entries' })
  audit(@Query('limit') limit?: string) {
    return this.admin.recentAudit(limit ? Number(limit) : 30);
  }
}
