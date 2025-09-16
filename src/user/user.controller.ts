import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Logger,
  Query,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { UserService } from './user.service';
import { UserDto, UserRole } from './dto/user.dto';

@ApiTags('user')
@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account and sends a verification email',
  })
  @ApiBody({
    type: UserDto,
    description: 'User registration data',
    examples: {
      developer: {
        summary: 'Developer registration example',
        value: {
          email: 'john.doe@example.com',
          password: 'SecureP@ssw0rd123',
          name: 'John Doe',
          role: UserRole.DEVELOPER,
        },
      },
      admin: {
        summary: 'Admin registration example',
        value: {
          email: 'admin@example.com',
          password: 'SecureP@ssw0rd123',
          name: 'Admin User',
          role: UserRole.ADMIN,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered and verification email sent',
    schema: {
      example: {
        status: 'success',
        message:
          'Verification link sent to email successfully, please verify your email',
        data: {
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'john.doe@example.com',
            name: 'John Doe',
            role: UserRole.DEVELOPER,
            isVerified: false,
            isApproved: true,
            createdAt: '2025-08-25T12:00:00.000Z',
            updatedAt: '2025-08-25T12:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or user already exists',
    schema: {
      example: {
        status: 'error',
        message: 'User with this email already exists and is verified',
        error: 'Bad Request',
        statusCode: HttpStatus.BAD_REQUEST,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: {
        status: 'error',
        message: 'Internal Server Error',
        error: 'Internal Server Error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    },
  })
  async register(@Body() userDto: UserDto, @Res() res: Response) {
     await this.userService.registerUser(res, userDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    return this.userService.verifyEmail(token, res);
  }
}