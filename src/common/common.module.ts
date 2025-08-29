import { Module, Global } from '@nestjs/common';
import { ResponseService } from './services/response.service';
import { EmbeddingService } from './services/embedding.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { EmbeddingMigrationService } from './services/embedding-migration.service';

@Global()
@Module({
  providers: [ResponseService, EmbeddingService, SemanticSearchService, EmbeddingMigrationService],
  exports: [ResponseService, EmbeddingService, SemanticSearchService, EmbeddingMigrationService],
})
export class CommonModule {} 
