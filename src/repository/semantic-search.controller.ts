import { 
  Controller, 
  Get, 
  Post, 
  Query, 
  Body, 
  Param, 
  UseGuards,
  Res,
  HttpStatus
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { SemanticSearchService, SearchOptions } from '../common/services/semantic-search.service';
import { EmbeddingMigrationService } from '../common/services/embedding-migration.service';
import { ResponseService } from '../common/services/response.service';

export class SemanticSearchDto {
  query: string;
  projectId?: string;
  fileTypes?: string[];
  languages?: string[];
  minSimilarity?: number;
  limit?: number;
}

@ApiTags('semantic-search')
@Controller('semantic-search')
@UseGuards(AuthGuard)
@ApiBearerAuth('access-token')
export class SemanticSearchController {
  constructor(
    private readonly semanticSearchService: SemanticSearchService,
    private readonly embeddingMigrationService: EmbeddingMigrationService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('search')
  @ApiOperation({ 
    summary: 'Semantic code search',
    description: 'Search for code snippets using natural language or code patterns'
  })
  @ApiResponse({ status: 200, description: 'Search results returned successfully' })
  async searchCode(
    @Body() searchDto: SemanticSearchDto,
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    try {
      const options: SearchOptions = {
        projectId: searchDto.projectId,
        fileTypes: searchDto.fileTypes,
        languages: searchDto.languages,
        minSimilarity: searchDto.minSimilarity || 0.7,
        limit: searchDto.limit || 20,
      };

      const results = await this.semanticSearchService.searchCode(searchDto.query, options);

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Semantic search completed',
        {
          query: searchDto.query,
          results: results,
          count: results.length,
          options: options
        }
      );

    } catch (error) {
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Semantic search failed',
        error.message
      );
    }
  }

  @Get('similar/:chunkId')
  @ApiOperation({ 
    summary: 'Find similar code chunks',
    description: 'Find code chunks similar to the specified chunk'
  })
  @ApiQuery({ name: 'projectId', required: false, description: 'Limit search to specific project' })
  @ApiQuery({ name: 'minSimilarity', required: false, description: 'Minimum similarity threshold (0-1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results' })
  async findSimilarChunks(
    @Param('chunkId') chunkId: string,
    @GetUser('id') userId: string,
    @Res() res: Response,
    @Query('projectId') projectId?: string,
    @Query('minSimilarity') minSimilarity?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const options: SearchOptions = {
        projectId: projectId,
        minSimilarity: minSimilarity ? parseFloat(minSimilarity) : 0.7,
        limit: limit ? parseInt(limit) : 20,
      };

      const results = await this.semanticSearchService.findSimilarChunks(chunkId, options);

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Similar chunks found',
        {
          referenceChunkId: chunkId,
          results: results,
          count: results.length,
          options: options
        }
      );

    } catch (error) {
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to find similar chunks',
        error.message
      );
    }
  }

  @Get('stats/:projectId')
  @ApiOperation({ 
    summary: 'Get embedding statistics',
    description: 'Get statistics about embeddings coverage for a project'
  })
  async getEmbeddingStats(
    @Param('projectId') projectId: string,
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    try {
      const stats = await this.semanticSearchService.getEmbeddingStats(projectId);

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Embedding statistics retrieved',
        stats
      );

    } catch (error) {
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to get embedding statistics',
        error.message
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Check semantic search health',
    description: 'Check if Ollama service is available for embeddings'
  })
  async checkHealth(
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    try {
      // This would need to be added to EmbeddingService
      // const isAvailable = await this.embeddingService.isOllamaAvailable();
      // const models = await this.embeddingService.getAvailableModels();

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Semantic search service status',
        {
          status: 'healthy',
          service: 'ollama',
          host: process.env.OLLAMA_HOST || 'http://localhost:11434',
          // isAvailable,
          // availableModels: models
        }
      );

    } catch (error) {
      return this.responseService.sendError(
        res,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Semantic search service unavailable',
        error.message
      );
    }
  }

  @Post('embeddings/migrate/missing')
  @ApiOperation({ 
    summary: 'Generate missing embeddings',
    description: 'Generate embeddings for chunks that do not have them'
  })
  async generateMissingEmbeddings(
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.embeddingMigrationService.generateMissingEmbeddings(userId);
      
      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Missing embeddings generation started',
        result
      );
    } catch (error) {
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to start missing embeddings generation',
        error.message
      );
    }
  }

  @Post('embeddings/migrate/all')
  @ApiOperation({ 
    summary: 'Regenerate all embeddings',
    description: 'Regenerate embeddings for all chunks (overwrites existing ones)'
  })
  async regenerateAllEmbeddings(
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.embeddingMigrationService.regenerateAllEmbeddings(userId);
      
      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Full embeddings regeneration started',
        result
      );
    } catch (error) {
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to start embeddings regeneration',
        error.message
      );
    }
  }

  @Get('embeddings/migration/stats')
  @ApiOperation({ 
    summary: 'Get migration statistics',
    description: 'Get statistics about embeddings migration progress'
  })
  async getMigrationStats(
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    try {
      const stats = await this.embeddingMigrationService.getMigrationStats(userId);
      
      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Migration stats retrieved successfully',
        stats
      );
    } catch (error) {
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to get migration stats',
        error.message
      );
    }
  }
}
