import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CreateRecipientInput, UpdateRecipientInput } from '@gmny/shared';
import { Auth, CurrentUser, type AuthUser } from '../../common/auth.decorator';
import { RecipientsService } from './recipients.service';

@ApiTags('recipients')
@ApiBearerAuth()
@Auth()
@Controller('recipients')
export class RecipientsController {
  constructor(private readonly recipients: RecipientsService) {}

  @Get()
  @ApiOperation({ summary: 'List active recipients for the signed-in user' })
  list(@CurrentUser() user: AuthUser) {
    return this.recipients.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recipient by id' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.recipients.get(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a Nigerian bank recipient' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateRecipientInput) {
    return this.recipients.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recipient' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateRecipientInput,
  ) {
    return this.recipients.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a recipient' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.recipients.remove(user.id, id);
  }
}
