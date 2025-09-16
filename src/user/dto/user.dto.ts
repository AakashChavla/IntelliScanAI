import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsBoolean, IsEnum, IsUUID, IsDate, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  SECURITY_ANALYST = 'SECURITY_ANALYST',
  DEVELOPER = 'DEVELOPER'
}

export class UserDto {
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'john.doe@example.com',
    format: 'email',
    maxLength: 255
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiPropertyOptional({
    description: 'User password (hashed in database)',
    example: 'SecureP@ssw0rd123',
    minLength: 8,
    maxLength: 128,
    writeOnly: true
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  })
  password?: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether the user has verified their email address',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'isVerified must be a boolean value' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the user account has been approved by an administrator',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'isApproved must be a boolean value' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  isApproved?: boolean;

  @ApiPropertyOptional({
    description: 'User role determining access permissions',
    example: UserRole.DEVELOPER,
    enum: UserRole,
    enumName: 'UserRole',
    default: UserRole.DEVELOPER
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be one of: SUPERADMIN, ADMIN, SECURITY_ANALYST, DEVELOPER' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'ID of the subscription plan associated with the user',
    example: '456e7890-e89b-12d3-a456-426614174001',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID('4', { message: 'Plan ID must be a valid UUID v4' })
  planId?: string;

  @ApiPropertyOptional({
    description: 'Date and time when the user\'s current plan started',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  planStartedAt?: Date;

  @ApiPropertyOptional({
    description: 'Date and time when the user\'s current plan expires',
    example: '2024-12-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  planExpireAt?: Date;

  @ApiPropertyOptional({
    description: 'Date and time when the user account was created',
    example: '2024-01-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
    readOnly: true
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Date and time when the user account was last updated',
    example: '2024-08-25T12:00:00.000Z',
    type: 'string',
    format: 'date-time',
    readOnly: true
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedAt?: Date;

  @ApiPropertyOptional({
    description: 'Date and time when the user account was soft deleted (null if not deleted)',
    example: null,
    type: 'string',
    format: 'date-time',
    nullable: true,
    readOnly: true
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  deletedAt?: Date;
}