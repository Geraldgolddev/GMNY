import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecipientsService } from './recipients.service';
import { CreateRecipientDto, UpdateRecipientDto } from './dto/recipient.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('recipients')
@ApiBearerAuth()
@Controller('recipients')
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payout recipient' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateRecipientDto) {
    return this.recipientsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my payout recipients' })
  list(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.recipientsService.list(userId, { page, pageSize });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my recipients' })
  getOne(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.recipientsService.getById(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one of my recipients' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecipientDto,
  ) {
    return this.recipientsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one of my recipients' })
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.recipientsService.remove(userId, id);
  }
}
