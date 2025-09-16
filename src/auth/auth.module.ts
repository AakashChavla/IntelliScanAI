import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/auth.guards';
import { ResponseService } from 'src/common/services/response.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, ResponseService],
  exports: [AuthService, JwtModule, AuthGuard],
})
export class AuthModule {}