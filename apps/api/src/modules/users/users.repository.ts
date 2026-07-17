import { Injectable } from '@nestjs/common';
import { Prisma, type User, type UserProfile } from '@gmny/database';
import { PrismaService } from '../../prisma/prisma.service';

export type UserWithProfile = User & { profile: UserProfile | null };

/**
 * Data-access contract for users. Services depend on this abstraction (not on
 * Prisma) so they can be unit-tested with in-memory fakes (DIP / clean arch).
 */
export abstract class UsersRepository {
  abstract findById(id: string): Promise<UserWithProfile | null>;
  abstract list(skip: number, take: number): Promise<[UserWithProfile[], number]>;
  abstract updateUser(id: string, data: Prisma.UserUpdateInput): Promise<UserWithProfile>;
  abstract upsertProfile(
    userId: string,
    data: Prisma.UserProfileUncheckedCreateInput,
  ): Promise<UserProfile>;
}

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findById(id: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({ where: { id }, include: { profile: true } });
  }

  async list(skip: number, take: number): Promise<[UserWithProfile[], number]> {
    return Promise.all([
      this.prisma.user.findMany({
        include: { profile: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count(),
    ]);
  }

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<UserWithProfile> {
    return this.prisma.user.update({ where: { id }, data, include: { profile: true } });
  }

  upsertProfile(
    userId: string,
    data: Prisma.UserProfileUncheckedCreateInput,
  ): Promise<UserProfile> {
    const { userId: _omit, ...rest } = data;
    return this.prisma.userProfile.upsert({
      where: { userId },
      update: rest,
      create: { ...data, userId },
    });
  }
}
