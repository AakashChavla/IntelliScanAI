import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class EmbeddingMigrationService {
  private readonly logger = new Logger(EmbeddingMigrationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Generate embeddings for chunks that don't have them
   */
  async generateMissingEmbeddings(projectId?: string): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    const result = { processed: 0, updated: 0, errors: 0 };

    try {
      // Check if Ollama is available
      const isOllamaAvailable = await this.embeddingService.isOllamaAvailable();
      
      if (!isOllamaAvailable) {
        throw new Error('Ollama service is not available');
      }

      // Find chunks without embeddings
      const whereClause: any = {
        embedding: []
      };

      if (projectId) {
        whereClause.file = {
          projectId: projectId
        };
      }

      const chunksWithoutEmbeddings = await this.databaseService.chunk.findMany({
        where: whereClause,
        select: {
          id: true,
          content: true,
          fileId: true,
        },
        take: 1000, // Process in batches
      });

      this.logger.log(`Found ${chunksWithoutEmbeddings.length} chunks without embeddings`);

      if (chunksWithoutEmbeddings.length === 0) {
        return result;
      }

      // Process chunks in smaller batches
      const batchSize = 10;
      
      for (let i = 0; i < chunksWithoutEmbeddings.length; i += batchSize) {
        const batch = chunksWithoutEmbeddings.slice(i, i + batchSize);
        
        this.logger.debug(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunksWithoutEmbeddings.length/batchSize)}`);

        // Generate embeddings for the batch
        const contents = batch.map(chunk => chunk.content);
        const embeddingResponses = await this.embeddingService.generateBatchEmbeddings(contents);

        // Update each chunk with its embedding
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embeddingResponse = embeddingResponses[j];
          
          result.processed++;

          try {
            if (embeddingResponse.embedding.length > 0) {
              await this.databaseService.chunk.update({
                where: { id: chunk.id },
                data: { embedding: embeddingResponse.embedding }
              });
              
              result.updated++;
              
              if (result.updated % 50 === 0) {
                this.logger.log(`Updated ${result.updated} chunks with embeddings...`);
              }
            } else {
              this.logger.warn(`No embedding generated for chunk ${chunk.id}`);
            }
          } catch (error) {
            this.logger.error(`Failed to update chunk ${chunk.id}: ${error.message}`);
            result.errors++;
          }
        }

        // Add delay between batches to avoid overwhelming the API
        if (i + batchSize < chunksWithoutEmbeddings.length) {
          await this.delay(500);
        }
      }

      this.logger.log(`Embedding migration completed: ${result.updated} chunks updated, ${result.errors} errors`);
      return result;

    } catch (error) {
      this.logger.error(`Embedding migration failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats(projectId?: string): Promise<{
    totalChunks: number;
    chunksWithEmbeddings: number;
    chunksWithoutEmbeddings: number;
    migrationProgress: number;
  }> {
    try {
      const whereClause: any = {};
      
      if (projectId) {
        whereClause.file = {
          projectId: projectId
        };
      }

      const totalChunks = await this.databaseService.chunk.count({
        where: whereClause
      });

      const chunksWithEmbeddings = await this.databaseService.chunk.count({
        where: {
          ...whereClause,
          embedding: {
            not: []
          }
        }
      });

      const chunksWithoutEmbeddings = totalChunks - chunksWithEmbeddings;
      const migrationProgress = totalChunks > 0 ? (chunksWithEmbeddings / totalChunks) * 100 : 0;

      return {
        totalChunks,
        chunksWithEmbeddings,
        chunksWithoutEmbeddings,
        migrationProgress: Math.round(migrationProgress * 100) / 100
      };

    } catch (error) {
      this.logger.error(`Failed to get migration stats: ${error.message}`);
      return {
        totalChunks: 0,
        chunksWithEmbeddings: 0,
        chunksWithoutEmbeddings: 0,
        migrationProgress: 0
      };
    }
  }

  /**
   * Regenerate embeddings for all chunks (useful if switching models)
   */
  async regenerateAllEmbeddings(projectId?: string): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    const result = { processed: 0, updated: 0, errors: 0 };

    try {
      const isOllamaAvailable = await this.embeddingService.isOllamaAvailable();
      
      if (!isOllamaAvailable) {
        throw new Error('Ollama service is not available');
      }

      const whereClause: any = {};
      
      if (projectId) {
        whereClause.file = {
          projectId: projectId
        };
      }

      const allChunks = await this.databaseService.chunk.findMany({
        where: whereClause,
        select: {
          id: true,
          content: true,
          fileId: true,
        },
        take: 1000, // Process in batches
      });

      this.logger.log(`Regenerating embeddings for ${allChunks.length} chunks`);

      if (allChunks.length === 0) {
        return result;
      }

      // Process in batches
      const batchSize = 10;
      
      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        
        const contents = batch.map(chunk => chunk.content);
        const embeddingResponses = await this.embeddingService.generateBatchEmbeddings(contents);

        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embeddingResponse = embeddingResponses[j];
          
          result.processed++;

          try {
            await this.databaseService.chunk.update({
              where: { id: chunk.id },
              data: { embedding: embeddingResponse.embedding }
            });
            
            result.updated++;
          } catch (error) {
            this.logger.error(`Failed to update chunk ${chunk.id}: ${error.message}`);
            result.errors++;
          }
        }

        if (i + batchSize < allChunks.length) {
          await this.delay(500);
        }
      }

      return result;

    } catch (error) {
      this.logger.error(`Embedding regeneration failed: ${error.message}`);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
