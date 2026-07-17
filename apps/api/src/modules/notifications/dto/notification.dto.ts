import { ApiProperty } from '@nestjs/swagger';
import type { Notification } from '@gmny/database';

export class NotificationDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiProperty() read!: boolean;
  @ApiProperty() createdAt!: Date;

  static from(n: Notification): NotificationDto {
    return { id: n.id, title: n.title, body: n.body, read: n.read, createdAt: n.createdAt };
  }
}
