import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        description: 'User email address (must be registered and verified)',
        example: 'john.doe@example.com',
        format: 'email',
        maxLength: 255,
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    @MaxLength(255, { message: 'Email must not exceed 255 characters' })
    email: string;

    @ApiProperty({
        description: 'User password',
        example: 'SecureP@ssw0rd123',
        minLength: 8,
        maxLength: 128,
    })
    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(128, { message: 'Password must not exceed 128 characters' })
    password: string;
}

export class forgotPasswordDto {
    @ApiProperty({
        description: 'User email address (must be registered and verified)',
        example: 'john.doe@example.com',
        format: 'email',
        maxLength: 255,
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    @MaxLength(255, { message: 'Email must not exceed 255 characters' })
    email: string;
}

export class resetPasswordDto {
    @ApiProperty({
        description: 'New password for the user',
        example: 'NewSecureP@ssw0rd123',
        minLength: 8,
        maxLength: 128,
    })
    @IsString()
    @IsNotEmpty({ message: 'New password is required' })
    @MinLength(8, { message: 'New password must be at least 8 characters long' })
    @MaxLength(128, { message: 'New password must not exceed 128 characters' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        { message: 'Password must contain uppercase, lowercase, number, and special character' }
    )
    newPassword: string;
}