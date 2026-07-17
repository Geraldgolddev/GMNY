import { Injectable } from '@nestjs/common';
import {
  AuditAction,
  NotFoundError,
  UserStatus,
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
  type PaginationParams,
} from '@gmny/shared';
import { AuditService, type AuditContext } from '../audit/audit.service';
import { UsersRepository, type UserWithProfile } from './users.repository';
import { UpdateMeDto, UpdateUserStatusDto, type UserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async getById(id: string): Promise<UserDto> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return this.toDto(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto, ctx: AuditContext): Promise<UserDto> {
    const existing = await this.repo.findById(userId);
    if (!existing) throw new NotFoundError('User not found');

    const updated = await this.repo.updateUser(userId, {
      firstName: dto.firstName ?? existing.firstName,
      lastName: dto.lastName ?? existing.lastName,
      phone: dto.phone ?? existing.phone,
    });

    if (dto.profile) {
      await this.repo.upsertProfile(userId, {
        userId,
        address: dto.profile.address,
        city: dto.profile.city,
        state: dto.profile.state,
        country: dto.profile.country,
        dateOfBirth: dto.profile.dateOfBirth ? new Date(dto.profile.dateOfBirth) : undefined,
        occupation: dto.profile.occupation,
      });
    }

    await this.audit.record({
      action: AuditAction.USER_UPDATE,
      entityType: 'User',
      entityId: userId,
      userId,
      context: ctx,
    });

    const fresh = await this.repo.findById(userId);
    return this.toDto(fresh ?? updated);
  }

  async list(params: PaginationParams): Promise<PaginatedResult<UserDto>> {
    const { page, pageSize, skip, take } = normalizePagination(params);
    const [rows, total] = await this.repo.list(skip, take);
    return buildPaginatedResult(rows.map((u) => this.toDto(u)), total, page, pageSize);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, actorId: string): Promise<UserDto> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    const updated = await this.repo.updateUser(id, { status: dto.status as UserStatus });
    await this.audit.record({
      action: AuditAction.USER_STATUS_CHANGE,
      entityType: 'User',
      entityId: id,
      userId: actorId,
      metadata: { from: user.status, to: dto.status },
    });
    return this.toDto(updated);
  }

  private toDto(user: UserWithProfile): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role as UserDto['role'],
      status: user.status as UserDto['status'],
      kycStatus: user.kycStatus as UserDto['kycStatus'],
      emailVerified: Boolean(user.emailVerifiedAt),
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            address: user.profile.address,
            city: user.profile.city,
            state: user.profile.state,
            country: user.profile.country,
            dateOfBirth: user.profile.dateOfBirth ? user.profile.dateOfBirth.toISOString() : null,
            occupation: user.profile.occupation,
          }
        : null,
    };
  }
}
