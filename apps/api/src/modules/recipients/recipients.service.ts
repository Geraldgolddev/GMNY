import { Injectable } from '@nestjs/common';
import {
  AuditAction,
  Currency,
  NotFoundError,
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
  type PaginationParams,
} from '@gmny/shared';
import type { Recipient } from '@gmny/database';
import { AuditService } from '../audit/audit.service';
import { RecipientsRepository } from './recipients.repository';
import {
  CreateRecipientDto,
  RecipientDto,
  UpdateRecipientDto,
} from './dto/recipient.dto';

@Injectable()
export class RecipientsService {
  constructor(
    private readonly repo: RecipientsRepository,
    private readonly audit: AuditService,
  ) {}

  async create(ownerId: string, dto: CreateRecipientDto): Promise<RecipientDto> {
    const recipient = await this.repo.create({
      ownerId,
      fullName: dto.fullName,
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
      bankCode: dto.bankCode,
      country: dto.country ?? 'NG',
      currency: (dto.currency ?? Currency.NGN) as Currency,
    });
    await this.audit.record({
      action: AuditAction.RECIPIENT_CREATE,
      entityType: 'Recipient',
      entityId: recipient.id,
      userId: ownerId,
    });
    return this.toDto(recipient);
  }

  async list(ownerId: string, params: PaginationParams): Promise<PaginatedResult<RecipientDto>> {
    const { page, pageSize, skip, take } = normalizePagination(params);
    const [rows, total] = await this.repo.listForOwner(ownerId, skip, take);
    return buildPaginatedResult(rows.map((r) => this.toDto(r)), total, page, pageSize);
  }

  async getById(ownerId: string, id: string): Promise<RecipientDto> {
    return this.toDto(await this.mustOwn(ownerId, id));
  }

  async update(ownerId: string, id: string, dto: UpdateRecipientDto): Promise<RecipientDto> {
    await this.mustOwn(ownerId, id);
    const updated = await this.repo.update(id, {
      fullName: dto.fullName,
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
      bankCode: dto.bankCode,
      country: dto.country,
      currency: dto.currency as Currency | undefined,
    });
    await this.audit.record({
      action: AuditAction.RECIPIENT_UPDATE,
      entityType: 'Recipient',
      entityId: id,
      userId: ownerId,
    });
    return this.toDto(updated);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.mustOwn(ownerId, id);
    await this.repo.delete(id);
    await this.audit.record({
      action: AuditAction.RECIPIENT_DELETE,
      entityType: 'Recipient',
      entityId: id,
      userId: ownerId,
    });
  }

  private async mustOwn(ownerId: string, id: string): Promise<Recipient> {
    const recipient = await this.repo.findByIdForOwner(id, ownerId);
    if (!recipient) throw new NotFoundError('Recipient not found');
    return recipient;
  }

  private toDto(r: Recipient): RecipientDto {
    return {
      id: r.id,
      fullName: r.fullName,
      bankName: r.bankName,
      accountNumber: r.accountNumber,
      bankCode: r.bankCode,
      country: r.country,
      currency: r.currency as Currency,
      createdAt: r.createdAt,
    };
  }
}
