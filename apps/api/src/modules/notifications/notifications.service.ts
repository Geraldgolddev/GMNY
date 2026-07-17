import { Injectable } from '@nestjs/common';
import {
  NotFoundError,
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
  type PaginationParams,
} from '@gmny/shared';
import { NotificationsRepository } from './notifications.repository';
import { NotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  /** Create an in-app notification (used by other domain services). */
  async notify(userId: string, title: string, body: string): Promise<NotificationDto> {
    return NotificationDto.from(await this.repo.create({ userId, title, body }));
  }

  async list(userId: string, params: PaginationParams): Promise<PaginatedResult<NotificationDto>> {
    const { page, pageSize, skip, take } = normalizePagination(params);
    const [rows, total] = await this.repo.listForUser(userId, skip, take);
    return buildPaginatedResult(rows.map((n) => NotificationDto.from(n)), total, page, pageSize);
  }

  async markRead(userId: string, id: string): Promise<void> {
    const count = await this.repo.markRead(id, userId);
    if (count === 0) throw new NotFoundError('Notification not found or already read');
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    return { updated: await this.repo.markAllRead(userId) };
  }
}
