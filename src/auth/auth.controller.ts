import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { AuthGuard } from './guards/auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user and return JWT token',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      developer: {
        summary: 'Developer login example',
        value: {
          email: 'john.doe@example.com',
          password: 'SecureP@ssw0rd123',
        },
      },
      admin: {
        summary: 'Admin login example',
        value: {
          email: 'admin@example.com',
          password: 'SecureP@ssw0rd123',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    schema: {
      example: {
        status: 'success',
        message: 'Login successful',
        data: {
          token: 'jwt_token_here',
          // user: {
          //   id: '123e4567-e89b-12d3-a456-426614174000',
          //   email: 'john.doe@example.com',
          //   name: 'John Doe',
          //   role: 'DEVELOPER',
          //   planId: 'plan_id',
          //   isVerified: true,
          //   isApproved: true,
          //   projects: [],
          //   notifications: [],
          // },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid email or password',
    schema: {
      example: {
        status: 'error',
        message: 'Invalid email or password',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Account not verified or not approved',
    schema: {
      example: {
        status: 'error',
        message: 'Please verify your email address first.',
        error: 'Forbidden',
        statusCode: HttpStatus.FORBIDDEN,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
    schema: {
      example: {
        status: 'error',
        message: 'Login failed',
        error: 'Internal Server Error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    },
  })
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    await this.authService.login(res, loginDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Logout user',
    description: 'Logs out the authenticated user and clears session token',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        status: 'success',
        message: 'Logout successful',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Logout failed',
    schema: {
      example: {
        status: 'error',
        message: 'Logout failed',
        error: 'Internal Server Error',
        statusCode: 500,
      },
    },
  })
  @ApiBearerAuth('access-token')
  async logout(@GetUser('id') userId: string, @Res() res: Response) {
    await this.authService.logout(res, userId);
  }

  @Post('verify-token')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Verify JWT token',
    description:
      'Checks if the provided JWT token is valid and returns user info.',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token is valid',
    schema: {
      example: {
        status: 'success',
        message: 'Token is valid',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'john.doe@example.com',
          role: 'DEVELOPER',
          isVerified: true,
          isApproved: true,
          name: 'John Doe',
          planId: null,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
    schema: {
      example: {
        status: 'error',
        message: 'Invalid or expired token',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
      },
    },
  })
  async verifyToken(@GetUser() user: any, @Res() res: Response) {
    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        status: 'error',
        message: 'Invalid or expired token',
        error: 'Unauthorized',
        statusCode: HttpStatus.UNAUTHORIZED,
      });
    }
    return res.status(HttpStatus.OK).json({
      status: 'success',
      message: 'Token is valid',
      data: user,
    });
  }
}
