import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../common/mail/mail.service';
import { ResponseService } from 'src/common/services/response.service';
import { DatabaseService } from 'src/common/database/database.service';
import { UserDto } from './dto/user.dto';
import * as jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'jaihindjaibharat';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly responseService: ResponseService,
    private readonly databaseService: DatabaseService,
    private readonly mailService: MailService,
  ) {}

  async registerUser(res: Response, data: UserDto) {
    try {
      const { email, password, name, role } = data;

      if (!password || typeof password !== 'string') {
        return this.responseService.sendError(
          res,
          HttpStatus.BAD_REQUEST,
          'Password is required and must be a string',
        );
      }

      const existingUser = await this.databaseService.user.findFirst({
        where: { email },
      });

      // Create JWT token for email verification
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/user/verify-email?token=${token}`;

      if (existingUser) {
        if (existingUser.isVerified) {
          return this.responseService.sendError(
            res,
            HttpStatus.BAD_REQUEST,
            'User with this email already exists and is verified',
          );
        } else {
          const saltRounds = 10;
          const hashPassword: string = await bcrypt.hash(password, saltRounds);

          await this.databaseService.user.update({
            where: { id: existingUser.id },
            data: {
              name,
              password: hashPassword,
              role: role || 'DEVELOPER',
              isVerified: false,
              isApproved: true,
              updatedAt: new Date(),
            },
          });

          await this.mailService.sendVerificationEmail(
            email,
            verificationUrl,
            name,
          );

          return this.responseService.sendSuccess(
            res,
            HttpStatus.CREATED,
            'Verification link resent to email successfully, please verify your email',
          );
        }
      }

      const saltRounds = 10;
      const hashPassword: string = await bcrypt.hash(password, saltRounds);
      const user = await this.databaseService.user.create({
        data: {
          name,
          email,
          password: hashPassword,
          role: role || 'DEVELOPER',
          isVerified: false,
          isApproved: true,
        },
      });

      await this.mailService.sendVerificationEmail(
        email,
        verificationUrl,
        name,
      );

      return this.responseService.sendSuccess(
        res,
        HttpStatus.CREATED,
        'Verification link sent to email successfully, please verify your email',
        // { user },
      );
    } catch (error) {
      this.logger.error('Error while registering user:', error.message);
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Internal Server Error',
      );
    }
  }

  async verifyEmail(token: string, res: Response) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET_KEY || 'jaihindjaibharat';
      const payload = jwt.verify(token, JWT_SECRET) as { email: string };

      const user = await this.databaseService.user.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        return res.status(400).send('<h2>Invalid verification link</h2>');
      }

      if (user.isVerified) {
        return res.status(200).send('<h2>Email already verified</h2>');
      }

      await this.databaseService.user.update({
        where: { email: payload.email },
        data: { isVerified: true },
      });

      return res.status(200).send('<h2>Email verified successfully!</h2>');
    } catch (error) {
      return res
        .status(400)
        .send('<h2>Invalid or expired verification link</h2>');
    }
  }
}