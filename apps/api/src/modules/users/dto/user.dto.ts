import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UserRole, UserStatus, KycStatus } from '@gmny/shared';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2) country?: string;
  @ApiPropertyOptional({ example: '1994-05-01' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) occupation?: string;
}

export class UpdateMeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(80) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(80) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) phone?: string;

  @ApiPropertyOptional({ type: UpdateProfileDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileDto)
  profile?: UpdateProfileDto;
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class UserProfileDto {
  @ApiPropertyOptional() address!: string | null;
  @ApiPropertyOptional() city!: string | null;
  @ApiPropertyOptional() state!: string | null;
  @ApiPropertyOptional() country!: string | null;
  @ApiPropertyOptional() dateOfBirth!: string | null;
  @ApiPropertyOptional() occupation!: string | null;
}

export class UserDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional() phone!: string | null;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty({ enum: KycStatus }) kycStatus!: KycStatus;
  @ApiProperty() emailVerified!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ type: UserProfileDto, nullable: true })
  profile!: UserProfileDto | null;
}
