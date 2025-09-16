import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { DatabaseService } from '../../common/database/database.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  constructor(
    private authService: AuthService,
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      const user = await this.verifyToken(token);
      // Only attach safe user info
      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isApproved: user.isApproved,
        name: user.name,
        planId: user.planId,
      };

      // Approval check (skip for SUPERADMIN)
      if (user.role !== 'SUPERADMIN' && !user.isApproved) {
        throw new UnauthorizedException(
          'Your account is deactivated kindly contact admin.',
        );
      }

      return true;
    } catch (error) {
      this.logger.error('AuthGuard error:', error.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET_KEY,
      });

      const user = await this.databaseService.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.sessionToken || user.sessionToken !== token) {
        throw new UnauthorizedException('Session expired. Please login again.');
      }

      if (!decoded.purpose) {
        if (!user.isVerified || !user.isApproved) {
          throw new UnauthorizedException('User access denied');
        }
      }

      if (decoded.purpose === 'password-reset') {
        if (!user.isVerified) {
          throw new UnauthorizedException(
            'Please verify your email address first',
          );
        }
      }

      return user;
    } catch (error) {
      this.logger.error('Invalid token:', error.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}