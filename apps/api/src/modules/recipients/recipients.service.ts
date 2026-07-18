import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@gmny/database';
import type {
  CreateRecipientInput,
  Recipient,
  UpdateRecipientInput,
} from '@gmny/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class RecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<Recipient[]> {
    const rows = await this.prisma.recipient.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async get(userId: string, id: string): Promise<Recipient> {
    const row = await this.findOwned(userId, id);
    return this.toDto(row);
  }

  async create(userId: string, input: CreateRecipientInput): Promise<Recipient> {
    const data = this.normalizeCreate(input);

    if (data.isDefault) {
      await this.clearDefault(userId);
    }

    try {
      const row = await this.prisma.recipient.create({
        data: {
          userId,
          ...data,
          country: 'NG',
          currency: 'NGN',
        },
      });

      await this.audit(userId, AuditAction.RECIPIENT_CREATED, row.id);

      return this.toDto(row);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          error: 'RECIPIENT_EXISTS',
          message: 'This bank account is already saved for your user',
        });
      }
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    input: UpdateRecipientInput,
  ): Promise<Recipient> {
    await this.findOwned(userId, id);
    const data = this.normalizeUpdate(input);

    if (data.isDefault === true) {
      await this.clearDefault(userId);
    }

    try {
      const row = await this.prisma.recipient.update({
        where: { id },
        data,
      });

      await this.audit(userId, AuditAction.RECIPIENT_UPDATED, row.id);

      return this.toDto(row);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          error: 'RECIPIENT_EXISTS',
          message: 'This bank account is already saved for your user',
        });
      }
      throw error;
    }
  }

  async remove(userId: string, id: string): Promise<{ success: true }> {
    await this.findOwned(userId, id);

    await this.prisma.recipient.update({
      where: { id },
      data: { isActive: false, isDefault: false },
    });

    await this.audit(userId, AuditAction.RECIPIENT_DELETED, id);

    return { success: true };
  }

  private async findOwned(userId: string, id: string) {
    const row = await this.prisma.recipient.findFirst({
      where: { id, userId, isActive: true },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'RECIPIENT_NOT_FOUND',
        message: 'Recipient not found',
      });
    }
    return row;
  }

  private async clearDefault(userId: string) {
    await this.prisma.recipient.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private normalizeCreate(input: CreateRecipientInput) {
    const accountName = input.accountName?.trim();
    const bankName = input.bankName?.trim();
    const accountNumber = this.normalizeAccountNumber(input.accountNumber);
    const label = input.label?.trim() || null;
    const bankCode = input.bankCode?.trim() || null;

    if (!accountName || accountName.length < 2) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Account name is required',
      });
    }
    if (!bankName || bankName.length < 2) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Bank name is required',
      });
    }

    return {
      accountName,
      bankName,
      accountNumber,
      label,
      bankCode,
      isDefault: Boolean(input.isDefault),
    };
  }

  private normalizeUpdate(input: UpdateRecipientInput) {
    const data: {
      label?: string | null;
      accountName?: string;
      bankName?: string;
      accountNumber?: string;
      bankCode?: string | null;
      isDefault?: boolean;
    } = {};

    if (input.label !== undefined) {
      data.label = input.label?.trim() || null;
    }
    if (input.accountName !== undefined) {
      const accountName = input.accountName.trim();
      if (accountName.length < 2) {
        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'Account name is required',
        });
      }
      data.accountName = accountName;
    }
    if (input.bankName !== undefined) {
      const bankName = input.bankName.trim();
      if (bankName.length < 2) {
        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'Bank name is required',
        });
      }
      data.bankName = bankName;
    }
    if (input.accountNumber !== undefined) {
      data.accountNumber = this.normalizeAccountNumber(input.accountNumber);
    }
    if (input.bankCode !== undefined) {
      data.bankCode = input.bankCode?.trim() || null;
    }
    if (input.isDefault !== undefined) {
      data.isDefault = Boolean(input.isDefault);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'No fields to update',
      });
    }

    return data;
  }

  private normalizeAccountNumber(raw: string | undefined): string {
    const digits = (raw ?? '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(digits)) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Nigerian account number must be exactly 10 digits',
      });
    }
    return digits;
  }

  private toDto(row: {
    id: string;
    label: string | null;
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode: string | null;
    country: string;
    currency: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Recipient {
    return {
      id: row.id,
      label: row.label,
      accountName: row.accountName,
      accountNumber: row.accountNumber,
      bankName: row.bankName,
      bankCode: row.bankCode,
      country: row.country,
      currency: row.currency,
      isDefault: row.isDefault,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async audit(actorId: string, action: AuditAction, entityId: string) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType: 'Recipient',
        entityId,
      },
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
