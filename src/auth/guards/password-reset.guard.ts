import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class PasswordResetGuard implements CanActivate {
  private readonly logger = new Logger(PasswordResetGuard.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Password reset token is required');
    }

    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET_KEY,
      });

      if (decoded.purpose !== 'password-reset') {
        throw new UnauthorizedException('Invalid password reset token');
      }

      const user = await this.databaseService.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isVerified) {
        throw new UnauthorizedException('Please verify your email address first');
      }

      // Attach user info to request for downstream use
      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
      };

      return true;
    } catch (error) {
      this.logger.error('PasswordResetGuard error:', error.message);
      throw new UnauthorizedException('Invalid or expired password reset token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}