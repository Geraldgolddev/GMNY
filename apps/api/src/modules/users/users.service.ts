import { Injectable } from '@nestjs/common';
import {
  NotFoundError,
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
  type PaginationParams,
} from '@nairaflow/shared';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  status: true,
  kycStatus: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  kycStatus: string;
  lastLoginAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Fetch a single user's public profile, or throw NotFound. */
  async findById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  /** Paginated list of users (admin-only). */
  async list(params: PaginationParams): Promise<PaginatedResult<PublicUser>> {
    const { page, pageSize, skip, take } = normalizePagination(params);
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        select: PUBLIC_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count(),
    ]);
    return buildPaginatedResult(data, total, page, pageSize);
  }
}
