import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RepositoryService } from './repository.service';
import { RepositoryController } from './repository.controller';
import { RepositoryProcessor } from './repository.processor';
import { DatabaseService } from '../database/database.service';
import { ResponseService } from '../common/services/response.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'repository-processing',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    AuthModule, // Import AuthModule to access AuthGuard and AuthService
  ],
  controllers: [RepositoryController],
  providers: [
    RepositoryService,
    RepositoryProcessor,
    DatabaseService,
    ResponseService,
  ],
  exports: [RepositoryService],
})
export class RepositoryModule {}
