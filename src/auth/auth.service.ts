import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import { ResponseService } from 'src/common/services/response.service';
import { MailService } from 'src/common/mail/mail.service';
import { LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly responseService: ResponseService,
  ) {}

  async login(res: Response, loginDto: LoginDto) {
    try {
      const user = await this.databaseService.user.findUnique({
        where: { email: loginDto.email },
        include: {
          plan: true,
          projects: true,
          notifications: true,
        },
      });

      if (!user) {
        return this.responseService.sendError(
          res,
          HttpStatus.UNAUTHORIZED,
          'Invalid email or password',
        );
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        return this.responseService.sendError(
          res,
          HttpStatus.UNAUTHORIZED,
          'Invalid email or password',
        );
      }

      if (!user.isVerified) {
        return this.responseService.sendError(
          res,
          HttpStatus.FORBIDDEN,
          'Please verify your email address first.',
        );
      }

      if (user.role !== 'ADMIN' && !user.isApproved) {
        return this.responseService.sendError(
          res,
          HttpStatus.FORBIDDEN,
          'Your account is pending approval. Please contact support.',
        );
      }

      if (user.deletedAt) {
        return this.responseService.sendError(
          res,
          HttpStatus.FORBIDDEN,
          'Your account has been deactivated. Please contact support.',
        );
      }

      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isApproved: user.isApproved,
        planId: user.planId,
      };
      const token = this.jwtService.sign(payload, { expiresIn: '24h' });

      await this.databaseService.user.update({
        where: { id: user.id },
        data: {
          sessionToken: token,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Login successful',
        {
          token,
          //   user: {
          //     id: user.id,
          //     email: user.email,
          //     name: user.name,
          //     role: user.role,
          //     plan: user.plan,
          //     planId: user.planId,
          //     isVerified: user.isVerified,
          //     isApproved: user.isApproved,
          //     projects: user.projects,
          //     notifications: user.notifications,
          //   },
        },
      );
    } catch (error) {
      this.logger.error('Login error:', error);
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Login failed',
      );
    }
  }

  async logout(res: Response, userId: string) {
    try {
      await this.databaseService.user.update({
        where: { id: userId },
        data: {
          sessionToken: null,
          updatedAt: new Date(),
        },
      });

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Logout successful',
      );
    } catch (error) {
      this.logger.error('Logout error:', error);
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Logout failed',
      );
    }
  }
}
