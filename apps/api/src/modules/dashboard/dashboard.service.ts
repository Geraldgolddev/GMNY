import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { DashboardOverview } from '@gmny/shared';
import { Role } from '@gmny/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string): Promise<DashboardOverview> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'User not found or inactive',
      });
    }

    const events = await this.prisma.auditLog.findMany({
      where: {
        actorId: userId,
        action: {
          in: ['USER_LOGIN', 'USER_LOGOUT', 'TOKEN_REFRESHED', 'USER_REGISTERED'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        action: true,
        createdAt: true,
        ipAddress: true,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as Role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      },
      account: {
        createdAt: user.createdAt.toISOString(),
        isActive: user.isActive,
        role: user.role as Role,
      },
      security: {
        recentEvents: events.map((e) => ({
          id: e.id,
          action: e.action,
          createdAt: e.createdAt.toISOString(),
          ipAddress: e.ipAddress,
        })),
      },
    };
  }
}
